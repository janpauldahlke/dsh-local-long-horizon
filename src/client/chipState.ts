/**
 * Pure chip label derivation — dock + title can share this so they never disagree.
 * Keep the dock label short/stable (slot-health pattern); put detail in `title`.
 */
import type { LongHorizonSnapshot } from '../shared/types.ts'

export type ChipDisplay = {
  /** Colored status dot. */
  dot: string
  /** Short dock label, e.g. `Horizon · skim README`. */
  label: string
  /** Full tooltip (multi-line ok). */
  title: string
  /** Dim the chip when we have no useful sample. */
  dim: boolean
}

const GREY = '#8b93a7'
const GREEN = '#22c55e'
const AMBER = '#fbbf24'
const RED = '#ef4444'

function trunc(s: string, max = 22): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

export function deriveChip(
  snapshot: LongHorizonSnapshot | null,
  error: string | null,
): ChipDisplay {
  if (error) {
    return {
      dot: RED,
      label: 'Horizon · error',
      title: `Long horizon route error\n${error}`,
      dim: false,
    }
  }
  if (!snapshot) {
    return {
      dot: GREY,
      label: 'Horizon · …',
      title: 'Long horizon — waiting for first sample',
      dim: true,
    }
  }
  if (!snapshot.ok) {
    return {
      dot: RED,
      label: 'Horizon · error',
      title: `Long horizon route error\n${snapshot.error}`,
      dim: false,
    }
  }
  if (!snapshot.initialized) {
    const cwd = snapshot.cwd
    return {
      dot: GREY,
      label: 'Horizon · off',
      title: cwd
        ? `Long horizon not started for\n${cwd}\nOpen the pane → Start tracking this folder`
        : 'Long horizon — open a workspace in this chat to track it',
      dim: true,
    }
  }

  const r = snapshot.record
  const base = `${r.phase} · ${r.cwd}\nUpdated ${Math.max(0, Math.round((Date.now() - r.updatedAt) / 1000))}s ago`

  if (r.blocked) {
    return {
      dot: RED,
      label: 'Horizon · blocked',
      title: `${base}\nBlocked: ${r.blocked.reason}`,
      dim: false,
    }
  }

  if (!r.enabled) {
    return {
      dot: AMBER,
      label: 'Horizon · paused',
      title: `${base}\nLong horizon is OFF (board still readable)`,
      dim: false,
    }
  }

  if (r.inFlight?.summary) {
    const s = trunc(r.inFlight.summary, 18)
    return {
      dot: GREEN,
      label: `Horizon · ${s}`,
      title: `${base}\nIn flight: ${r.inFlight.summary}${r.next[0] ? `\nNext: ${r.next.join(' · ')}` : ''}`,
      dim: false,
    }
  }

  if (r.next.length > 0) {
    const s = trunc(r.next[0], 16)
    return {
      dot: GREEN,
      label: `Horizon · next: ${s}`,
      title: `${base}\nNext: ${r.next.join(' · ')}`,
      dim: false,
    }
  }

  const last = r.done[r.done.length - 1]
  if (last) {
    return {
      dot: GREEN,
      label: 'Horizon · clear',
      title: `${base}\nLast done: ${last.summary}\nNo in-flight / next items`,
      dim: false,
    }
  }

  return {
    dot: GREEN,
    label: 'Horizon · on',
    title: `${base}\nActive — no items yet`,
    dim: false,
  }
}
