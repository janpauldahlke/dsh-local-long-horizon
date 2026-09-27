import { createHash } from 'node:crypto'
import { basename, resolve } from 'node:path'

/** Stable task id from absolute cwd (path-safe, short). */
export function taskIdFromCwd(cwd: string): string {
  const abs = resolve(cwd)
  const base = basename(abs).replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 48) || 'task'
  const hash = createHash('sha256').update(abs).digest('hex').slice(0, 12)
  return `${base}-${hash}`
}

export function normalizeCwd(cwd: string): string {
  return resolve(cwd)
}
