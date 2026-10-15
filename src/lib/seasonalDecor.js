import { getHolidayTheme } from './holidayTheme'

// Particle sets for the seasonal background. A "set" is a group of emoji that
// animate the same way. getSeasonalDecor() returns the active sets for today:
// the season by month, with a holiday layered over its season on the exact day.

const SEASON = {
  winter: [{ e: ['❄️', '❄'],            kind: 'fall',    n: 30, op: 0.55, sz: [12, 24] }],
  spring: [{ e: ['🌸', '🌷', '🌼'],      kind: 'fall',    n: 26, op: 0.5,  sz: [14, 24] }],
  summer: [{ e: ['🦋', '🌻', '✨'],      kind: 'floatup', n: 22, op: 0.45, sz: [14, 24] }],
  autumn: [{ e: ['🍁', '🍂', '🍃'],      kind: 'fall',    n: 28, op: 0.5,  sz: [14, 28] }],
}

const HOLIDAY = {
  halloween: { base: 'autumn', sets: [
    { e: ['🎃'],        kind: 'bob',     n: 8,  op: 0.55, sz: [22, 38], glow: true },
    { e: ['👻', '🦇'],  kind: 'floatup', n: 9,  op: 0.4,  sz: [16, 24] },
  ] },
  thanks: { base: 'autumn', sets: [
    { e: ['🦃'],              kind: 'bob',  n: 5,  op: 0.5, sz: [24, 36] },
    { e: ['🍗', '🥧', '🌽'],  kind: 'fall', n: 9,  op: 0.4, sz: [16, 24] },
  ] },
  christmas: { base: 'winter', sets: [
    { e: ['🎄', '🎁', '⭐', '🔔'], kind: 'fall', n: 14, op: 0.5, sz: [16, 26] },
  ] },
  newyear: { sets: [{ e: ['🎉', '🎊', '✨'], kind: 'burst', n: 22, op: 0.6, sz: [16, 28], glow: true }] },
  nye:     { sets: [{ e: ['🎉', '🎊', '✨'], kind: 'burst', n: 22, op: 0.6, sz: [16, 28], glow: true }] },
  valentine: { sets: [{ e: ['💝', '💕', '🌹'], kind: 'floatup', n: 22, op: 0.5, sz: [14, 26] }] },
  stpatrick: { sets: [{ e: ['☘️', '🍀', '✨'], kind: 'fall',    n: 22, op: 0.5, sz: [14, 24] }] },
  july4:   { sets: [{ e: ['🎆', '🎇', '⭐'],   kind: 'burst',   n: 20, op: 0.6, sz: [18, 30], glow: true }] },
}

export function getSeasonalDecor(date = new Date()) {
  const theme = getHolidayTheme(date)
  if (theme.isHoliday && HOLIDAY[theme.id]) {
    const h = HOLIDAY[theme.id]
    const base = h.base ? SEASON[h.base].map(s => ({ ...s, n: Math.round(s.n * 0.5) })) : []
    return [...base, ...h.sets]
  }
  return SEASON[theme.id] || SEASON.autumn
}
