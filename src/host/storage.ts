import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import type { TaskStatus } from '../shared/types.ts'

export function defaultStorageRoot(): string {
  return join(homedir(), '.dsh', 'storages', 'dsh-local-long-horizon')
}

export function vaultPath(storageRoot: string, taskId: string): string {
  return join(storageRoot, `${taskId}.json`)
}

export class CorruptVaultError extends Error {
  readonly path: string
  constructor(path: string, cause?: unknown) {
    super(`corrupt vault JSON at ${path}`)
    this.name = 'CorruptVaultError'
    this.path = path
    if (cause !== undefined) this.cause = cause
  }
}

/** Load vault or null if missing. Throws CorruptVaultError on bad JSON. */
export async function loadVault(path: string): Promise<TaskStatus | null> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return null
    throw err
  }
  try {
    return JSON.parse(raw) as TaskStatus
  } catch (cause) {
    throw new CorruptVaultError(path, cause)
  }
}

/** Atomic write: tmp + rename. */
export async function saveVault(path: string, record: TaskStatus): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`
  const body = `${JSON.stringify(record, null, 2)}\n`
  await writeFile(tmp, body, 'utf8')
  await rename(tmp, path)
}
