import type { TaskStatus } from '../shared/types.ts'

/** ≤ ~50 tokens: one line for AGENTS.md / system inject. */
export function renderInject(record: TaskStatus): string {
  if (!record.enabled) {
    return '[TASK STATUS] DISABLED — mutations refused; re-enable in Long horizon pane or status tools.\n'
  }
  const next = record.next.length ? record.next.map((n, i) => `${i + 1}.${n}`).join(' ') : '—'
  const blocked = record.blocked ? record.blocked.reason : 'no'
  const inflight = record.inFlight?.summary ?? '—'
  const line = `[TASK STATUS] Phase: ${record.phase} | Next: ${next} | InFlight: ${inflight} | Blocked: ${blocked}`
  // Hard cap ~50 tokens ≈ ~200 chars; keep one line.
  return `${line.slice(0, 220)}\n`
}

export function renderDisabledInject(): string {
  return '[TASK STATUS] DISABLED — mutations refused; re-enable in Long horizon pane or status tools.\n'
}
