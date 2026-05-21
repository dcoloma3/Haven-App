import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

// Static bubbles at fixed positions — mirrors the BubbleCanvas from Marketing.jsx
const BUBBLES = [
  { x: 820, y: 60,  r: 55, color: '#378ADD', opacity: 0.07 },
  { x: 950, y: 180, r: 38, color: '#185FA5', opacity: 0.06 },
  { x: 1080,y: 80,  r: 62, color: '#85B7EB', opacity: 0.05 },
  { x: 1140,y: 260, r: 44, color: '#378ADD', opacity: 0.07 },
  { x: 700, y: 40,  r: 28, color: '#85B7EB', opacity: 0.06 },
  { x: 1020,y: 380, r: 50, color: '#185FA5', opacity: 0.05 },
  { x: 880, y: 480, r: 35, color: '#378ADD', opacity: 0.06 },
  { x: 600, y: 300, r: 22, color: '#85B7EB', opacity: 0.05 },
  { x: 1160,y: 500, r: 40, color: '#185FA5', opacity: 0.07 },
  { x: 750, y: 550, r: 58, color: '#378ADD', opacity: 0.04 },
  { x: 100, y: 80,  r: 30, color: '#85B7EB', opacity: 0.04 },
  { x: 50,  y: 400, r: 20, color: '#378ADD', opacity: 0.05 },
]

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#042C53',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Bubbles */}
        {BUBBLES.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x - b.r,
              top: b.y - b.r,
              width: b.r * 2,
              height: b.r * 2,
              borderRadius: '50%',
              background: b.color,
              opacity: b.opacity,
            }}
          />
        ))}

        {/* Bottom accent line */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, transparent, #378ADD, #185FA5, transparent)',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          {/* House SVG icon */}
          <svg width="44" height="55" viewBox="0 0 24 30" fill="none">
            <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <rect x="4" y="20" width="5" height="8" fill="white" rx="0.5" />
            <rect x="13" y="18" width="5" height="5" stroke="white" strokeWidth="1.5" fill="none" rx="0.5" />
            <line x1="12" y1="3" x2="12" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="1.5" r="1.5" fill="#85B7EB" />
          </svg>
          <span style={{
            fontSize: '48px',
            fontWeight: 500,
            color: 'white',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}>
            haven
          </span>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: '32px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.4,
          marginBottom: '32px',
          maxWidth: '600px',
        }}>
          Senior living management, simplified.
        </div>

        {/* URL pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(55,138,221,0.15)',
          border: '1px solid rgba(55,138,221,0.3)',
          borderRadius: '99px',
          padding: '8px 20px',
          width: 'fit-content',
          fontSize: '18px',
          fontWeight: 500,
          color: '#85B7EB',
        }}>
          havencare.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
