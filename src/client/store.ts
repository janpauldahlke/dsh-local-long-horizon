/** Shared pane poll state (refcounted). */
import type { LongHorizonSnapshot } from '../shared/types.ts'

type Listener = () => void

let snapshot: LongHorizonSnapshot | null = null
let error: string | null = null
let refs = 0
let timer: ReturnType<typeof setInterval> | undefined
let cwd = ''
const listeners = new Set<Listener>()

const POLL_MS = 1000

function emit() {
  for (const l of listeners) l()
}

async function tick() {
  if (!cwd) {
    snapshot = {
      ok: true,
      package: 'dsh-local-long-horizon',
      enabled: false,
      initialized: false,
      cwd: null,
      message: 'Set a project cwd to track (open a workspace session).',
      sampledAt: Date.now(),
    }
    error = null
    emit()
    return
  }
  try {
    const res = await fetch(`/api/dsh-local-long-horizon?cwd=${encodeURIComponent(cwd)}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    snapshot = await res.json() as LongHorizonSnapshot
    error = null
  } catch (err) {
    error = String(err)
  }
  emit()
}

export function setTrackedCwd(next: string) {
  if (next === cwd) return
  cwd = next
  void tick()
}

export function getTrackedCwd(): string {
  return cwd
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  refs += 1
  if (refs === 1) {
    void tick()
    timer = setInterval(() => { void tick() }, POLL_MS)
  }
  return () => {
    listeners.delete(listener)
    refs -= 1
    if (refs === 0 && timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function getSnapshot(): LongHorizonSnapshot | null {
  return snapshot
}

export function getError(): string | null {
  return error
}

export async function postToggle(enabled: boolean): Promise<void> {
  if (!cwd) throw new Error('no cwd')
  const res = await fetch('/api/dsh-local-long-horizon', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cwd, enabled }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await tick()
}

export async function postInit(): Promise<void> {
  if (!cwd) throw new Error('no cwd')
  const res = await fetch('/api/dsh-local-long-horizon', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ cwd, action: 'init' }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  await tick()
}

export function refreshNow(): void {
  void tick()
}
