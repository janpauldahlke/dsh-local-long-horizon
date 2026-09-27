/**
 * M1 placeholder pane — full Long horizon UI lands in M5.
 * Chrome mirrors slot-health / gpu-monitor (inline, currentColor).
 */
import type { CSSProperties } from 'react'

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
  opacity: 0.65,
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}

export function StubBody() {
  return (
    <div style={container}>
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Long horizon</div>
        <div style={muted}>M1 stub — vault / tools / pane land M2–M5</div>
      </div>
    </div>
  )
}
