/**
 * Returns a date as a "YYYY-MM-DD" string using LOCAL timezone.
 *
 * ⚠️  Never use `date.toISOString().split('T')[0]` — toISOString() returns UTC,
 * which is wrong for US timezones: between midnight and ~7 AM local time the
 * UTC date is still the previous day, causing yesterday's records to appear as
 * "today's" data (e.g. meds showing as already-given at start of the day).
 *
 * @param {Date} [date=new Date()] - defaults to right now
 * @returns {string} e.g. "2026-05-19"
 */
export function localDateStr(date = new Date()) {
  return (
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, '0')}-` +
    `${String(date.getDate()).padStart(2, '0')}`
  )
}
