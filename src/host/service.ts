import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { DoneItem, LongHorizonSnapshot, SyncHints, TaskStatus } from '../shared/types.ts'
import { INJECT_PATH_REL, MAX_DONE_RECENT, PACKAGE_NAME, STATUS_MD_REL } from '../shared/types.ts'
import { resolveGitBranch } from './git.ts'
import { renderInject, renderDisabledInject } from './injector.ts'
import { renderStatusMd } from './projectMd.ts'
import { assertNext, capNotes, emptyRecord, ValidationError } from './schema.ts'
import {
  CorruptVaultError,
  defaultStorageRoot,
  loadVault,
  saveVault,
  vaultPath,
} from './storage.ts'
import { normalizeCwd, taskIdFromCwd } from './taskId.ts'

export type ServiceOptions = {
  storageRoot?: string
}

/** Who/where is writing — stamped onto the vault for pane sync warnings. */
export type WriterContext = {
  sessionId?: string | null
}

export class DisabledError extends Error {
  constructor() {
    super('Long horizon is OFF for this project — flip ON in the pane or call status_set_enabled')
    this.name = 'DisabledError'
  }
}

export class NotInitializedError extends Error {
  constructor(cwd: string) {
    super(`No long-horizon vault for cwd ${cwd}. Call status_init first.`)
    this.name = 'NotInitializedError'
  }
}

