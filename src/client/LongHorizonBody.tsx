import type { CSSProperties } from 'react'
import { useState } from 'react'
import { postInit, postToggle, setTrackedCwd, useLongHorizon } from './useLongHorizon.ts'
import type { TaskStatus } from '../shared/types.ts'

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

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

function ageLabel(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function RecordView({ record }: { record: TaskStatus }) {
  const recent = record.done.slice(-5).reverse()
  return (
    <>
      <div style={{ ...muted, marginBottom: 4 }}>
        {record.phase} · {record.cwd.split('/').pop()} · {ageLabel(record.updatedAt)}
      </div>
      {record.blocked ? (
        <div style={{
          ...card,
          borderColor: 'color-mix(in srgb, #f87171 50%, transparent)',
          marginBottom: 8,
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

export function LongHorizonBody() {
  const { snapshot, error, cwd } = useLongHorizon()
  const [cwdDraft, setCwdDraft] = useState(cwd)
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState<string | null>(null)

  const enabled = snapshot?.ok === true && snapshot.initialized ? snapshot.enabled : false

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
      if (cwdDraft.trim()) setTrackedCwd(cwdDraft.trim())
      await postInit()
    } catch (err) {
      setLocalErr(String(err))
    } finally {
      setBusy(false)
    }
  }

  function onBindCwd() {
    if (cwdDraft.trim()) setTrackedCwd(cwdDraft.trim())
  }

  return (
    <div style={container}>
      <div style={card}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
        >
          <span style={{ fontWeight: 600 }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              marginRight: 6,
              background: enabled ? '#22c55e' : '#8b93a7',
            }}
            />
            {enabled ? 'Active' : 'Off'}
          </span>
          <button
            type="button"
            disabled={busy || !(snapshot?.ok && snapshot.initialized)}
            onClick={() => { void onToggle() }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
              background: 'color-mix(in srgb, currentColor 8%, transparent)',
              color: 'inherit',
              cursor: busy ? 'wait' : 'pointer',
              opacity: snapshot?.ok && snapshot.initialized ? 1 : 0.5,
            }}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            value={cwdDraft}
            onChange={(e) => setCwdDraft(e.target.value)}
            placeholder="/abs/project/cwd"
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
          <button type="button" onClick={onBindCwd} style={{ fontSize: 11, padding: '4px 8px' }}>
            Bind
          </button>
        </div>
        {(error || localErr) ? (
          <div style={{ color: '#f87171', fontSize: 12 }}>{error || localErr}</div>
        ) : null}
      </div>

      {snapshot?.ok === false ? (
        <div style={card}>Route error: {snapshot.error}</div>
      ) : null}

      {snapshot?.ok === true && !snapshot.initialized ? (
        <div style={card}>
          <div style={{ marginBottom: 8 }}>{snapshot.message}</div>
          <button type="button" disabled={busy || !cwdDraft.trim()} onClick={() => { void onInit() }}>
            Init this project…
          </button>
        </div>
      ) : null}

      {snapshot?.ok === true && snapshot.initialized ? (
        <RecordView record={snapshot.record} />
      ) : null}
    </div>
  )
}
