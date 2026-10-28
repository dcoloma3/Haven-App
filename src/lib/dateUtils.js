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

/**
 * Returns "YYYY-MM-DDTHH:MM" in LOCAL time, for an <input type="datetime-local">.
 *
 * ⚠️  Never use `date.toISOString().slice(0, 16)` — that is UTC, so the input
 * shows the wrong clock time (and, saved back, shifts the record by the UTC
 * offset). Pair this with `new Date(inputValue).toISOString()` when saving so
 * the local time the user picked is stored as the correct instant.
 *
 * @param {Date} [date=new Date()]
 * @returns {string} e.g. "2026-10-26T14:05"
 */
export function localDateTimeInput(date = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `T${p(date.getHours())}:${p(date.getMinutes())}`
  )
}
