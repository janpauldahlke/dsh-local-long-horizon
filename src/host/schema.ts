import type { TaskStatus } from '../shared/types.ts'
import { MAX_NEXT, MAX_NOTES_CHARS } from '../shared/types.ts'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function assertNext(next: string[]): void {
  if (!Array.isArray(next)) throw new ValidationError('next must be an array of strings')
  if (next.length > MAX_NEXT) {
    throw new ValidationError(`next length ${next.length} exceeds hard cap ${MAX_NEXT}`)
  }
  for (const item of next) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new ValidationError('next items must be non-empty strings')
    }
  }
}

export function capNotes(notes: string): string {
  if (notes.length <= MAX_NOTES_CHARS) return notes
  return `${notes.slice(0, MAX_NOTES_CHARS - 1)}…`
}

/** Require a non-empty trimmed string (tool args / mutators). */
export function requireNonEmpty(value: unknown, field: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new ValidationError(`${field} must be a non-empty string`)
  return text
}

/** Reject valid-JSON objects that are not a TaskStatus vault record. */
export function assertVaultShape(raw: unknown): asserts raw is TaskStatus {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ValidationError('vault root must be an object')
  }
  const o = raw as Record<string, unknown>
  for (const key of ['taskId', 'title', 'cwd', 'phase'] as const) {
    if (typeof o[key] !== 'string' || (o[key] as string).trim() === '') {
      throw new ValidationError(`vault missing string field ${key}`)
    }
  }
  if (typeof o.updatedAt !== 'number' || !Number.isFinite(o.updatedAt)) {
    throw new ValidationError('vault.updatedAt must be a finite number')
  }
  if (typeof o.enabled !== 'boolean') {
    throw new ValidationError('vault.enabled must be a boolean')
  }
  if (!Array.isArray(o.next) || !Array.isArray(o.done) || !Array.isArray(o.keyPaths)) {
    throw new ValidationError('vault next/done/keyPaths must be arrays')
  }
}

export function emptyRecord(partial: {
  taskId: string
  cwd: string
  title?: string
  verifyHint?: string
  phase?: string
}): TaskStatus {
  const now = Date.now()
  return {
    taskId: partial.taskId,
    title: partial.title?.trim() || basenameTitle(partial.cwd),
    cwd: partial.cwd,
    updatedAt: now,
    phase: partial.phase?.trim() || 'init',
    enabled: true,
    done: [],
    inFlight: null,
    next: [],
    blocked: null,
    verifyHint: partial.verifyHint?.trim() || '',
    keyPaths: [],
    notes: '',
  }
}

function basenameTitle(cwd: string): string {
  const parts = cwd.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts[parts.length - 1] || cwd
}
