/** Live tab title chip (static for M1). */
export function StubTitle() {
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
          background: '#8b93a7',
          display: 'inline-block',
        }}
      />
      Long horizon
    </span>
  )
}
