/** Shared vault schema — source of truth for tools, inject, STATUS.md, pane. */

export type DoneItem = {
  id: string
  summary: string
  verify?: string
  at: number
}

export type InFlight = {
  summary: string
  since?: number
} | null

export type Blocked = {
  reason: string
  since: number
} | null

export type TaskStatus = {
  taskId: string
  title: string
  cwd: string
  updatedAt: number
  phase: string
  enabled: boolean
  done: DoneItem[]
  inFlight: InFlight
  next: string[]
  blocked: Blocked
  verifyHint: string
  keyPaths: string[]
  notes: string
}

/** API / pane payload (includes transport ok). */
export type LongHorizonSnapshot =
  | {
      ok: true
      package: 'dsh-local-long-horizon'
      enabled: boolean
      initialized: true
      record: TaskStatus
      sampledAt: number
    }
  | {
      ok: true
      package: 'dsh-local-long-horizon'
      enabled: false
      initialized: false
      cwd: string | null
      message: string
      sampledAt: number
    }
  | {
      ok: false
      package: 'dsh-local-long-horizon'
      error: string
      sampledAt: number
    }

export const PACKAGE_NAME = 'dsh-local-long-horizon' as const
export const MAX_NEXT = 3
export const MAX_DONE_RECENT = 5
export const MAX_NOTES_CHARS = 500
export const INJECT_PATH_REL = '.dsh/task-status-inject.md'
export const STATUS_MD_REL = 'STATUS.md'
