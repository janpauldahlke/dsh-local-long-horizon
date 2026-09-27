/**
 * Compact dock chip for Long horizon. Renders in `conversation.composer.dock`;
 * hides while the rightbar pane is open (refcounted via paneState). Click opens
 * the Long horizon tab.
 *
 * Chrome matches GpuDockChip / SlotDockChip (pill, glow, tabular nums) so the
 * three sit as siblings under the composer.
 */
import { useEffect, useState } from 'react'
import { useLongHorizon } from './useLongHorizon.ts'
import { deriveChip } from './chipState.ts'
import { isPaneOpen, subscribePaneOpen } from './paneState.ts'

function useNoopSessions<T>(selector: (state: { byId: Record<string, never> }) => T): T {
  return selector({ byId: {} })
}

export function LongHorizonDockChip(props: {
  onOpen: () => void
  sessionId?: string
  useSessions?: <T>(selector: (state: {
    byId: Record<string, { cwd?: string | null } | undefined>
  }) => T) => T
}): React.JSX.Element | null {
  const { onOpen, sessionId, useSessions = useNoopSessions } = props
  const sessionCwd = useSessions((sessions) => {
    if (!sessionId) return null
    const cwd = sessions.byId[sessionId]?.cwd
    return typeof cwd === 'string' && cwd.trim() ? cwd.trim() : null
  })
  const { snapshot, error } = useLongHorizon(sessionCwd, sessionId)
  const [paneOpen, setPaneOpenState] = useState(isPaneOpen)

  useEffect(() => subscribePaneOpen(() => setPaneOpenState(isPaneOpen())), [])

  if (paneOpen) return null

  const display = deriveChip(snapshot, error)
  const glowing = !display.dim && display.dot !== '#8b93a7'

  return (
    <button
      type="button"
      onClick={onOpen}
      title={display.title}
      aria-label={`Long horizon: ${display.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        padding: '1px 8px',
        borderRadius: 999,
        border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
        background: 'color-mix(in srgb, currentColor 6%, transparent)',
        color: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        opacity: display.dim ? 0.55 : 1,
        transition: 'opacity 200ms',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: display.dot,
          display: 'inline-block',
          boxShadow: glowing ? `0 0 5px ${display.dot}` : 'none',
          flexShrink: 0,
        }}
      />
      {display.label}
    </button>
  )
}
