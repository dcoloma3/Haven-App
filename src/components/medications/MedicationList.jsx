/*
-- Run in Supabase SQL editor to enable PRN medications:
alter table medications add column if not exists indication text;
alter table medications add column if not exists min_interval_hours integer;
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { adminKey, isMedDueOnDate } from '../../lib/medStatus'
import { generateLIC622PDF } from '../../lib/lic622PDF'
import { generateMarGridPDF } from '../../lib/marGridPDF'
import { localDateStr } from '../../lib/dateUtils'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function getTodayStr() { return localDateStr() }

function ChevronIcon({ open }) {
  return (
    <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

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
  route: '',
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

const ROUTES = [
  { value: '',            label: 'Select route…' },
  { value: 'Oral',        label: 'Oral (by mouth)' },
  { value: 'Sublingual',  label: 'Sublingual (under tongue)' },
  { value: 'Topical',     label: 'Topical (skin)' },
  { value: 'Transdermal', label: 'Transdermal (patch)' },
  { value: 'Inhaled',     label: 'Inhaled' },
  { value: 'Nasal',       label: 'Nasal' },
  { value: 'Ophthalmic',  label: 'Ophthalmic (eye)' },
  { value: 'Otic',        label: 'Otic (ear)' },
  { value: 'Rectal',      label: 'Rectal' },
  { value: 'Injection',   label: 'Injection' },
  { value: 'Other',       label: 'Other' },
]

// ─── Medication Modal (Add / Edit) ────────────────────────────────────────────

function MedicationModal({ residentId, communityId, medication, onClose, onSaved }) {
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

    const freqType = form.frequency_type || 'daily'

    const finalTimes = newTime && !(form.scheduled_times ?? []).includes(newTime)
      ? [...(form.scheduled_times ?? []), newTime].sort()
      : (form.scheduled_times ?? [])

    if (freqType !== 'prn' && finalTimes.length === 0) {
      setError('Add at least one scheduled time so this medication appears in the Dispense tab.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      medication_name: form.medication_name,
      dose: form.dose || null,
      route: form.route || null,
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
      ;({ data, error: err } = await supabase.from('medications').insert([{ ...payload, resident_id: residentId, community_id: communityId }]).select().single())
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data)
  }

  const freqType = form.frequency_type || 'daily' // used in render for conditional UI

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dose</label>
              <input className={inputCls} value={form.dose ?? ''} onChange={e => set('dose', e.target.value)} placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Route</label>
              <select className={inputCls} value={form.route ?? ''} onChange={e => set('route', e.target.value)}>
                {ROUTES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Times <span className="text-red-500">*</span></label>

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

// eslint-disable-next-line no-unused-vars
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

// Given a time string 'HH:MM' and a list of slot strings, return the nearest slot
function findNearestSlot(timeStr, slots) {
  if (!slots.length) return null
  const [h, m] = timeStr.split(':').map(Number)
  const adminMin = h * 60 + m
  let best = null, bestDiff = Infinity
  slots.forEach(slot => {
    const [sh, sm] = slot.split(':').map(Number)
    const diff = Math.abs(adminMin - sh * 60 - sm)
    if (diff < bestDiff) { bestDiff = diff; best = slot }
  })
  return best
}

// ─── Today's Medications Section (read-only status view) ─────────────────────

function TodayMedications({ residentId, medications }) {
  const [open, setOpen] = useState(false)
  const [administered, setAdministered] = useState(new Map())
  const [prnAdmins, setPrnAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
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
    const fetchAll = async () => {
      const [adminRes, prnRes] = await Promise.all([
        todayMeds.length > 0
          ? supabase.from('medication_administrations').select('*').eq('resident_id', residentId).eq('administered_date', todayStr)
          : Promise.resolve({ data: [] }),
        supabase.from('prn_administrations').select('*').eq('resident_id', residentId)
          .gte('administered_at', `${todayStr}T00:00:00`)
          .lte('administered_at', `${todayStr}T23:59:59`)
          .order('administered_at'),
      ])
      const map = new Map()
      ;(adminRes.data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
      setAdministered(map)
      setPrnAdmins(prnRes.data ?? [])
      setLoadingAdmins(false)
    }
    fetchAll()
  }, [residentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flatten routine meds to time-sorted rows
  const routineRows = []
  todayMeds.forEach(med => {
    ;(med.scheduled_times ?? []).forEach(time => {
      routineRows.push({ isPrn: false, med, time, key: adminKey(med.id, time) })
    })
  })
  routineRows.sort((a, b) => a.time.localeCompare(b.time))

  // Build slot list from routine rows, assign PRN admins to nearest slot
  const availableSlots = [...new Set(routineRows.map(r => r.time))]
  const prnRows = prnAdmins.map(admin => {
    const d = new Date(admin.administered_at)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const adminTimeStr = `${hh}:${mm}`
    const slot = availableSlots.length ? findNearestSlot(adminTimeStr, availableSlots) : adminTimeStr
    return { isPrn: true, admin, time: slot, key: `prn::${admin.id}` }
  })

  // Merge and sort all rows by assigned time
  const allRows = [...routineRows, ...prnRows].sort((a, b) => a.time.localeCompare(b.time))

  const totalDoses = routineRows.length
  const documentedDoses = routineRows.filter(r => administered.has(r.key)).length

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden mb-4 opacity-80">
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="font-medium text-slate-500 text-sm">Today's Status</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Use the Dispense tab to log doses</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalDoses > 0 && !loadingAdmins && (
            <span className={`text-xs font-semibold ${documentedDoses === totalDoses ? 'text-emerald-600' : documentedDoses > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {documentedDoses}/{totalDoses}
            </span>
          )}
          {prnAdmins.length > 0 && !loadingAdmins && (
            <span className="text-xs font-semibold text-violet-500">{prnAdmins.length} PRN</span>
          )}
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <>
          {loadingAdmins && <p className="text-slate-400 text-sm px-5 py-4 border-t border-slate-100">Loading…</p>}

          {!loadingAdmins && allRows.length === 0 && (
            <p className="text-sm text-slate-400 px-5 py-4 border-t border-slate-100">No medications scheduled for today.</p>
          )}

          {!loadingAdmins && allRows.length > 0 && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {allRows.map(row => {
                if (row.isPrn) {
                  const { admin } = row
                  return (
                    <div key={row.key} className="px-5 py-3 bg-violet-50/40 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">PRN</span>
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {admin.medication_name}{admin.dose ? ` · ${admin.dose}` : ''}
                          </p>
                        </div>
                        <p className="text-xs text-violet-600 mt-0.5">
                          Given at {new Date(admin.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {admin.reason ? ` · ${admin.reason}` : ''}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 flex-shrink-0">Given</span>
                    </div>
                  )
                }

                const { med, time, key } = row
                const record = administered.get(key) ?? null
                const status = record?.admin_status ?? null
                return (
                  <div key={key} className={`px-5 py-3 flex items-center justify-between gap-3 ${status === 'given' ? 'bg-emerald-50/40' : status === 'refused' ? 'bg-red-50/30' : status === 'held' ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${status === 'given' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
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
                      {record?.admin_notes && (
                        <p className="text-xs text-slate-400 mt-0.5 italic">{record.admin_notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {status === 'given' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Given</span>}
                      {status === 'refused' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Refused</span>}
                      {status === 'held' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Held</span>}
                      {!status && <span className="text-xs text-slate-300">Pending</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── PRN / As-Needed Medications Section ─────────────────────────────────────

function PRNMedications({ residentId, medications }) {
  const prnMeds = medications.filter(m => m.frequency_type === 'prn')

  const [open, setOpen] = useState(true)
  const [todayDoses, setTodayDoses] = useState([]) // array of medication_administrations records
  const [loadingDoses, setLoadingDoses] = useState(true)
  const [givingId, setGivingId] = useState(null) // which med has "Give Now" open
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const todayStr = localDateStr()

  async function loadDoses() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prnMeds.length === 0) { setLoadingDoses(false); return }
    loadDoses()
  }, [residentId, prnMeds.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGiveNow(med) {
    if (!reason.trim()) { setSaveError('Please enter a reason.'); return }
    setSaving(true)
    setSaveError('')

    // Use current HH:MM as the scheduled_time to avoid unique constraint issues
    const now = new Date()
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
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="font-semibold text-slate-800">PRN / As Needed</h2>
          <p className="text-xs text-slate-400 mt-0.5">Given on demand — tap Give Now and record the reason</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">{prnMeds.length} med{prnMeds.length !== 1 ? 's' : ''}</span>
          <ChevronIcon open={open} />
        </div>
      </button>

      {open && (
        <>
          {loadingDoses && <p className="text-slate-400 text-sm px-5 py-4 border-t border-slate-100">Loading…</p>}

          {!loadingDoses && (
            <div className="divide-y divide-slate-100 border-t border-slate-100">
              {prnMeds.map(med => {
            const medDoses = todayDoses.filter(d => d.medication_name === med.medication_name)
            const lastDose = medDoses[0] ?? null
            const isGiving = givingId === med.id

            // Check min interval warning
            let intervalWarning = null
            if (lastDose && med.min_interval_hours) {
              const lastAt = new Date(lastDose.administered_at)
              // eslint-disable-next-line react-hooks/purity
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
                    {med.notes && (
                      <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">{med.notes}</p>
                      </div>
                    )}
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
        </>
      )}
    </div>
  )
}

// ─── Main MedicationList ──────────────────────────────────────────────────────

export default function MedicationList({ residentId, onMedStatusChange: _onMedStatusChange }) {
  const { communityId } = useCommunity()
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [openManage, setOpenManage] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showLIC622, setShowLIC622] = useState(false)
  const [lic622Generating, setLic622Generating] = useState(false)
  const [lic622Error, setLic622Error] = useState('')
  const today = new Date()
  const [showMAR, setShowMAR] = useState(false)
  const [marGenerating, setMarGenerating] = useState(false)
  const [marError, setMarError] = useState('')
  const [marMonth, setMarMonth] = useState(today.getMonth() + 1)
  const [marYear, setMarYear] = useState(today.getFullYear())

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

  async function handleGenerateMAR() {
    setMarGenerating(true)
    setMarError('')
    try {
      await generateMarGridPDF({ residentId, communityId, month: marMonth, year: marYear, supabase })
      setShowMAR(false)
    } catch (e) {
      setMarError(`Failed to generate MAR: ${e?.message || 'Please try again.'}`)
    }
    setMarGenerating(false)
  }

  async function handleGenerateLIC622() {
    setLic622Generating(true)
    setLic622Error('')
    try {
      await generateLIC622PDF({ residentId, communityId, supabase })
      setShowLIC622(false)
    } catch (e) {
      setLic622Error(`Failed to generate PDF: ${e?.message || 'Please try again.'}`)
    }
    setLic622Generating(false)
  }

  return (
    <div>
      {/* ── LIC 622 Confirm Modal ── */}
      {showLIC622 && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-semibold text-slate-800">Download LIC 622</h2>
                <p className="text-xs text-slate-400 mt-0.5">Centrally Stored Medication &amp; Destruction Record</p>
              </div>
              <button onClick={() => setShowLIC622(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
                <p>Generates the official California DSS LIC 622 form pre-filled with:</p>
                <ul className="list-disc list-inside space-y-0.5 mt-1">
                  <li>Facility name and license number</li>
                  <li>Resident name, admission date, and attending physician</li>
                  <li>All centrally stored medications on file</li>
                  <li>Blank Part II destruction record for manual completion</li>
                </ul>
              </div>
              {lic622Error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{lic622Error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLIC622(false)}
                  className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateLIC622}
                  disabled={lic622Generating}
                  className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {lic622Generating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAR Modal ── */}
      {showMAR && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="font-semibold text-slate-800">Download MAR</h2>
                <p className="text-xs text-slate-400 mt-0.5">Monthly Medication Administration Record</p>
              </div>
              <button onClick={() => setShowMAR(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                    value={marMonth}
                    onChange={e => setMarMonth(Number(e.target.value))}
                  >
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                    value={marYear}
                    onChange={e => setMarYear(Number(e.target.value))}
                  >
                    {[today.getFullYear()+1, today.getFullYear(), today.getFullYear()-1, today.getFullYear()-2].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
                <p>Generates a Haven-branded MAR grid including:</p>
                <ul className="list-disc list-inside space-y-0.5 mt-1">
                  <li>All medications with strength, Rx#, and dosage</li>
                  <li>A.M. / Noon / P.M. / Bed rows per medication</li>
                  <li>Staff initials in each day cell where administered</li>
                  <li>31-day grid with staff legend in footer</li>
                </ul>
              </div>
              {marError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{marError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMAR(false)}
                  className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateMAR}
                  disabled={marGenerating}
                  className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {marGenerating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Generating…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download MAR
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Medications ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        {/* Header — always visible, Add button in header */}
        <div className="px-5 py-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setOpenManage(o => !o)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <h2 className="font-semibold text-slate-800">Medications</h2>
            {!loading && medications.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{medications.length}</span>
            )}
            <ChevronIcon open={openManage} />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMAR(true)}
              title="Download Monthly MAR"
              className="flex items-center gap-1 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              MAR
            </button>
            <button
              onClick={() => setShowLIC622(true)}
              title="Download LIC 622"
              className="flex items-center gap-1 border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              LIC 622
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 bg-[#185FA5] hover:bg-[#0C447C] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Medication
            </button>
          </div>
        </div>

        {openManage && (
          <div className="px-5 pt-4 pb-5 border-t border-slate-100">

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
                          {confirmDelete === med.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { handleDelete(med.id); setConfirmDelete(null) }}
                                className="text-xs text-red-600 font-semibold hover:text-red-800 transition-colors"
                              >
                                Yes, delete
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(med.id)}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── PRN / As-Needed Section ── */}
      {!loading && (
        <PRNMedications
          residentId={residentId}
          medications={medications}
        />
      )}

      {/* ── Today's Status (read-only — log doses in Dispense tab) ── */}
      {!loading && (
        <TodayMedications
          residentId={residentId}
          medications={medications.filter(m => m.frequency_type !== 'prn')}
        />
      )}

      {showAdd && <MedicationModal residentId={residentId} communityId={communityId} onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <MedicationModal residentId={residentId} communityId={communityId} medication={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
