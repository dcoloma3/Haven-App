// Small seasonal flourish shown in the top nav. By default it reflects the
// SEASON (changes monthly). On the exact date of a holiday it switches to that
// holiday and triggers a one-per-day greeting. Date-driven; no backend.

// Per-month seasonal theme — always present.
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

// Fixed-date holidays, keyed "month-day". Only active on the exact day.
const FIXED_HOLIDAYS = {
  '1-1':   { id: 'newyear',   emoji: '🎉', label: 'Happy New Year' },
  '2-14':  { id: 'valentine', emoji: '💝', label: "Happy Valentine's Day" },
  '3-17':  { id: 'stpatrick', emoji: '☘️', label: "Happy St. Patrick's Day" },
  '7-4':   { id: 'july4',     emoji: '🎆', label: 'Happy 4th of July' },
  '10-31': { id: 'halloween', emoji: '🎃', label: 'Happy Halloween' },
  '12-25': { id: 'christmas', emoji: '🎄', label: 'Merry Christmas' },
  '12-31': { id: 'nye',       emoji: '🎉', label: "Happy New Year's Eve" },
}

// Day-of-month of US Thanksgiving (4th Thursday of November) for a given year.
function thanksgivingDay(year) {
  const firstDow = new Date(year, 10, 1).getDay() // 0=Sun … 4=Thu
  const firstThursday = 1 + ((4 - firstDow + 7) % 7)
  return firstThursday + 21
}

function getHoliday(date) {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const fixed = FIXED_HOLIDAYS[`${month}-${day}`]
  if (fixed) return fixed
  if (month === 11 && day === thanksgivingDay(date.getFullYear())) {
    return { id: 'thanks', emoji: '🦃', label: 'Happy Thanksgiving' }
  }
  return null
}

// Returns the active theme: the holiday on its exact day, otherwise the
// season. Always returns { id, emoji, label, isHoliday, greeting }.
export function getHolidayTheme(date = new Date()) {
  const holiday = getHoliday(date)
  const theme = holiday || SEASONAL[date.getMonth() + 1]
  const isHoliday = !!holiday
  return { ...theme, isHoliday, greeting: isHoliday ? `${theme.label}!` : theme.label }
}
