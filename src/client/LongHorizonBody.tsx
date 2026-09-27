import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { postInit, postToggle, setTrackedCwd, useLongHorizon } from './useLongHorizon.ts'
import { setPaneOpen } from './paneState.ts'
import type { TaskStatus } from '../shared/types.ts'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

/** Hook stand-in when the rightbar has not injected useSessions (should not happen in-prod). */
function useNoopSessions<T>(selector: (state: { byId: Record<string, never> }) => T): T {
  return selector({ byId: {} })
}

const container: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.5,
  color: 'inherit',
}

const card: CSSProperties = {
  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  borderRadius: 8,
  padding: '10px 12px',
  background: 'color-mix(in srgb, currentColor 4%, transparent)',
}

const muted: CSSProperties = {
  color: 'color-mix(in srgb, currentColor 55%, transparent)',
  fontSize: 12,
  fontFamily: MONO,
  margin: 0,
}

const hairline: CSSProperties = {
  borderTop: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
  margin: '6px 0',
}

const btn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
  background: 'color-mix(in srgb, currentColor 8%, transparent)',
  color: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function ageLabel(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function basename(path: string): string {
  const parts = path.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1] || path
}

function RecordView({ record }: { record: TaskStatus }) {
  const recent = record.done.slice(-5).reverse()
  return (
    <>
      {record.blocked ? (
        <div style={{
          ...card,
          borderColor: 'color-mix(in srgb, #f87171 50%, transparent)',
        }}
        >
          ⚠ Blocked: {record.blocked.reason}
        </div>
      ) : null}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Now</div>
        <div>In flight: {record.inFlight?.summary ?? '—'}</div>
        <div style={hairline} />
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Next 3</div>
        {record.next.length === 0 ? (
          <div style={muted}>—</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {record.next.map((n) => <li key={n}>{n}</li>)}
          </ol>
        )}
      </div>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Done (recent)</div>
        {recent.length === 0 ? (
          <div style={muted}>(none)</div>
        ) : (
          recent.map((d) => (
            <div key={d.id} style={{ marginBottom: 4 }}>
              ✓ {d.summary}
              {d.verify ? <span style={muted}> · verify: {d.verify}</span> : null}
              <span style={muted}> · {ageLabel(d.at)}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}

export function LongHorizonBody(props: {
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

  const { snapshot, error, cwd } = useLongHorizon(sessionCwd, sessionId)
  const [cwdDraft, setCwdDraft] = useState(cwd)
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  useEffect(() => {
    setPaneOpen(true)
    return () => setPaneOpen(false)
  }, [])

  useEffect(() => {
    if (cwd) setCwdDraft(cwd)
  }, [cwd])

  const initialized = snapshot?.ok === true && snapshot.initialized
  const enabled = initialized ? snapshot.enabled : false
  const record = initialized ? snapshot.record : null
  const hasDraft = Boolean(cwdDraft.trim())
  const followingSession = Boolean(sessionCwd && cwd && sessionCwd === cwd)

  async function onToggle() {
    setBusy(true)
    setLocalErr(null)
    try {
      await postToggle(!enabled)
    } catch (err) {
      setLocalErr(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onInit() {
    setBusy(true)
    setLocalErr(null)
    try {
      const next = cwdDraft.trim()
      if (next) setTrackedCwd(next)
      await postInit()
    } catch (err) {
      setLocalErr(String(err))
    } finally {
      setBusy(false)
    }
  }

  function onTrackFolder() {
    const next = cwdDraft.trim()
    if (!next) return
    setTrackedCwd(next)
  }

  const modeLabel = !initialized ? 'Off' : enabled ? 'Active' : 'Paused'
  const modeColor = !initialized ? '#8b93a7' : enabled ? '#22c55e' : '#fbbf24'

  return (
    <div style={container}>
      {/* Status board first when a vault exists (even if Paused). */}
      {record ? (
        <>
          <div style={card}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 6,
            }}
            >
              <span
                style={{ fontWeight: 600 }}
                title={enabled
                  ? 'Long horizon is ON — agent status_* tools may update this board.'
                  : 'Long horizon is OFF — board is read-only; mutating tools refuse.'}
              >
                <span style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  marginRight: 6,
                  background: modeColor,
                }}
                />
                {modeLabel}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => { void onToggle() }}
                title={enabled
                  ? 'Turn Long horizon OFF for this folder (tools stop mutating; board stays visible).'
                  : 'Turn Long horizon ON so the agent can update Next / Done for this folder.'}
                style={{ ...btn, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
              >
                {enabled ? 'Turn off' : 'Turn on'}
              </button>
            </div>
            <div style={{ ...muted, marginBottom: 2 }}>
              {record.phase}
              {snapshot?.ok && snapshot.initialized && snapshot.sync.currentBranch
                ? ` · ${snapshot.sync.currentBranch}`
                : record.gitBranch
                  ? ` · ${record.gitBranch}`
                  : ''}
              {' · '}
              {basename(record.cwd)}
              {' · '}
              {ageLabel(record.updatedAt)}
            </div>
            <div style={muted} title={record.cwd}>
              <span style={{ fontWeight: 600, fontFamily: 'inherit', color: 'inherit' }}>
                {basename(record.cwd)}
              </span>
              {' · '}
              {record.cwd}
            </div>
          </div>
          {snapshot?.ok && snapshot.initialized && snapshot.sync.warnings.length > 0 ? (
            <div style={{
              ...card,
              borderColor: 'color-mix(in srgb, #fbbf24 55%, transparent)',
              background: 'color-mix(in srgb, #fbbf24 10%, transparent)',
            }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Sync check</div>
              {snapshot.sync.warnings.map((w) => (
                <div key={w} style={{ fontSize: 12, marginBottom: 4 }}>{w}</div>
              ))}
            </div>
          ) : null}
          <RecordView record={record} />
        </>
      ) : null}

      {/* Project folder controls (always available). */}
      <div style={card}>
        {!record ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginRight: 6,
                background: modeColor,
              }}
              />
              {modeLabel}
            </div>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              {followingSession
                ? 'Following this chat’s workspace folder.'
                : 'Open a workspace in this chat (or paste a path), then start Long horizon.'}
            </div>
          </div>
        ) : (
          <div style={{ ...muted, marginBottom: 6, fontFamily: 'inherit' }}>
            {followingSession ? 'Workspace folder (auto)' : 'Switch folder'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            value={cwdDraft}
            onChange={(e) => setCwdDraft(e.target.value)}
            placeholder="Project folder (absolute path)"
            title="Usually filled from the open workspace. Paste another absolute path only to override."
            aria-label="Project folder"
            style={{
              flex: 1,
              fontSize: 11,
              fontFamily: MONO,
              padding: '4px 6px',
              borderRadius: 4,
              border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
              background: 'transparent',
              color: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onTrackFolder}
            disabled={!hasDraft}
            title="Poll this folder’s vault (override). Does not create a vault."
            style={{ ...btn, fontSize: 11, opacity: hasDraft ? 1 : 0.5, cursor: hasDraft ? 'pointer' : 'not-allowed' }}
          >
            Track folder
          </button>
        </div>
        {!cwd && !record ? (
          <div style={{ ...muted, fontFamily: 'inherit', marginBottom: 6 }}>
            No folder yet — open a workspace in this chat, or paste a path.
          </div>
        ) : null}
        {sessionCwd && cwd && sessionCwd !== cwd ? (
          <button
            type="button"
            onClick={() => {
              setCwdDraft(sessionCwd)
              setTrackedCwd(sessionCwd)
            }}
            title="Reset to the workspace folder of the active chat."
            style={{ ...btn, fontSize: 11, marginBottom: 6 }}
          >
            Use chat workspace
          </button>
        ) : null}
        {snapshot?.ok === true && !snapshot.initialized && hasDraft ? (
          <>
            <div style={{ fontSize: 12, marginBottom: 6 }}>
              Start tracking so the agent can keep Next / Done in sync.
            </div>
            <button
              type="button"
              disabled={busy || !hasDraft}
              onClick={() => { void onInit() }}
              title="Create the Long horizon vault for this folder, turn it ON, and write STATUS.md."
              style={{ ...btn, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}
            >
              Start tracking this folder
            </button>
          </>
        ) : null}
        {(error || localErr) ? (
          <div style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>{error || localErr}</div>
        ) : null}
      </div>

      {snapshot?.ok === false ? (
        <div style={card}>Route error: {snapshot.error}</div>
      ) : null}
    </div>
  )
}
