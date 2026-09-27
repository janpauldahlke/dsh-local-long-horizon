/**
 * Agent tools for long-horizon task status.
 * cwd: prefer arg; else exec.agent.session.header.cwd.
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  CorruptVaultError,
  DisabledError,
  NotInitializedError,
  TaskStatusService,
  ValidationError,
} from './service.ts'

type ExecLike = {
  agent?: { session?: { header?: { cwd?: string } } }
}

function resolveCwd(args: { cwd?: string }, exec: ExecLike): string {
  const fromArg = args.cwd?.trim()
  if (fromArg) return fromArg
  const fromAgent = exec.agent?.session?.header?.cwd?.trim()
  if (fromAgent) return fromAgent
  throw new Error('cwd required (pass cwd or run from an agent session with a workspace cwd)')
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
  },
}

export function registerTools(ctx: Context, service: TaskStatusService): () => void {
  const disposers: Array<() => void> = []

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_ping',
    description: 'Health probe for dsh-local-long-horizon host module.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ok: { type: 'boolean', required: true },
          package: { type: 'string', required: true },
          at: { type: 'integer', required: true },
        },
      },
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v) }],
    },
    async execute() {
      return { ok: true as const, package: 'dsh-local-long-horizon' as const, at: Date.now() }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_init',
    description: 'Create or refresh the long-horizon vault for a project cwd. Enables Long horizon ON.',
    parameters: {
      cwd: { type: 'string', description: 'Absolute project cwd (defaults to session cwd).' },
      title: { type: 'string', description: 'Short task title.' },
      verifyHint: { type: 'string', description: 'How to verify done items.' },
      phase: { type: 'string', description: 'Short phase label.' },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        const cwd = resolveCwd(args, exec)
        return await service.init({
          cwd,
          title: args.title,
          verifyHint: args.verifyHint,
          phase: args.phase,
        })
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_get',
    description: 'Return the full structured long-horizon status for the current (or named) cwd.',
    parameters: {
      cwd: { type: 'string', description: 'Absolute project cwd (defaults to session cwd).' },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.get(resolveCwd(args, exec))
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_set_next',
    description: 'Replace the Next list (hard cap 3 items). Refused when Long horizon is OFF.',
    parameters: {
      cwd: { type: 'string' },
      next: {
        type: 'array',
        required: true,
        description: '0–3 next work items.',
        items: { type: 'string' },
      },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.setNext(resolveCwd(args, exec), args.next ?? [])
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_set_inflight',
    description: 'Set or clear the single in-flight slice. Pass empty summary to clear.',
    parameters: {
      cwd: { type: 'string' },
      summary: { type: 'string', description: 'In-flight summary, or empty to clear.' },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        const summary = args.summary?.trim() ? args.summary : null
        return await service.setInflight(resolveCwd(args, exec), summary)
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_set_phase',
    description: 'Set the short phase label.',
    parameters: {
      cwd: { type: 'string' },
      phase: { type: 'string', required: true },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.setPhase(resolveCwd(args, exec), args.phase)
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_mark_done',
    description: 'Append a done item. Prefer including verify evidence (warn-only if missing in v0).',
    parameters: {
      cwd: { type: 'string' },
      summary: { type: 'string', required: true },
      verify: { type: 'string', description: 'How this was verified.' },
      rotateNext: { type: 'boolean', description: 'If true and next[0] matches summary, drop it.' },
    },
    output: {
      // Return the record itself (lossless JSON). Warn is render-only.
      schema: recordSchema,
      render: (_a, v) => {
        const warn = (v as { _warn?: string })._warn
        const text = warn
          ? `WARN: ${warn}\n${JSON.stringify(v, null, 2)}`
          : JSON.stringify(v, null, 2)
        return [{ type: 'text', text }]
      },
    },
    async execute(args, exec) {
      try {
        const { record, warn } = await service.markDone(
          resolveCwd(args, exec),
          args.summary,
          args.verify,
          Boolean(args.rotateNext),
        )
        if (warn) (record as { _warn?: string })._warn = warn
        return record
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_block',
    description: 'Mark the task blocked with a reason.',
    parameters: {
      cwd: { type: 'string' },
      reason: { type: 'string', required: true },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.block(resolveCwd(args, exec), args.reason)
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_unblock',
    description: 'Clear the blocked state.',
    parameters: {
      cwd: { type: 'string' },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.unblock(resolveCwd(args, exec))
      } catch (err) {
        toolError(err)
      }
    },
  })))

  disposers.push(ctx.tools.register(defineTool({
    name: 'status_set_enabled',
    description: 'Turn Long horizon ON or OFF for this project (OFF refuses mutations and freezes inject).',
    parameters: {
      cwd: { type: 'string' },
      enabled: { type: 'boolean', required: true },
    },
    output: {
      schema: recordSchema,
      render: (_a, v) => [{ type: 'text', text: JSON.stringify(v, null, 2) }],
    },
    async execute(args, exec) {
      try {
        return await service.setEnabled(resolveCwd(args, exec), Boolean(args.enabled))
      } catch (err) {
        toolError(err)
      }
    },
  })))

  return () => {
    for (const d of disposers.reverse()) d()
  }
}
