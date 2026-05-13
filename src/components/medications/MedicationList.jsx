import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { adminKey, isMedDueOnDate } from '../../lib/medStatus'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const TODAY_STR = new Date().toISOString().split('T')[0]

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
      start_date: type === 'one_time' && !f.start_date ? TODAY_STR : f.start_date,
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
      scheduled_times: finalTimes,
      frequency_type: form.frequency_type || 'daily',
      frequency_days: form.frequency_type === 'specific_days' ? (form.frequency_days ?? []) : [],
      frequency_interval: form.frequency_type === 'every_x_days' ? (parseInt(form.frequency_interval) || null) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Schedule Times</label>
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
                className="px-3 py-2 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
            {(form.scheduled_times ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.scheduled_times.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-[#E6F1FB] text-[#185FA5] text-xs font-medium px-2.5 py-1 rounded-full">
                    {fmt12(t)}
                    <button type="button" onClick={() => removeTime(t)} className="hover:text-[#0C447C] leading-none">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <input className={inputCls} value={form.frequency ?? ''} onChange={e => set('frequency', e.target.value)} placeholder="e.g. Take with food, avoid grapefruit…" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Special instructions, allergies, interactions…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Today's Dispense Checkbox ────────────────────────────────────────────────

function TodayCheckbox({ done, toggling, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={toggling}
      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 ${
        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white hover:border-[#185FA5]'
      } ${toggling ? 'opacity-40' : ''}`}
    >
      {done && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

// ─── Today's Medications Section ─────────────────────────────────────────────

function TodayMedications({ residentId, medications, onStatusChange }) {
  const [administered, setAdministered] = useState(new Map())
  const [toggling, setToggling] = useState(new Set())
  const [loadingAdmins, setLoadingAdmins] = useState(true)

  const todayMeds = medications.filter(m => isMedDueOnDate(m, TODAY_STR))

  useEffect(() => {
    if (todayMeds.length === 0) { setLoadingAdmins(false); return }
    supabase
      .from('medication_administrations')
      .select('*')
      .eq('resident_id', residentId)
      .eq('administered_date', TODAY_STR)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
        setLoadingAdmins(false)
      })
  }, [residentId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(med, time) {
    const key = adminKey(med.id, time)
    if (toggling.has(key)) return
    setToggling(prev => new Set(prev).add(key))

    let next
    if (administered.has(key)) {
      const record = administered.get(key)
      next = new Map(administered)
      next.delete(key)
      setAdministered(next)
      await supabase.from('medication_administrations').delete().eq('id', record.id)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      const payload = {
        medication_id: med.id,
        resident_id: residentId,
        scheduled_time: time,
        administered_date: TODAY_STR,
        administered_by: session?.user?.id ?? null,
      }
      next = new Map(administered)
      next.set(key, { ...payload, id: 'temp' })
      setAdministered(next)
      const { data } = await supabase.from('medication_administrations').insert([payload]).select().single()
      if (data) {
        setAdministered(prev => { const n = new Map(prev); n.set(key, data); return n })
        next = new Map(next)
        next.set(key, data)
      }
    }

    setToggling(prev => { const n = new Set(prev); n.delete(key); return n })

    // Notify parent so it can refresh the ring
    if (onStatusChange) onStatusChange()
  }

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Flatten to time-sorted rows: one row per (med, time) pair
  const rows = []
  todayMeds.forEach(med => {
    ;(med.scheduled_times ?? []).forEach(time => {
      rows.push({ med, time })
    })
  })
  rows.sort((a, b) => a.time.localeCompare(b.time))

  const totalDoses = rows.length
  const doneDoses = rows.filter(({ med, time }) => administered.has(adminKey(med.id, time))).length

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Today's Medications</h2>
          <p className="text-xs text-slate-400 mt-0.5">{todayLabel}</p>
        </div>
        {totalDoses > 0 && !loadingAdmins && (
          <span className={`text-sm font-semibold flex-shrink-0 mt-0.5 ${doneDoses === totalDoses ? 'text-emerald-600' : doneDoses > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {doneDoses}/{totalDoses} given
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
            const isDone = administered.has(key)
            const isTogg = toggling.has(key)
            return (
              <div
                key={key}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isDone ? 'bg-emerald-50/50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {med.medication_name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[med.dose, fmt12(time)].filter(Boolean).join(' · ')}
                  </p>
                  {isDone && administered.get(key)?.administered_at && (
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Given at {new Date(administered.get(key).administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <TodayCheckbox done={isDone} toggling={isTogg} onToggle={() => handleToggle(med, time)} />
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
          medications={medications}
          onStatusChange={onMedStatusChange}
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
                      {med.frequency && <p className="text-xs text-slate-500 mt-1.5">{med.frequency}</p>}
                      {med.notes && <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">{med.notes}</p>}
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
