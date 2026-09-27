import { useEffect, useReducer } from 'react'
import {
  getError,
  getSnapshot,
  getTrackedCwd,
  setTrackedCwd,
  subscribe,
} from './store.ts'
import type { LongHorizonSnapshot } from '../shared/types.ts'

/** Best-effort cwd from the browser location / dsh shell globals. */
function detectCwd(): string {
  try {
    const w = window as unknown as {
      __DSH_CWD__?: string
      __dsh?: { cwd?: string }
    }
    if (typeof w.__DSH_CWD__ === 'string' && w.__DSH_CWD__) return w.__DSH_CWD__
    if (typeof w.__dsh?.cwd === 'string' && w.__dsh.cwd) return w.__dsh.cwd
  } catch { /* ignore */ }
  // Fallback: last tracked, or empty (pane shows init prompt).
  return getTrackedCwd()
}

export function useLongHorizon(): {
  snapshot: LongHorizonSnapshot | null
  error: string | null
  cwd: string
} {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    const detected = detectCwd()
    if (detected) setTrackedCwd(detected)
    return subscribe(() => bump())
  }, [])
  return {
    snapshot: getSnapshot(),
    error: getError(),
    cwd: getTrackedCwd(),
  }
}

export { setTrackedCwd, postToggle, postInit, refreshNow } from './store.ts'
