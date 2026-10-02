/**
 * Agent tools for long-horizon task status.
 *
 * Registers plain tool definition objects on the harness `tools` service —
 * no import from `@deepseek-ai/dsh-tools`.
 *
 * Pin note (dsh ≥ 0.1.7): output/parameter JSON Schema must NOT put
 * `required: true` on scalar property nodes — use object-level
 * `required: ['field', …]` arrays (defineTool used to rewrite this).
 */
import type { Context } from '@deepseek-ai/cordis'
import {
  CorruptVaultError,
  DisabledError,
  NotInitializedError,
  TaskStatusService,
  ValidationError,
} from './service.ts'

type ExecLike = {
  agent?: {
    session?: {
      id?: string
      header?: { cwd?: string; id?: string }
    }
  }
}

type ToolArgs = Record<string, any>

type ToolsFace = {
  register: (def: Record<string, unknown>) => () => void
}

function resolveCwd(args: { cwd?: string }, exec: ExecLike): string {
  const fromArg = args.cwd?.trim()
  if (fromArg) return fromArg
  const fromAgent = exec.agent?.session?.header?.cwd?.trim()
  if (fromAgent) return fromAgent
  throw new Error('cwd required (pass cwd or run from an agent session with a workspace cwd)')
}

function writerFrom(exec: ExecLike): { sessionId?: string } {
  const id = exec.agent?.session?.id ?? exec.agent?.session?.header?.id
  return typeof id === 'string' && id.trim() ? { sessionId: id.trim() } : {}
}

function toolError(err: unknown): never {
  if (
    err instanceof ValidationError
    || err instanceof DisabledError
    || err instanceof NotInitializedError
    || err instanceof CorruptVaultError
  ) {
    throw err
  }
  throw err instanceof Error ? err : new Error(String(err))
}

const recordSchema = {
  type: 'object' as const,
  additionalProperties: true,
  properties: {
    taskId: { type: 'string' as const },
    title: { type: 'string' as const },
    cwd: { type: 'string' as const },
    updatedAt: { type: 'integer' as const },
    phase: { type: 'string' as const },
    enabled: { type: 'boolean' as const },
    next: { type: 'array' as const, items: { type: 'string' as const } },
    done: { type: 'array' as const },
    inFlight: {},
    blocked: {},
    verifyHint: { type: 'string' as const },
    keyPaths: { type: 'array' as const, items: { type: 'string' as const } },
    notes: { type: 'string' as const },
    lastSessionId: { type: 'string' as const },
    gitBranch: { type: 'string' as const },
    _warn: { type: 'string' as const },
  },
}

function renderJson(_args: unknown, value: unknown) {
  return [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }]
}

