import { useLongHorizon } from './useLongHorizon.ts'

/** Hook stand-in when useSessions is not injected. */
function useNoopSessions<T>(selector: (state: { byId: Record<string, never> }) => T): T {
  return selector({ byId: {} })
}

export function LongHorizonTitle(props: {
  sessionId?: string
  useSessions?: <T>(selector: (state: {
    byId: Record<string, { cwd?: string | null } | undefined>
  }) => T) => T
} = {}) {
  const { sessionId, useSessions = useNoopSessions } = props
  const sessionCwd = useSessions((sessions) => {
    if (!sessionId) return null
    const cwd = sessions.byId[sessionId]?.cwd
    return typeof cwd === 'string' && cwd.trim() ? cwd.trim() : null
  })
  const { snapshot, error } = useLongHorizon(sessionCwd)

  let color = '#8b93a7'
  if (error || (snapshot && !snapshot.ok)) color = '#ef4444'
  else if (snapshot?.ok && snapshot.initialized && snapshot.enabled) color = '#22c55e'
  else if (snapshot?.ok && snapshot.initialized) color = '#fbbf24'

  const tip = error || (snapshot && !snapshot.ok)
    ? 'Long horizon route error'
    : snapshot?.ok && snapshot.initialized && snapshot.enabled
      ? 'Long horizon ON — agent is writing Next / Done'
      : snapshot?.ok && snapshot.initialized
        ? 'Long horizon OFF — board is read-only'
        : sessionCwd
          ? `Following workspace ${sessionCwd}`
          : 'Long horizon — open a workspace in this chat to track it'

  return (
    <span
      title={tip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      Long horizon
    </span>
  )
}
