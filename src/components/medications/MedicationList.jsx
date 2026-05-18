/*
-- Run in Supabase SQL editor to enable PRN medications:
alter table medications add column if not exists indication text;
alter table medications add column if not exists min_interval_hours integer;
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminKey, isMedDueOnDate } from '../../lib/medStatus'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function getTodayStr() { return new Date().toISOString().split('T')[0] }

function fmt12(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function shortDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

const FREQ_TYPES = [
  { value: 'one_time',      label: 'One Time' },
  { value: 'daily',         label: 'Every Day' },
  { value: 'specific_days', label: 'Specific Days' },
  { value: 'every_x_days',  label: 'Every X Days' },
  { value: 'prn',           label: 'As Needed (PRN)' },
]

function describeFrequency(med) {
  const type = med.frequency_type
  if (!type || type === 'daily') return 'Every day'
  if (type === 'one_time') return 'One time'
  if (type === 'specific_days') {
    if (!med.frequency_days?.length) return 'Specific days'
    return med.frequency_days.map(d => DAY_LABELS[d] ?? d).join(', ')
  }
  if (type === 'every_x_days') {
    const n = med.frequency_interval
    return n ? `Every ${n} day${n !== 1 ? 's' : ''}` : 'Every X days'
  }
  return '—'
}

const EMPTY_FORM = {
  medication_name: '',
  dose: '',
  frequency: '',
  notes: '',
  scheduled_times: [],
  frequency_type: 'daily',
  frequency_days: [],
  frequency_interval: 2,
  start_date: '',
  end_date: '',
  indication: '',
  min_interval_hours: '',
}

// ─── Medication Modal (Add / Edit) ────────────────────────────────────────────

function MedicationModal({ residentId, medication, onClose, onSaved }) {
  const isEdit = !!medication
  const [form, setForm] = useState(isEdit ? { ...medication, frequency_days: medication.frequency_days ?? [], frequency_interval: medication.frequency_interval ?? 2 } : EMPTY_FORM)
  const [newTime, setNewTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function setFreqType(type) {
    setForm(f => ({
      ...f,
      frequency_type: type,
      start_date: type === 'one_time' && !f.start_date ? getTodayStr() : f.start_date,
    }))
  }

  function toggleDay(day) {
    setForm(f => {
      const days = f.frequency_days ?? []
      return { ...f, frequency_days: days.includes(day) ? days.filter(d => d !== day) : [...days, day] }
    })
  }

  function addTime() {
    if (!newTime || form.scheduled_times?.includes(newTime)) return
    setForm(f => ({ ...f, scheduled_times: [...(f.scheduled_times ?? []), newTime].sort() }))
    setNewTime('')
  }

  function removeTime(t) {
    setForm(f => ({ ...f, scheduled_times: (f.scheduled_times ?? []).filter(x => x !== t) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.medication_name?.trim()) { setError('Medication name is required.'); return }
    if (form.frequency_type === 'specific_days' && !form.frequency_days?.length) {
      setError('Select at least one day.'); return
    }
    if (form.frequency_type === 'every_x_days' && (!form.frequency_interval || form.frequency_interval < 1)) {
      setError('Enter a valid interval.'); return
    }

    const finalTimes = newTime && !(form.scheduled_times ?? []).includes(newTime)
      ? [...(form.scheduled_times ?? []), newTime].sort()
      : (form.scheduled_times ?? [])

    setSaving(true)
    setError('')

    const payload = {
      medication_name: form.medication_name,
      dose: form.dose || null,
      frequency: form.frequency || null,
      notes: form.notes || null,
      scheduled_times: freqType === 'prn' ? [] : finalTimes,
      frequency_type: form.frequency_type || 'daily',
      frequency_days: form.frequency_type === 'specific_days' ? (form.frequency_days ?? []) : [],
      frequency_interval: form.frequency_type === 'every_x_days' ? (parseInt(form.frequency_interval) || null) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      indication: form.frequency_type === 'prn' ? (form.indication?.trim() || null) : null,
      min_interval_hours: form.frequency_type === 'prn' && form.min_interval_hours ? parseInt(form.min_interval_hours) : null,
    }

    let data, err
    if (isEdit) {
      ;({ data, error: err } = await supabase.from('medications').update(payload).eq('id', medication.id).select().single())
    } else {
      ;({ data, error: err } = await supabase.from('medications').insert([{ ...payload, resident_id: residentId }]).select().single())
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data)
  }

  const freqType = form.frequency_type || 'daily'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Edit Medication' : 'Add Medication'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medication Name <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={form.medication_name ?? ''} onChange={e => set('medication_name', e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dose</label>
            <input className={inputCls} value={form.dose ?? ''} onChange={e => set('dose', e.target.value)} placeholder="e.g. 500mg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQ_TYPES.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFreqType(opt.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors text-left ${
                    freqType === opt.value
                      ? 'bg-[#185FA5] text-white border-[#185FA5] font-medium'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-[#185FA5]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {freqType === 'specific_days' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-colors ${
                      (form.frequency_days ?? []).includes(day)
                        ? 'bg-[#185FA5] text-white border-[#185FA5]'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-[#185FA5]'
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            )}

            {freqType === 'every_x_days' && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-slate-600">Every</span>
                <input
                  type="number"
                  min="1"
                  value={form.frequency_interval ?? 2}
                  onChange={e => set('frequency_interval', e.target.value)}
                  className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                />
                <span className="text-sm text-slate-600">days</span>
              </div>
            )}

            {freqType === 'one_time' && (
              <p className="text-xs text-slate-400 mt-2">Will appear on the Dispense tab only on the start date below.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date {freqType === 'one_time' && <span className="text-red-500">*</span>}
              </label>
              <input type="date" className={inputCls} value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" className={inputCls} value={form.end_date ?? ''} min={form.start_date || undefined} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          {freqType !== 'prn' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Times</label>

              {/* Quick-pick preset times */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  ['06:00', '6 AM'], ['08:00', '8 AM'], ['09:00', '9 AM'],
                  ['12:00', '12 PM'], ['14:00', '2 PM'], ['16:00', '4 PM'],
                  ['18:00', '6 PM'], ['20:00', '8 PM'], ['21:00', '9 PM'], ['22:00', '10 PM'],
                ].map(([val, label]) => {
                  const already = (form.scheduled_times ?? []).includes(val)
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => already ? removeTime(val) : (setForm(f => ({ ...f, scheduled_times: [...(f.scheduled_times ?? []), val].sort() })))}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                        already
                          ? 'bg-[#185FA5] text-white border-[#185FA5]'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-[#185FA5] hover:text-[#185FA5]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Custom time picker */}
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTime() } }}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={addTime}
                  disabled={!newTime}
                  className="px-3 py-2 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
                >
                  + Add
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Tap preset times above or enter a custom time — add as many as needed.</p>

              {/* Selected times */}
              {(form.scheduled_times ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.scheduled_times.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 bg-[#E6F1FB] text-[#185FA5] text-xs font-semibold px-2.5 py-1.5 rounded-full">
                      {fmt12(t)}
                      <button type="button" onClick={() => removeTime(t)} className="hover:text-[#0C447C] leading-none ml-0.5">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {freqType === 'prn' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Indication <span className="text-slate-400 font-normal">(what it's for)</span></label>
                <input
                  className={inputCls}
                  value={form.indication ?? ''}
                  onChange={e => set('indication', e.target.value)}
                  placeholder="e.g. Pain, Anxiety, Nausea, Agitation, Insomnia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Minimum interval between doses <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                    value={form.min_interval_hours ?? ''}
                    onChange={e => set('min_interval_hours', e.target.value)}
                    placeholder="—"
                  />
                  <span className="text-sm text-slate-600">hours</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Staff will see a warning if given sooner than this.</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Special Instructions</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="e.g. Take with food, avoid grapefruit, monitor BP…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Admin Status Badge ───────────────────────────────────────────────────────

function AdminStatusBadge({ status }) {
  if (!status) return null
  if (status === 'given') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Given</span>
  if (status === 'refused') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Refused</span>
  if (status === 'held') return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Held</span>
  return null
}

// ─── 3-State Dose Row ─────────────────────────────────────────────────────────

function DoseRow({ med, time, record, toggling, onSet }) {
  const [noteValue, setNoteValue] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(null) // 'refused' | 'held' | null
  const [savingNote, setSavingNote] = useState(false)

  const status = record?.admin_status ?? null
  const key = adminKey(med.id, time)
  const isTogg = toggling.has(key)

  async function handleAction(newStatus) {
    // If clicking the already-active status, remove the record
    if (status === newStatus) {
      onSet(med, time, null, null)
      setShowNoteInput(null)
      return
    }
    // For given: save immediately, no note needed
    if (newStatus === 'given') {
      onSet(med, time, newStatus, null)
      setShowNoteInput(null)
    } else {
      // refused or held: show inline note input
      setShowNoteInput(newStatus)
    }
  }

  async function handleSaveNote() {
    setSavingNote(true)
    await onSet(med, time, showNoteInput, noteValue.trim() || null)
    setSavingNote(false)
    setShowNoteInput(null)
    setNoteValue('')
  }

  function handleCancelNote() {
    setShowNoteInput(null)
    setNoteValue('')
  }

  const btnBase = 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all'

  return (
    <div className={`px-5 py-3.5 transition-colors ${status === 'given' ? 'bg-emerald-50/50' : status === 'refused' ? 'bg-red-50/30' : status === 'held' ? 'bg-amber-50/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${status === 'given' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {med.medication_name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {[med.dose, fmt12(time)].filter(Boolean).join(' · ')}
          </p>
          {status === 'given' && record?.administered_at && (
            <p className="text-xs text-emerald-600 mt-0.5">
              Given at {new Date(record.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          {status && <div className="mt-1"><AdminStatusBadge status={status} /></div>}
          {record?.admin_notes && (
            <p className="text-xs text-slate-400 mt-0.5 italic">{record.admin_notes}</p>
          )}
        </div>

        {/* 3-state buttons */}
        <div className={`flex gap-1.5 flex-shrink-0 ${isTogg ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Given */}
          <button
            onClick={() => handleAction('given')}
            title="Mark Given"
            className={`${btnBase} ${
              status === 'given'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="hidden sm:inline">Given</span>
          </button>

          {/* Refused */}
          <button
            onClick={() => handleAction('refused')}
            title="Mark Refused"
            className={`${btnBase} ${
              status === 'refused'
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-slate-200 text-slate-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span className="hidden sm:inline">Refused</span>
          </button>

          {/* Held */}
          <button
            onClick={() => handleAction('held')}
            title="Mark Held"
            className={`${btnBase} ${
              status === 'held'
                ? 'bg-amber-500 border-amber-500 text-white'
                : 'border-slate-200 text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
            </svg>
            <span className="hidden sm:inline">Held</span>
          </button>
        </div>
      </div>

      {/* Inline note input for refused/held */}
      {showNoteInput && (
        <div className="mt-2.5 pl-0">
          <p className="text-xs text-slate-500 mb-1.5 font-medium">
            {showNoteInput === 'refused' ? 'Reason refused' : 'Reason held'} (optional)
          </p>
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={noteValue}
              onChange={e => setNoteValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveNote() }}
              placeholder="Add a note…"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              autoFocus
            />
            <button
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {savingNote ? '…' : 'Save'}
            </button>
            <button
              onClick={handleCancelNote}
              className="border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Today's Medications Section ─────────────────────────────────────────────

function TodayMedications({ residentId, medications, onStatusChange }) {
  const [administered, setAdministered] = useState(new Map())
  const [toggling, setToggling] = useState(new Set())
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  // Live date — updates at midnight so overnight staff always see the correct day
  const [todayStr, setTodayStr] = useState(getTodayStr)
  useEffect(() => {
    const id = setInterval(() => {
      const d = getTodayStr()
      setTodayStr(prev => prev !== d ? d : prev)
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const todayMeds = medications.filter(m => isMedDueOnDate(m, todayStr))

  useEffect(() => {
    if (todayMeds.length === 0) { setLoadingAdmins(false); return }
    supabase
      .from('medication_administrations')
      .select('*')
      .eq('resident_id', residentId)
      .eq('administered_date', todayStr)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
        setLoadingAdmins(false)
      })
  }, [residentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle set/update/delete of a dose record
  async function handleSet(med, time, newStatus, note) {
    const key = adminKey(med.id, time)
    if (toggling.has(key)) return
    setToggling(prev => new Set(prev).add(key))

    if (newStatus === null) {
      // Remove the record
      const record = administered.get(key)
      if (record) {
        await supabase.from('medication_administrations').delete().eq('id', record.id)
      }
      setAdministered(prev => { const n = new Map(prev); n.delete(key); return n })
    } else {
      const existingRecord = administered.get(key)
      const { data: { session } } = await supabase.auth.getSession()
      const payload = {
        medication_id: med.id,
        resident_id: residentId,
        scheduled_time: time,
        administered_date: todayStr,
        administered_by: session?.user?.id ?? null,
        admin_status: newStatus,
        admin_notes: note ?? null,
      }

      if (existingRecord) {
        // Update existing
        const { data } = await supabase
          .from('medication_administrations')
          .update({ admin_status: newStatus, admin_notes: note ?? null })
          .eq('id', existingRecord.id)
          .select()
          .single()
        if (data) {
          setAdministered(prev => { const n = new Map(prev); n.set(key, data); return n })
        }
      } else {
        // Insert new
        const tempRecord = { ...payload, id: 'temp' }
        setAdministered(prev => { const n = new Map(prev); n.set(key, tempRecord); return n })
        const { data } = await supabase
          .from('medication_administrations')
          .insert([payload])
          .select()
          .single()
        if (data) {
          setAdministered(prev => { const n = new Map(prev); n.set(key, data); return n })
        }
      }
    }

    setToggling(prev => { const n = new Set(prev); n.delete(key); return n })
    if (onStatusChange) onStatusChange()
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Flatten to time-sorted rows
  const rows = []
  todayMeds.forEach(med => {
    ;(med.scheduled_times ?? []).forEach(time => {
      rows.push({ med, time })
    })
  })
  rows.sort((a, b) => a.time.localeCompare(b.time))

  const totalDoses = rows.length
  // Count as documented if any status is present (given, refused, held)
  const documentedDoses = rows.filter(({ med, time }) => administered.has(adminKey(med.id, time))).length

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Today's Medications</h2>
          <p className="text-xs text-slate-400 mt-0.5">{todayLabel}</p>
        </div>
        {totalDoses > 0 && !loadingAdmins && (
          <span className={`text-sm font-semibold flex-shrink-0 mt-0.5 ${documentedDoses === totalDoses ? 'text-emerald-600' : documentedDoses > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {documentedDoses}/{totalDoses} documented
          </span>
        )}
      </div>

      {loadingAdmins && <p className="text-slate-400 text-sm px-5 py-4">Loading…</p>}

      {!loadingAdmins && todayMeds.length === 0 && (
        <p className="text-sm text-slate-400 px-5 py-4">No medications scheduled for today.</p>
      )}

      {!loadingAdmins && rows.length > 0 && (
        <div className="divide-y divide-slate-100">
          {rows.map(({ med, time }) => {
            const key = adminKey(med.id, time)
            const record = administered.get(key) ?? null
            return (
              <DoseRow
                key={key}
                med={med}
                time={time}
                record={record}
                toggling={toggling}
                onSet={handleSet}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── PRN / As-Needed Medications Section ─────────────────────────────────────

function PRNMedications({ residentId, medications }) {
  const prnMeds = medications.filter(m => m.frequency_type === 'prn')

  const [todayDoses, setTodayDoses] = useState([]) // array of medication_administrations records
  const [loadingDoses, setLoadingDoses] = useState(true)
  const [givingId, setGivingId] = useState(null) // which med has "Give Now" open
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  async function loadDoses() {
    const prnNames = prnMeds.map(m => m.medication_name)
    const { data } = await supabase
      .from('prn_administrations')
      .select('*')
      .eq('resident_id', residentId)
      .gte('administered_at', `${todayStr}T00:00:00`)
      .lte('administered_at', `${todayStr}T23:59:59`)
      .order('administered_at', { ascending: false })
    setTodayDoses(data ?? [])
    setLoadingDoses(false)
  }

  useEffect(() => {
    if (prnMeds.length === 0) { setLoadingDoses(false); return }
    loadDoses()
  }, [residentId, prnMeds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGiveNow(med) {
    if (!reason.trim()) { setSaveError('Please enter a reason.'); return }
    setSaving(true)
    setSaveError('')

    // Use current HH:MM as the scheduled_time to avoid unique constraint issues
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const timeKey = `${hh}:${mm}`

    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('prn_administrations')
      .insert([{
        medication_name: med.medication_name,
        dose: med.dose ?? null,
        resident_id: residentId,
        community_id: med.community_id,
        administered_at: now.toISOString(),
        administered_by: session?.user?.id ?? null,
        reason: reason.trim() || 'PRN dose administered',
        notes: null,
      }])
      .select()
      .single()

    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setTodayDoses(prev => [data, ...prev])
    setGivingId(null)
    setReason('')
  }

  if (prnMeds.length === 0) return null

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">PRN / As Needed</h2>
        <p className="text-xs text-slate-400 mt-0.5">Given on demand — tap Give Now and record the reason</p>
      </div>

      {loadingDoses && <p className="text-slate-400 text-sm px-5 py-4">Loading…</p>}

      {!loadingDoses && (
        <div className="divide-y divide-slate-100">
          {prnMeds.map(med => {
            const medDoses = todayDoses.filter(d => d.medication_name === med.medication_name)
            const lastDose = medDoses[0] ?? null
            const isGiving = givingId === med.id

            // Check min interval warning
            let intervalWarning = null
            if (lastDose && med.min_interval_hours) {
              const lastAt = new Date(lastDose.administered_at)
              const hoursAgo = (Date.now() - lastAt.getTime()) / 3600000
              if (hoursAgo < med.min_interval_hours) {
                const remaining = Math.ceil(med.min_interval_hours - hoursAgo)
                intervalWarning = `Min interval: ${remaining}h remaining`
              }
            }

            return (
              <div key={med.id} className="px-5 py-4">
                {/* Med header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{med.medication_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      {med.dose && <span className="text-xs text-slate-500">{med.dose}</span>}
                      {med.indication && (
                        <>
                          {med.dose && <span className="text-xs text-slate-300">·</span>}
                          <span className="text-xs text-slate-500">{med.indication}</span>
                        </>
                      )}
                    </div>
                    {intervalWarning && (
                      <p className="text-xs text-amber-600 font-medium mt-1">⚠ {intervalWarning}</p>
                    )}
                    {/* Today's dose history */}
                    {medDoses.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {medDoses.map(dose => (
                          <div key={dose.id} className="flex items-start gap-1.5">
                            <svg className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <p className="text-xs text-emerald-700">
                              Given at {new Date(dose.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {dose.notes && <span className="text-slate-500"> · {dose.notes}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {medDoses.length === 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">Not given today</p>
                    )}
                  </div>

                  {!isGiving && (
                    <button
                      onClick={() => { setGivingId(med.id); setReason(''); setSaveError('') }}
                      className="flex-shrink-0 bg-[#042C53] hover:bg-[#0B3D6E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Give Now
                    </button>
                  )}
                </div>

                {/* Inline Give Now form */}
                {isGiving && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Reason given <span className="text-red-500">*</span></p>
                    <input
                      autoFocus
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleGiveNow(med) }}
                      placeholder={med.indication ? `e.g. ${med.indication} — describe severity` : 'e.g. Patient reported pain 6/10'}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent mb-2"
                    />
                    {saveError && <p className="text-xs text-red-600 mb-2">{saveError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setGivingId(null); setReason(''); setSaveError('') }}
                        className="flex-1 border border-slate-300 text-slate-600 text-xs font-medium py-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleGiveNow(med)}
                        disabled={saving || !reason.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        {saving ? 'Recording…' : 'Record Administration'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main MedicationList ──────────────────────────────────────────────────────

export default function MedicationList({ residentId, onMedStatusChange }) {
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase
      .from('medications')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at')
      .then(({ data }) => { setMedications(data ?? []); setLoading(false) })
  }, [residentId])

  async function handleDelete(id) {
    await supabase.from('medications').delete().eq('id', id)
    setMedications(prev => prev.filter(m => m.id !== id))
  }

  function handleSaved(data) {
    setMedications(prev => {
      const idx = prev.findIndex(m => m.id === data.id)
      if (idx !== -1) { const next = [...prev]; next[idx] = data; return next }
      return [...prev, data]
    })
    setShowAdd(false)
    setEditing(null)
  }

  return (
    <div>
      {/* ── Today's Dispense Section ── */}
      {!loading && (
        <TodayMedications
          residentId={residentId}
          medications={medications.filter(m => m.frequency_type !== 'prn')}
          onStatusChange={onMedStatusChange}
        />
      )}

      {/* ── PRN / As-Needed Section ── */}
      {!loading && (
        <PRNMedications
          residentId={residentId}
          medications={medications}
        />
      )}

      {/* ── Manage Medications ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-medium text-slate-700">Manage Medications</h2>
          <button onClick={() => setShowAdd(true)} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">+ Add</button>
        </div>

        {loading && <p className="text-slate-400 text-sm">Loading…</p>}
        {!loading && medications.length === 0 && <p className="text-sm text-slate-400">No medications listed.</p>}

        {!loading && medications.length > 0 && (
          <div className="divide-y divide-slate-100">
            {medications.map(med => {
              const dateRange = [shortDate(med.start_date), shortDate(med.end_date)].filter(Boolean)
              return (
                <div key={med.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{med.medication_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {[med.dose, describeFrequency(med)].filter(Boolean).join(' · ')}
                      </p>
                      {dateRange.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {med.start_date && med.end_date
                            ? `${shortDate(med.start_date)} – ${shortDate(med.end_date)}`
                            : med.start_date
                              ? `From ${shortDate(med.start_date)}`
                              : `Until ${shortDate(med.end_date)}`}
                        </p>
                      )}
                      {med.scheduled_times?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {med.scheduled_times.map(t => (
                            <span key={t} className="inline-block bg-[#E6F1FB] text-[#185FA5] text-xs font-medium px-2 py-0.5 rounded-full">
                              {fmt12(t)}
                            </span>
                          ))}
                        </div>
                      )}
                      {med.frequency_type === 'prn' && med.indication && (
                        <p className="text-xs text-violet-600 mt-1">PRN · {med.indication}</p>
                      )}
                      {med.frequency && <p className="text-xs text-slate-500 mt-1.5">{med.frequency}</p>}
                      {med.notes && (
                        <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          <p className="text-xs text-amber-800 leading-relaxed font-medium">{med.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                      <button onClick={() => setEditing(med)} className="text-xs text-[#185FA5] hover:text-[#0C447C] transition-colors">Edit</button>
                      <button onClick={() => handleDelete(med.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && <MedicationModal residentId={residentId} onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <MedicationModal medication={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
