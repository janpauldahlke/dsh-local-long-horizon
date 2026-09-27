import { useEffect, useReducer, useRef } from 'react'
import {
  getError,
  getSnapshot,
  getTrackedCwd,
  setTrackedCwd,
  subscribe,
} from './store.ts'
import type { LongHorizonSnapshot } from '../shared/types.ts'

/**
 * Best-effort cwd when the session hook is unavailable (e.g. isolated render).
 * Prefer `useSessions(…).cwd` from the rightbar props — see LongHorizonBody.
 */
function detectCwdFallback(): string {
  try {
    const w = window as unknown as {
      __DSH_CWD__?: string
      __dsh?: { cwd?: string }
    }
    if (typeof w.__DSH_CWD__ === 'string' && w.__DSH_CWD__) return w.__DSH_CWD__
    if (typeof w.__dsh?.cwd === 'string' && w.__dsh.cwd) return w.__dsh.cwd
  } catch { /* ignore */ }
  return getTrackedCwd()
}

export function useLongHorizon(sessionCwd?: string | null): {
  snapshot: LongHorizonSnapshot | null
  error: string | null
  cwd: string
  /** Absolute path from the active chat’s workspace, if any. */
  sessionCwd: string | null
} {
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const lastAuto = useRef<string | null>(null)

  useEffect(() => {
    return subscribe(() => bump())
  }, [])

  // Follow the open workspace folder whenever the session exposes one.
  useEffect(() => {
    const fromSession = typeof sessionCwd === 'string' && sessionCwd.trim()
      ? sessionCwd.trim()
      : null
    const next = fromSession ?? detectCwdFallback()
    if (!next) return
    if (fromSession && fromSession === lastAuto.current && getTrackedCwd() === fromSession) return
    if (fromSession) lastAuto.current = fromSession
    setTrackedCwd(next)
  }, [sessionCwd])

  return {
    snapshot: getSnapshot(),
    error: getError(),
    cwd: getTrackedCwd(),
    sessionCwd: typeof sessionCwd === 'string' && sessionCwd.trim() ? sessionCwd.trim() : null,
  }
}

export { setTrackedCwd, postToggle, postInit, refreshNow } from './store.ts'
