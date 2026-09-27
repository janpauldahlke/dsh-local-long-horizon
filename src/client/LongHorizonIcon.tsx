/**
 * Long horizon guide / chip icon: rising sun over a horizon line.
 *
 * Reads clearly at guide sizes (22–26px) — literal match for “horizon”,
 * same stroke weight as Slot Health’s ECG. currentColor rides the theme.
 *
 * Alternatives considered (not used): brain (unreadable at this size),
 * checklist (collides with todo UI), flag/milestone, compass.
 */
interface GuideIconProps {
  size?: number
  className?: string
}

/** Guide / tab identity: sun over horizon. */
export function LongHorizonGuideIcon({ size = 26, className }: GuideIconProps): React.JSX.Element {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {/* Horizon */}
      <path
        d="M4 18.5 H24"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Rising sun (upper semicircle above the line) */}
      <path
        d="M9 18.5 A5 5 0 0 1 19 18.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Rays */}
      <path
        d="M14 8.5 V11.2 M8.2 11.5 L10 13.2 M19.8 11.5 L18 13.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
