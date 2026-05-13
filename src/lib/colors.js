export const RESIDENT_COLORS = [
  { name: 'blue',   label: 'Blue',   swatch: '#3b82f6', chipBg: '#dbeafe', chipText: '#1d4ed8' },
  { name: 'green',  label: 'Green',  swatch: '#22c55e', chipBg: '#dcfce7', chipText: '#15803d' },
  { name: 'purple', label: 'Purple', swatch: '#a855f7', chipBg: '#f3e8ff', chipText: '#7e22ce' },
  { name: 'coral',  label: 'Coral',  swatch: '#f97316', chipBg: '#ffedd5', chipText: '#c2410c' },
  { name: 'amber',  label: 'Amber',  swatch: '#f59e0b', chipBg: '#fef3c7', chipText: '#b45309' },
  { name: 'pink',   label: 'Pink',   swatch: '#ec4899', chipBg: '#fce7f3', chipText: '#be185d' },
]

const FALLBACK = RESIDENT_COLORS[0]

export function getColor(colorName) {
  return RESIDENT_COLORS.find(c => c.name === colorName) ?? FALLBACK
}

// Business events always use this style
export const BUSINESS_COLOR = { chipBg: '#dcfce7', chipText: '#15803d', swatch: '#22c55e' }
