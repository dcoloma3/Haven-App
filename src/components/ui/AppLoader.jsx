/**
 * Full-screen branded loading screen shown during auth checks and page transitions.
 * Uses the Haven logo mark + wordmark with a bounce-dot indicator below.
 */
export default function AppLoader() {
  const primary = '#185FA5'
  const dot     = '#378ADD'

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999]"
      aria-label="Loading…"
      role="status"
    >
      {/* Logo — scales in once on mount */}
      <div style={{ animation: 'havenLogoIn 320ms cubic-bezier(0.22,0.61,0.36,1) both' }}>
        <div className="flex items-center gap-2.5">
          {/* Mark */}
          <svg width="36" height="45" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2,28 L2,15 L12,6 L22,15 L22,28 Z"
              stroke={primary} strokeWidth="1.5" strokeLinejoin="round" fill="none"
            />
            <rect x="4" y="20" width="5" height="8" fill={primary} rx="0.5" />
            <rect x="13" y="18" width="5" height="5" stroke={primary} strokeWidth="1.5" fill="none" rx="0.5" />
            <line x1="12" y1="3" x2="12" y2="6" stroke={primary} strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="1.5" r="1.5" fill={dot} />
          </svg>

          {/* Wordmark */}
          <span style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: '-0.5px',
            color: primary,
            lineHeight: 1,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}>
            haven
          </span>
        </div>
      </div>

      {/* Bounce dots */}
      <div className="flex items-center gap-1.5 mt-8">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              display: 'block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: dot,
              animation: `havenDotBounce 1.1s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
