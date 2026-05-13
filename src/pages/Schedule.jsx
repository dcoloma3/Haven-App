import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { useCommunity } from '../context/CommunityContext'

// ── Color palette assigned to staff members by index ─────────────────────────

const PALETTE = [
  { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
  { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
  { bg: '#fce7f3', text: '#9d174d', dot: '#ec4899' },
  { bg: '#fed7aa', text: '#9a3412', dot: '#f97316' },
  { bg: '#ede9fe', text: '#5b21b6', dot: '#8b5cf6' },
  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
  { bg: '#cffafe', text: '#155e75', dot: '#06b6d4' },
  { bg: '#fae8ff', text: '#86198f', dot: '#d946ef' },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  const min = m ? `:${String(m).padStart(2, '0')}` : ''
  return `${hr}${min} ${ampm}`
}

function shortTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'p' : 'a'
  const hr = h % 12 || 12
  const min = m ? `:${String(m).padStart(2, '0')}` : ''
  return `${hr}${min}${ampm}`
}

function getWeekDays(date) {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getMonthGrid(date) {
  const y = date.getFullYear(), mo = date.getMonth()
  const firstDay = new Date(y, mo, 1).getDay()
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const grid = []
  for (let i = 0; i < firstDay; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(y, mo, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function getDateRange(view, date) {
  if (view === 'monthly') {
    const y = date.getFullYear(), mo = date.getMonth()
    return { start: toDateStr(new Date(y, mo, 1)), end: toDateStr(new Date(y, mo + 1, 0)) }
  }
  if (view === 'weekly') {
    const days = getWeekDays(date)
    return { start: toDateStr(days[0]), end: toDateStr(days[6]) }
  }
  const s = toDateStr(date)
  return { start: s, end: s }
}

function stepDate(view, date, dir) {
  const d = new Date(date)
  if (view === 'monthly') return new Date(d.getFullYear(), d.getMonth() + dir, 1)
  if (view === 'weekly') { d.setDate(d.getDate() + dir * 7); return d }
  d.setDate(d.getDate() + dir)
  return d
}

function navLabel(view, date) {
  if (view === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  if (view === 'weekly') {
    const days = getWeekDays(date)
    const s = days[0], e = days[6]
    if (s.getMonth() === e.getMonth()) {
      return `${s.toLocaleDateString('en-US', { month: 'long' })} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`
  }
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function groupByDate(shifts) {
  return shifts.reduce((acc, s) => {
    ;(acc[s.shift_date] ??= []).push(s)
    return acc
  }, {})
}

// ── Shift modal (add + edit) ──────────────────────────────────────────────────

function ShiftModal({ shift, defaultDate, staff, communityId, onClose, onSaved, onDeleted }) {
  const isEditing = !!shift
  const [form, setForm] = useState({
    staff_id:   shift?.staff_id   ?? '',
    shift_date: shift?.shift_date ?? defaultDate ?? toDateStr(new Date()),
    start_time: shift?.start_time?.slice(0, 5) ?? '',
    end_time:   shift?.end_time?.slice(0, 5)   ?? '',
    notes:      shift?.notes ?? '',
  })
  const [saving, setSaving]               = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.staff_id || !form.shift_date || !form.start_time || !form.end_time) {
      setError('Staff member, date, start time, and end time are required.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      staff_id:     form.staff_id,
      shift_date:   form.shift_date,
      start_time:   form.start_time,
      end_time:     form.end_time,
      notes:        form.notes || null,
      community_id: communityId,
    }
    let data, error
    if (isEditing) {
      ;({ data, error } = await supabase
        .from('shifts').update(payload).eq('id', shift.id)
        .select('*, profiles(id, full_name)').single())
    } else {
      ;({ data, error } = await supabase
        .from('shifts').insert([payload])
        .select('*, profiles(id, full_name)').single())
    }
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(data)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('shifts').delete().eq('id', shift.id)
    onDeleted(shift.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isEditing ? 'Edit Shift' : 'Add Shift'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Staff Member <span className="text-red-500">*</span>
            </label>
            <select className={inputCls} value={form.staff_id} onChange={e => set('staff_id', e.target.value)}>
              <option value="">Select staff member…</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input type="date" className={inputCls} value={form.shift_date} onChange={e => set('shift_date', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input type="time" className={inputCls} value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input type="time" className={inputCls} value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional…"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          {isEditing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Delete
            </button>
          )}
          {isEditing && confirmDelete && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Delete this shift?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-slate-400 hover:text-slate-600">
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Monthly view ──────────────────────────────────────────────────────────────

function MonthlyView({ date, shifts, colorMap, onAddShift, onEditShift }) {
  const grid = getMonthGrid(date)
  const todayStr = toDateStr(new Date())
  const byDate = groupByDate(shifts)

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-slate-200 rounded-b-xl overflow-hidden">
        {grid.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="border-b border-r border-slate-200 bg-slate-50 min-h-[110px]" />
          }
          const dateStr = toDateStr(day)
          const isToday = dateStr === todayStr
          const dayShifts = byDate[dateStr] ?? []
          const overflow = dayShifts.length - 3

          return (
            <div key={dateStr} className="border-b border-r border-slate-200 min-h-[110px] p-1.5 group">
              <div className="flex items-center justify-between mb-1">
                <span className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                  isToday ? 'bg-[#185FA5] text-white' : 'text-slate-600'
                }`}>
                  {day.getDate()}
                </span>
                <button
                  onClick={() => onAddShift(dateStr)}
                  className="text-slate-300 hover:text-[#185FA5] opacity-0 group-hover:opacity-100 transition-all text-base leading-none"
                  title="Add shift"
                >
                  +
                </button>
              </div>

              <div className="space-y-0.5">
                {dayShifts.slice(0, 3).map(s => {
                  const color = colorMap[s.staff_id] || PALETTE[0]
                  const firstName = s.profiles?.full_name?.split(' ')[0] ?? '—'
                  return (
                    <button
                      key={s.id}
                      onClick={e => { e.stopPropagation(); onEditShift(s) }}
                      style={{ backgroundColor: color.bg, color: color.text }}
                      className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate block"
                    >
                      {firstName} · {shortTime(s.start_time)}
                    </button>
                  )
                })}
                {overflow > 0 && (
                  <p className="text-xs text-slate-400 px-1">+{overflow} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Weekly view ───────────────────────────────────────────────────────────────

function WeeklyView({ date, shifts, colorMap, onAddShift, onEditShift }) {
  const days = getWeekDays(date)
  const todayStr = toDateStr(new Date())
  const byDate = groupByDate(shifts)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] grid grid-cols-7 gap-2">
        {days.map(day => {
          const dateStr = toDateStr(day)
          const isToday = dateStr === todayStr
          const dayShifts = byDate[dateStr] ?? []

          return (
            <div key={dateStr}>
              <button
                onClick={() => onAddShift(dateStr)}
                className={`w-full text-center py-2.5 mb-2 rounded-xl group transition-colors ${
                  isToday
                    ? 'bg-[#185FA5] text-white hover:bg-[#0C447C]'
                    : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <p className={`text-xs font-medium ${isToday ? 'text-white/70' : 'text-slate-400'}`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <p className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-slate-700'}`}>
                    {day.getDate()}
                  </p>
                  <span className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                    isToday ? 'text-white/70' : 'text-slate-400'
                  }`}>+</span>
                </div>
              </button>

              <div className="space-y-1.5">
                {dayShifts.map(s => {
                  const color = colorMap[s.staff_id] || PALETTE[0]
                  return (
                    <button
                      key={s.id}
                      onClick={() => onEditShift(s)}
                      style={{ backgroundColor: color.bg, color: color.text }}
                      className="w-full text-left rounded-lg p-2 text-xs hover:brightness-95 transition-all"
                    >
                      <p className="font-medium truncate">{s.profiles?.full_name || '—'}</p>
                      <p style={{ opacity: 0.7 }}>{shortTime(s.start_time)}–{shortTime(s.end_time)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Daily view ────────────────────────────────────────────────────────────────

function DailyView({ date, shifts, colorMap, onAddShift, onEditShift }) {
  const dateStr = toDateStr(date)
  const dayShifts = [...shifts]
    .filter(s => s.shift_date === dateStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button
          onClick={() => onAddShift(dateStr)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Shift
        </button>
      </div>

      {dayShifts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No shifts scheduled.</p>
          <button
            onClick={() => onAddShift(dateStr)}
            className="text-sm text-[#185FA5] hover:text-[#0C447C] mt-2 transition-colors"
          >
            + Add a shift
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayShifts.map(s => {
            const color = colorMap[s.staff_id] || PALETTE[0]
            return (
              <button
                key={s.id}
                onClick={() => onEditShift(s)}
                className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-[#378ADD] transition-all flex items-center gap-4"
              >
                <div
                  style={{ backgroundColor: color.dot }}
                  className="w-1.5 self-stretch rounded-full flex-shrink-0"
                />
                <div className="text-sm font-medium text-slate-600 flex-shrink-0 w-40">
                  {formatTime(s.start_time)} – {formatTime(s.end_time)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{s.profiles?.full_name || '—'}</p>
                  {s.notes && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.notes}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const VIEW_TABS = ['daily', 'weekly', 'monthly']

export default function Schedule() {
  const { communityId } = useCommunity()
  const [view, setView]               = useState('weekly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts]           = useState([])
  const [staff, setStaff]             = useState([])
  const [loadingShifts, setLoading]   = useState(true)
  const [modal, setModal]             = useState(null)

  // Load only staff who belong to this community
  useEffect(() => {
    if (!communityId) return
    // Step 1: get user_ids for this community
    supabase
      .from('community_members')
      .select('user_id')
      .eq('community_id', communityId)
      .then(async ({ data: members }) => {
        const userIds = (members ?? []).map(m => m.user_id)
        if (!userIds.length) { setStaff([]); return }
        // Step 2: fetch profiles for those user_ids only
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, user_id')
          .in('user_id', userIds)
          .order('full_name')
        setStaff(profiles ?? [])
      })
  }, [communityId])

  // Load only shifts for this community
  useEffect(() => {
    if (!communityId) return
    setLoading(true)
    const { start, end } = getDateRange(view, currentDate)
    supabase
      .from('shifts')
      .select('*, profiles(id, full_name)')
      .eq('community_id', communityId)
      .gte('shift_date', start)
      .lte('shift_date', end)
      .order('shift_date')
      .order('start_time')
      .then(({ data }) => { setShifts(data ?? []); setLoading(false) })
  }, [view, currentDate, communityId])

  const colorMap = useMemo(() => {
    const map = {}
    staff.forEach((s, i) => { map[s.id] = PALETTE[i % PALETTE.length] })
    return map
  }, [staff])

  function navigate(dir) {
    setCurrentDate(prev => stepDate(view, prev, dir))
  }

  function handleSaved(saved) {
    setShifts(prev => {
      const next = prev.find(s => s.id === saved.id)
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [...prev, saved]
      return next.sort((a, b) =>
        a.shift_date.localeCompare(b.shift_date) || a.start_time.localeCompare(b.start_time)
      )
    })
    setModal(null)
  }

  function handleDeleted(id) {
    setShifts(prev => prev.filter(s => s.id !== id))
    setModal(null)
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Schedule</h1>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {VIEW_TABS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                view === v
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 text-lg leading-none transition-colors"
        >
          ‹
        </button>

        <h2 className="text-base font-semibold text-slate-800 flex-1">{navLabel(view, currentDate)}</h2>

        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-xs font-medium text-[#185FA5] border border-[#185FA5]/30 rounded-lg px-2.5 py-1 hover:bg-[#E6F1FB] transition-colors"
        >
          Today
        </button>

        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 text-lg leading-none transition-colors"
        >
          ›
        </button>
      </div>

      {/* Views */}
      {loadingShifts ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <>
          {view === 'monthly' && (
            <MonthlyView
              date={currentDate}
              shifts={shifts}
              colorMap={colorMap}
              onAddShift={date => setModal({ type: 'add', date })}
              onEditShift={shift => setModal({ type: 'edit', shift })}
            />
          )}
          {view === 'weekly' && (
            <WeeklyView
              date={currentDate}
              shifts={shifts}
              colorMap={colorMap}
              onAddShift={date => setModal({ type: 'add', date })}
              onEditShift={shift => setModal({ type: 'edit', shift })}
            />
          )}
          {view === 'daily' && (
            <DailyView
              date={currentDate}
              shifts={shifts}
              colorMap={colorMap}
              onAddShift={date => setModal({ type: 'add', date })}
              onEditShift={shift => setModal({ type: 'edit', shift })}
            />
          )}
        </>
      )}

      {/* Staff color legend */}
      {staff.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-x-4 gap-y-2">
          {staff.map(s => {
            const color = colorMap[s.id] || PALETTE[0]
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <div style={{ backgroundColor: color.dot }} className="w-2.5 h-2.5 rounded-full flex-shrink-0" />
                <span className="text-xs text-slate-600">{s.full_name || s.email}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Shift modal */}
      {modal && (
        <ShiftModal
          shift={modal.type === 'edit' ? modal.shift : undefined}
          defaultDate={modal.type === 'add' ? modal.date : undefined}
          staff={staff}
          communityId={communityId}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