export function registerTools(ctx: Context, service: TaskStatusService): () => void {
  const tools = (ctx as unknown as { tools: ToolsFace }).tools
  const disposers: Array<() => void> = []

  disposers.push(tools.register({
    name: 'status_ping',
    description: 'Health probe for dsh-local-long-horizon host module.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['ok', 'package', 'at'],
        properties: {
          ok: { type: 'boolean' },
          package: { type: 'string' },
          at: { type: 'integer' },
        },
      },
      render: (_a: unknown, v: unknown) => [{ type: 'text', text: JSON.stringify(v) }],
    },
    async execute() {
      return { ok: true as const, package: 'dsh-local-long-horizon' as const, at: Date.now() }
    },
  }))

  disposers.push(tools.register({
    name: 'status_init',
    description: 'Create or refresh the long-horizon vault for a project cwd. Enables Long horizon ON.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cwd: { type: 'string', description: 'Absolute project cwd (defaults to session cwd).' },
        title: { type: 'string', description: 'Short task title.' },
        verifyHint: { type: 'string', description: 'How to verify done items.' },
        phase: { type: 'string', description: 'Short phase label.' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.init({
          cwd: resolveCwd(args, exec),
          title: args.title,
          verifyHint: args.verifyHint,
          phase: args.phase,
        }, writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_get',
    description: 'Return the full structured long-horizon status for the current (or named) cwd.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cwd: { type: 'string', description: 'Absolute project cwd (defaults to session cwd).' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.get(resolveCwd(args, exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_set_next',
    description: 'Replace the Next list (hard cap 3 items). Refused when Long horizon is OFF.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['next'],
      properties: {
        cwd: { type: 'string' },
        next: {
          type: 'array',
          description: '0–3 next work items.',
          items: { type: 'string' },
        },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.setNext(resolveCwd(args, exec), args.next ?? [], writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_set_inflight',
    description:
      'Set the single in-flight work slice. ALWAYS pass summary (non-empty string). '
      + 'To clear, use status_clear_inflight instead. Never call with empty args. '
      + 'Do not write STATUS.md or .dsh temps by hand.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['summary'],
      properties: {
        cwd: { type: 'string' },
        summary: {
          type: 'string',
          minLength: 1,
          description: 'Non-empty in-flight work summary.',
        },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        const summary = typeof args.summary === 'string' ? args.summary.trim() : ''
        if (!summary) {
          throw new ValidationError(
            'status_set_inflight requires a non-empty summary; use status_clear_inflight to clear',
          )
        }
        return await service.setInflight(
          resolveCwd(args, exec),
          summary,
          writerFrom(exec),
        )
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_clear_inflight',
    description: 'Clear the in-flight slice. No arguments required besides optional cwd.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cwd: { type: 'string' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.setInflight(
          resolveCwd(args, exec),
          null,
          writerFrom(exec),
        )
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_set_phase',
    description: 'Set the short phase label.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['phase'],
      properties: {
        cwd: { type: 'string' },
        phase: { type: 'string' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.setPhase(resolveCwd(args, exec), args.phase, writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_mark_done',
    description: 'Append a done item. Prefer including verify evidence (warn-only if missing in v0).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['summary'],
      properties: {
        cwd: { type: 'string' },
        summary: {
          type: 'string',
          minLength: 1,
          description: 'Non-empty done summary.',
        },
        verify: { type: 'string', description: 'How this was verified.' },
        rotateNext: { type: 'boolean', description: 'If true and next[0] matches summary, drop it.' },
      },
    },
    output: {
      schema: recordSchema,
      render: (_a: unknown, v: { _warn?: string }) => {
        const text = v._warn
          ? `WARN: ${v._warn}\n${JSON.stringify(v, null, 2)}`
          : JSON.stringify(v, null, 2)
        return [{ type: 'text', text }]
      },
    },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        const { record, warn } = await service.markDone(
          resolveCwd(args, exec),
          args.summary,
          args.verify,
          Boolean(args.rotateNext),
          writerFrom(exec),
        )
        // Fresh plain object — never mutate the vault record with `_warn`.
        const out = JSON.parse(JSON.stringify(record)) as Record<string, unknown>
        if (warn) out._warn = warn
        return out
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_block',
    description: 'Mark the task blocked with a reason.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['reason'],
      properties: {
        cwd: { type: 'string' },
        reason: {
          type: 'string',
          minLength: 1,
          description: 'Non-empty blocked reason.',
        },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.block(resolveCwd(args, exec), args.reason, writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_unblock',
    description: 'Clear the blocked state.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cwd: { type: 'string' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.unblock(resolveCwd(args, exec), writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  disposers.push(tools.register({
    name: 'status_set_enabled',
    description: 'Turn Long horizon ON or OFF for this project (OFF refuses mutations and freezes inject).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['enabled'],
      properties: {
        cwd: { type: 'string' },
        enabled: { type: 'boolean' },
      },
    },
    output: { schema: recordSchema, render: renderJson },
    async execute(args: ToolArgs, exec: ExecLike) {
      try {
        return await service.setEnabled(resolveCwd(args, exec), Boolean(args.enabled), writerFrom(exec))
      } catch (err) {
        toolError(err)
      }
    },
  }))

  return () => {
    for (const d of disposers.reverse()) d()
  }
}
