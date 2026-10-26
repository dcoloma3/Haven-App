import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'
import { localDateStr } from '../../lib/dateUtils'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay()) // back to Sunday
  return d
}
function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function fmtDay(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ResidentShowerSchedule({ residentId }) {
  const { communityId } = useCommunity()
  const { profile } = useProfile()
  const [schedule, setSchedule] = useState(null)   // null = none set
  const [doneDates, setDoneDates] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ days: [], time_of_day: 'AM', preferences: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const weekEnd = addDays(weekStart, 6)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sched }, { data: logs }] = await Promise.all([
      supabase.from('shower_schedules').select('*').eq('resident_id', residentId).maybeSingle(),
      supabase.from('shower_logs').select('shower_date')
        .eq('resident_id', residentId)
        .gte('shower_date', localDateStr(weekStart))
        .lte('shower_date', localDateStr(weekEnd)),
    ])
    setSchedule(sched ?? null)
    setDoneDates(new Set((logs ?? []).map(l => l.shower_date)))
    setLoading(false)
  }, [residentId, weekStart, weekEnd])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  function openEdit() {
    setForm({
      days: schedule?.days ?? [],
      time_of_day: schedule?.time_of_day ?? 'AM',
      preferences: schedule?.preferences ?? '',
    })
    setError('')
    setShowModal(true)
  }

  function toggleDay(d) {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort() }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('shower_schedules').upsert({
      resident_id: residentId,
      community_id: communityId,
      days: form.days,
      time_of_day: form.time_of_day,
      preferences: form.preferences.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'resident_id' })
    setSaving(false)
    if (err) { setError(err.message); return }
    setShowModal(false)
    load()
  }

  async function toggleDone(dateStr, period) {
    const isDone = doneDates.has(dateStr)
    // optimistic
    setDoneDates(prev => {
      const next = new Set(prev)
      isDone ? next.delete(dateStr) : next.add(dateStr)
      return next
    })
    if (isDone) {
      await supabase.from('shower_logs').delete().eq('resident_id', residentId).eq('shower_date', dateStr)
    } else {
      const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('shower_logs').insert({
        resident_id: residentId,
        community_id: communityId,
        shower_date: dateStr,
        period,
        completed_by_name: authorName || null,
        recorded_by: session?.user?.id ?? null,
      })
    }
  }

  const scheduledDays = schedule?.days ?? []
  const weekRows = scheduledDays.map(d => {
    const date = addDays(weekStart, d)
    return { d, date, dateStr: localDateStr(date) }
  })

  const isThisWeek = localDateStr(weekStart) === localDateStr(startOfWeek(new Date()))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Shower Schedule</h3>
        <button onClick={openEdit} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">
          {schedule ? 'Edit schedule' : 'Set schedule'}
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : !schedule || scheduledDays.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm font-medium">No shower schedule set</p>
          <p className="text-slate-400 text-xs mt-1">Use “Set schedule” to choose shower days</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          {/* Schedule summary */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-slate-800">
              {scheduledDays.map(d => DAY_LABELS[d]).join(', ')}
            </span>
            <span className="text-[10px] font-semibold bg-[#E6F1FB] text-[#185FA5] px-1.5 py-0.5 rounded-full">{schedule.time_of_day}</span>
          </div>
          {schedule.preferences && <p className="text-xs text-slate-500 mb-4"><span className="font-medium">Preferences:</span> {schedule.preferences}</p>}

          {/* Week check-off */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 mb-2">
            <button onClick={() => setWeekStart(w => addDays(w, -7))} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">← Prev</button>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {isThisWeek ? 'This week' : `${fmtDay(weekStart)} – ${fmtDay(weekEnd)}`}
            </span>
            <button onClick={() => setWeekStart(w => addDays(w, 7))} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">Next →</button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {weekRows.map(({ d, date, dateStr }) => {
              const done = doneDates.has(dateStr)
              return (
                <label key={d} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleDone(dateStr, schedule.time_of_day)}
                    className="w-4 h-4 accent-[#185FA5]"
                  />
                  <span className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{fmtDay(date)}</span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{schedule.time_of_day}</span>
                  {done && <span className="ml-auto text-xs text-emerald-600 font-medium">✓ Done</span>}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">Shower Schedule</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Shower days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((label, d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        form.days.includes(d)
                          ? 'bg-[#185FA5] text-white border-[#185FA5] font-medium'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time of day</label>
                <select className={inputCls} value={form.time_of_day} onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value }))}>
                  <option value="AM">AM (morning)</option>
                  <option value="PM">PM (evening)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferences</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={form.preferences} onChange={e => setForm(f => ({ ...f, preferences: e.target.value }))} placeholder="e.g. prefers warm water, 2-person assist, shower chair" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Saving…' : 'Save Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
