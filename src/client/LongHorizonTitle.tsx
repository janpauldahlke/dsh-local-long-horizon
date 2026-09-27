import { useLongHorizon } from './useLongHorizon.ts'

export function LongHorizonTitle() {
  const { snapshot, error } = useLongHorizon()
  let color = '#8b93a7'
  if (error || (snapshot && !snapshot.ok)) color = '#ef4444'
  else if (snapshot?.ok && snapshot.initialized && snapshot.enabled) color = '#22c55e'
  else if (snapshot?.ok && snapshot.initialized) color = '#fbbf24'

  return (
    <span
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
