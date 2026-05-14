// Shared medication status utilities used by Dispense, Dashboard, MedicationList, ResidentDetail

export function adminKey(medicationId, time) {
  return `${medicationId}::${time}`
}

export function isMedDueOnDate(med, dateStr) {
  if (med.start_date && dateStr < med.start_date) return false
  if (med.end_date && dateStr > med.end_date) return false
  const type = med.frequency_type || 'daily'
  if (type === 'one_time') return !med.start_date || dateStr === med.start_date
  if (type === 'daily') return true
  if (type === 'specific_days') {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    return (med.frequency_days || []).includes(dayName)
  }
  if (type === 'every_x_days') {
    if (!med.start_date || !med.frequency_interval) return true
    const [sy, sm, sd] = med.start_date.split('-').map(Number)
    const [dy, dm, dd] = dateStr.split('-').map(Number)
    const startMs = new Date(sy, sm - 1, sd).getTime()
    const dateMs = new Date(dy, dm - 1, dd).getTime()
    const diffDays = Math.round((dateMs - startMs) / 86400000)
    return diffDays >= 0 && diffDays % med.frequency_interval === 0
  }
  return true
}

/**
 * Compute a single resident's med status for a given date.
 * @param {Array} meds - medications for this resident
 * @param {Set} administeredSet - Set of `${medicationId}::${time}` strings already documented
 *   (admin_status = 'given' | 'refused' | 'held' all count as documented)
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {'no_meds' | 'none' | 'partial' | 'all'}
 */
export function computeResidentStatus(meds, administeredSet, dateStr) {
  const dueMeds = meds.filter(m => isMedDueOnDate(m, dateStr))
  if (dueMeds.length === 0) return 'no_meds'

  let total = 0
  let done = 0
  dueMeds.forEach(med => {
    ;(med.scheduled_times || []).forEach(time => {
      total++
      if (administeredSet.has(adminKey(med.id, time))) done++
    })
  })

  if (total === 0) return 'no_meds'
  if (done === 0) return 'none'
  if (done >= total) return 'all'
  return 'partial'
}

// Ring color per status (used as box-shadow / border color)
export const RING_COLOR = {
  no_meds: '#185FA5',  // blue  — no medications on file
  none:    '#cbd5e1',  // slate-300 — meds scheduled, none given yet
  partial: '#fbbf24',  // amber-400 — some given
  all:     '#34d399',  // emerald-400 — all given
}

export function ringBoxShadow(status) {
  const color = RING_COLOR[status] ?? RING_COLOR.no_meds
  return `0 0 0 3px ${color}`
}
