/**
 * Shared pane-open state for Long horizon surfaces. The dock chip and the
 * rightbar tab coexist; each decides visibility from this flag.
 *
 * `LongHorizonBody` reports mount/unmount (mount == rightbar tab open). The
 * dock chip hides while the open count is > 0 — reference-counted so a second
 * Session with the tab open does not reappear when one closes.
 */

type Listener = () => void

let openCount = 0
const listeners = new Set<Listener>()

export function setPaneOpen(open: boolean): void {
  const next = open ? openCount + 1 : Math.max(0, openCount - 1)
  if (next === openCount) return
  openCount = next
  for (const listener of [...listeners]) listener()
}

export function isPaneOpen(): boolean {
  return openCount > 0
}

export function subscribePaneOpen(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