function ageLabel(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export class TaskStatusService {
  readonly storageRoot: string

  constructor(opts: ServiceOptions = {}) {
    this.storageRoot = opts.storageRoot ?? defaultStorageRoot()
  }

  pathFor(cwd: string): string {
    return vaultPath(this.storageRoot, taskIdFromCwd(normalizeCwd(cwd)))
  }

  async snapshot(
    cwd: string | null | undefined,
    view?: { sessionId?: string | null },
  ): Promise<LongHorizonSnapshot> {
    const sampledAt = Date.now()
    if (!cwd || cwd.trim() === '') {
      return {
        ok: true,
        package: PACKAGE_NAME,
        enabled: false,
        initialized: false,
        cwd: null,
        message: 'pass ?cwd= absolute path (or init a project)',
        sampledAt,
      }
    }
    try {
      const abs = normalizeCwd(cwd)
      const record = await loadVault(this.pathFor(abs))
      if (!record) {
        return {
          ok: true,
          package: PACKAGE_NAME,
          enabled: false,
          initialized: false,
          cwd: abs,
          message: 'Init this project with status_init (or the pane).',
          sampledAt,
        }
      }
      const sync = await this.buildSyncHints(record, abs, view?.sessionId ?? null)
      return {
        ok: true,
        package: PACKAGE_NAME,
        enabled: record.enabled,
        initialized: true,
        record,
        sync,
        sampledAt,
      }
    } catch (err) {
      if (err instanceof CorruptVaultError) {
        return {
          ok: false,
          package: PACKAGE_NAME,
          error: err.message,
          sampledAt,
        }
      }
      return {
        ok: false,
        package: PACKAGE_NAME,
        error: String(err),
        sampledAt,
      }
    }
  }

  async init(args: {
    cwd: string
    title?: string
    verifyHint?: string
    phase?: string
  }, writer?: WriterContext): Promise<TaskStatus> {
    const abs = normalizeCwd(args.cwd)
    const taskId = taskIdFromCwd(abs)
    const path = vaultPath(this.storageRoot, taskId)
    const existing = await loadVault(path)
    if (existing) {
      existing.title = args.title?.trim() || existing.title
      if (args.verifyHint !== undefined) existing.verifyHint = args.verifyHint.trim()
      if (args.phase !== undefined) existing.phase = args.phase.trim() || existing.phase
      existing.enabled = true
      existing.updatedAt = Date.now()
      await this.stampWriter(existing, abs, writer)
      await this.persist(existing, { writeInject: true, writeMd: true })
      return existing
    }
    const record = emptyRecord({
      taskId,
      cwd: abs,
      title: args.title,
      verifyHint: args.verifyHint,
      phase: args.phase,
    })
    await this.stampWriter(record, abs, writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async get(cwd: string): Promise<TaskStatus> {
    return this.requireRecord(cwd)
  }

  async setEnabled(cwd: string, enabled: boolean, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireRecord(cwd)
    record.enabled = enabled
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    if (!enabled) {
      await this.persist(record, { writeInject: 'disabled', writeMd: true })
    } else {
      await this.persist(record, { writeInject: true, writeMd: true })
    }
    return record
  }

  async setNext(cwd: string, next: string[], writer?: WriterContext): Promise<TaskStatus> {
    assertNext(next)
    const record = await this.requireEnabled(cwd)
    record.next = next.map((s) => s.trim())
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async setInflight(cwd: string, summary: string | null, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireEnabled(cwd)
    if (summary === null || summary.trim() === '') {
      record.inFlight = null
    } else {
      record.inFlight = { summary: summary.trim(), since: Date.now() }
    }
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async setPhase(cwd: string, phase: string, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireEnabled(cwd)
    record.phase = phase.trim() || record.phase
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async markDone(
    cwd: string,
    summary: string,
    verify?: string,
    rotateNext = false,
    writer?: WriterContext,
  ): Promise<{ record: TaskStatus; warn?: string }> {
    const record = await this.requireEnabled(cwd)
    let warn: string | undefined
    if (!verify || verify.trim() === '') {
      warn = 'mark_done without verify — accepted with warning (v0)'
    }
    const item: DoneItem = {
      id: randomBytes(4).toString('hex'),
      summary: summary.trim(),
      verify: verify?.trim() || undefined,
      at: Date.now(),
    }
    record.done.push(item)
    if (record.done.length > 50) record.done = record.done.slice(-50)
    if (record.inFlight?.summary === summary.trim()) record.inFlight = null
    if (rotateNext && record.next[0] === summary.trim()) {
      record.next = record.next.slice(1)
    }
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return { record, warn }
  }

  async block(cwd: string, reason: string, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireEnabled(cwd)
    record.blocked = { reason: reason.trim(), since: Date.now() }
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async unblock(cwd: string, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireEnabled(cwd)
    record.blocked = null
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  async setNotes(cwd: string, notes: string, writer?: WriterContext): Promise<TaskStatus> {
    const record = await this.requireEnabled(cwd)
    record.notes = capNotes(notes)
    record.updatedAt = Date.now()
    await this.stampWriter(record, normalizeCwd(cwd), writer)
    await this.persist(record, { writeInject: true, writeMd: true })
    return record
  }

  recentDone(record: TaskStatus): DoneItem[] {
    return record.done.slice(-MAX_DONE_RECENT).reverse()
  }

  private async stampWriter(record: TaskStatus, cwd: string, writer?: WriterContext): Promise<void> {
    const sid = writer?.sessionId?.trim()
    if (sid) record.lastSessionId = sid
    const branch = await resolveGitBranch(cwd)
    if (branch) record.gitBranch = branch
  }

  private async buildSyncHints(
    record: TaskStatus,
    cwd: string,
    currentSessionId: string | null,
  ): Promise<SyncHints> {
    const currentBranch = await resolveGitBranch(cwd)
    const warnings: string[] = []
    const ageMs = Date.now() - record.updatedAt
    if (ageMs >= 6 * 60 * 60 * 1000) {
      warnings.push(`Last update ${ageLabel(record.updatedAt)} — board may be stale for tonight’s work.`)
    }
    if (record.gitBranch && currentBranch && record.gitBranch !== currentBranch) {
      warnings.push(
        `Git branch changed: last write on \`${record.gitBranch}\`, now on \`${currentBranch}\`. `
        + 'Same project board — skim Next/Done before trusting them, or start a fresh track after reset.',
      )
    }
    if (
      record.lastSessionId
      && currentSessionId
      && record.lastSessionId !== currentSessionId
    ) {
      warnings.push(
        'Different chat than the last writer. This board may belong to another session — confirm before continuing.',
      )
    }
    return {
      currentBranch,
      currentSessionId,
      warnings,
    }
  }

  private async requireRecord(cwd: string): Promise<TaskStatus> {
    const abs = normalizeCwd(cwd)
    const record = await loadVault(this.pathFor(abs))
    if (!record) throw new NotInitializedError(abs)
    return record
  }

  private async requireEnabled(cwd: string): Promise<TaskStatus> {
    const record = await this.requireRecord(cwd)
    if (!record.enabled) throw new DisabledError()
    return record
  }

  private async persist(
    record: TaskStatus,
    opts: { writeInject: boolean | 'disabled'; writeMd: boolean },
  ): Promise<void> {
    await saveVault(vaultPath(this.storageRoot, record.taskId), record)
    if (opts.writeMd) {
      const mdPath = join(record.cwd, STATUS_MD_REL)
      await mkdir(dirname(mdPath), { recursive: true })
      await writeFile(mdPath, renderStatusMd(record), 'utf8')
    }
    if (opts.writeInject === false) return
    const injectPath = join(record.cwd, INJECT_PATH_REL)
    await mkdir(dirname(injectPath), { recursive: true })
    const body = opts.writeInject === 'disabled' ? renderDisabledInject() : renderInject(record)
    await writeFile(injectPath, body, 'utf8')
  }
}

export { ValidationError, CorruptVaultError }
