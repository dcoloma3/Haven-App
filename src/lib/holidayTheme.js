// Small seasonal/holiday flourish shown in the top nav. Date-driven; returns
// null when nothing is active (the badge then renders nothing).
//
// Ranges are inclusive and compared by month/day only (year-agnostic), so a
// range may wrap across New Year (handled below).

const HOLIDAYS = [
  { id: 'newyear',   emoji: '🎉', label: 'Happy New Year',          from: [12, 31], to: [1, 2] },
  { id: 'valentine', emoji: '💝', label: "Happy Valentine's Day",    from: [2, 10],  to: [2, 14] },
  { id: 'stpatrick', emoji: '☘️', label: "Happy St. Patrick's Day",  from: [3, 15],  to: [3, 17] },
  { id: 'spring',    emoji: '🌷', label: 'Happy Spring',             from: [4, 1],   to: [4, 10] },
  { id: 'july4',     emoji: '🎆', label: 'Happy 4th of July',        from: [7, 1],   to: [7, 4] },
  { id: 'halloween', emoji: '🎃', label: 'Happy Halloween',          from: [10, 1],  to: [10, 31] },
  { id: 'thanks',    emoji: '🦃', label: 'Happy Thanksgiving',       from: [11, 20], to: [11, 30] },
  { id: 'holidays',  emoji: '🎄', label: 'Happy Holidays',           from: [12, 1],  to: [12, 30] },
]

// Per-month seasonal fallback, so there is always a theme even outside a
// specific holiday window. Indexed 1–12.
const SEASONAL = {
  1:  { id: 'winter', emoji: '❄️', label: 'Winter' },
  2:  { id: 'winter', emoji: '❄️', label: 'Winter' },
  3:  { id: 'spring', emoji: '🌱', label: 'Early Spring' },
  4:  { id: 'spring', emoji: '🌷', label: 'Spring' },
  5:  { id: 'spring', emoji: '🌸', label: 'Spring' },
  6:  { id: 'summer', emoji: '☀️', label: 'Summer' },
  7:  { id: 'summer', emoji: '☀️', label: 'Summer' },
  8:  { id: 'summer', emoji: '🌻', label: 'Late Summer' },
  9:  { id: 'autumn', emoji: '🍂', label: 'Autumn' },
  10: { id: 'autumn', emoji: '🍁', label: 'Autumn' },
  11: { id: 'autumn', emoji: '🍁', label: 'Autumn' },
  12: { id: 'winter', emoji: '❄️', label: 'Winter' },
}

function inRange(month, day, [fm, fd], [tm, td]) {
  const v = month * 100 + day
  const start = fm * 100 + fd
  const end = tm * 100 + td
  // Normal (non-wrapping) range
  if (start <= end) return v >= start && v <= end
  // Wrapping range (e.g. Dec 31 → Jan 2)
  return v >= start || v <= end
}

// Returns the active theme: a specific holiday if today falls in one, otherwise
// the month's seasonal theme. Always returns a theme
// ({ id, emoji, label, isHoliday, greeting }).
export function getHolidayTheme(date = new Date()) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const holiday = HOLIDAYS.find(h => inRange(month, day, h.from, h.to))
  const theme = holiday || SEASONAL[month]
  const isHoliday = !!holiday
  return { ...theme, isHoliday, greeting: isHoliday ? `${theme.label}!` : theme.label }
}
