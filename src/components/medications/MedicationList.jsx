import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

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

const TODAY = new Date().toISOString().split('T')[0]

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
      // Auto-set start_date to today for one_time if not already set
      start_date: type === 'one_time' && !f.start_date ? TODAY : f.start_date,
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

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Medication Name <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={form.medication_name ?? ''} onChange={e => set('medication_name', e.target.value)} />
          </div>

          {/* Dose */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dose</label>
            <input className={inputCls} value={form.dose ?? ''} onChange={e => set('dose', e.target.value)} placeholder="e.g. 500mg" />
          </div>

          {/* Frequency type */}
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

            {/* Specific days */}
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

            {/* Every X days */}
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

            {/* One-time note */}
            {freqType === 'one_time' && (
              <p className="text-xs text-slate-400 mt-2">
                Will appear on the Dispense tab only on the start date below.
              </p>
            )}
          </div>

          {/* Start & End dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date {freqType === 'one_time' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                className={inputCls}
                value={form.start_date ?? ''}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                className={inputCls}
                value={form.end_date ?? ''}
                min={form.start_date || undefined}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Schedule times */}
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

          {/* Additional notes (was "frequency" text field) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <input
              className={inputCls}
              value={form.frequency ?? ''}
              onChange={e => set('frequency', e.target.value)}
              placeholder="e.g. Take with food, avoid grapefruit…"
            />
          </div>

          {/* Clinical notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              placeholder="Special instructions, allergies, interactions…"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Medication'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MedicationList({ residentId }) {
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium text-slate-700">Medications</h2>
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

                    {/* Dose + frequency description */}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[med.dose, describeFrequency(med)].filter(Boolean).join(' · ')}
                    </p>

                    {/* Date range */}
                    {dateRange.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {med.start_date && med.end_date
                          ? `${shortDate(med.start_date)} – ${shortDate(med.end_date)}`
                          : med.start_date
                            ? `From ${shortDate(med.start_date)}`
                            : `Until ${shortDate(med.end_date)}`}
                      </p>
                    )}

                    {/* Schedule times */}
                    {med.scheduled_times?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {med.scheduled_times.map(t => (
                          <span key={t} className="inline-block bg-[#E6F1FB] text-[#185FA5] text-xs font-medium px-2 py-0.5 rounded-full">
                            {fmt12(t)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Additional notes */}
                    {med.frequency && (
                      <p className="text-xs text-slate-500 mt-1.5">{med.frequency}</p>
                    )}

                    {/* Clinical notes */}
                    {med.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic leading-relaxed">{med.notes}</p>
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

      {showAdd && <MedicationModal residentId={residentId} onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {editing && <MedicationModal medication={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
