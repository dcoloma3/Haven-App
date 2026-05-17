/**
 * Haven logo mark + wordmark.
 * variant="color"  — Haven blue (default, for light backgrounds)
 * variant="white"  — all white (for dark backgrounds)
 */
export default function HavenLogo({ markHeight = 26, textSize = 20, variant = 'color' }) {
  const markWidth = Math.round(markHeight * (24 / 30))
  const primary = variant === 'white' ? '#ffffff' : '#185FA5'
  const dot     = variant === 'white' ? 'rgba(255,255,255,0.65)' : '#378ADD'

  return (
    <div className={`flex items-center ${textSize > 0 ? 'gap-2' : ''}`}>
      <svg
        width={markWidth}
        height={markHeight}
        viewBox="0 0 24 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2,28 L2,15 L12,6 L22,15 L22,28 Z"
          stroke={primary}
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <rect x="4" y="20" width="5" height="8" fill={primary} rx="0.5" />
        <rect x="13" y="18" width="5" height="5" stroke={primary} strokeWidth="1.5" fill="none" rx="0.5" />
        <line x1="12" y1="3" x2="12" y2="6" stroke={primary} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="1.5" r="1.5" fill={dot} />
      </svg>

      {textSize > 0 && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 500,
            letterSpacing: '-0.5px',
            color: primary,
            lineHeight: 1,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          haven
        </span>
      )}
    </div>
  )
}
