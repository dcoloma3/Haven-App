import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

// Live date + time in the top nav (desktop only — mobile space is tight).
export default function DateTimeClock() {
  const isMobile = useIsMobile()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (isMobile) return null

  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <span className="flex-shrink-0 flex items-center gap-1.5 text-white/80 text-xs font-medium whitespace-nowrap" aria-label={`${date}, ${time}`}>
      <span>{date}</span>
      <span className="text-white/30">·</span>
      <span className="tabular-nums">{time}</span>
    </span>
  )
}
