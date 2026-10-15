import { useState, useEffect } from 'react'
import { getHolidayTheme } from '../../lib/holidayTheme'
import { useIsMobile } from '../../hooks/useIsMobile'

// Small seasonal/holiday flourish in the top nav. Shows an emoji always, plus
// the label on wider screens. On an actual holiday it also pops a brief
// greeting ("Happy Halloween!") once per day. Purely decorative.
export default function HolidayBadge() {
  const isMobile = useIsMobile()
  const theme = getHolidayTheme()
  const [showGreeting, setShowGreeting] = useState(false)

  useEffect(() => {
    if (!theme?.isHoliday) return
    const today = new Date().toISOString().slice(0, 10)
    const key = `haven_holiday_greet_${theme.id}_${today}`
    let seen = false
    try { seen = localStorage.getItem(key) === '1' } catch { /* ignore */ }
    if (seen) return
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    const showT = setTimeout(() => setShowGreeting(true), 500)
    const hideT = setTimeout(() => setShowGreeting(false), 6500)
    return () => { clearTimeout(showT); clearTimeout(hideT) }
  }, [theme?.id, theme?.isHoliday])

  if (!theme) return null

  return (
    <span className="relative flex-shrink-0 flex items-center">
      <span
        title={theme.greeting}
        aria-label={theme.greeting}
        className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/90 select-none"
      >
        <span className="text-sm leading-none" aria-hidden="true">{theme.emoji}</span>
        {!isMobile && <span className="text-xs font-medium whitespace-nowrap">{theme.label}</span>}
      </span>

      {showGreeting && theme.isHoliday && (
        <button
          onClick={() => setShowGreeting(false)}
          className="absolute left-0 top-full mt-2 z-50 flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 whitespace-nowrap"
          style={{ boxShadow: 'var(--haven-shadow-md)' }}
          aria-label={`${theme.greeting} Dismiss`}
        >
          <span aria-hidden="true">{theme.emoji}</span>
          {theme.greeting}
        </button>
      )}
    </span>
  )
}
