import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
const RESIDENT_TYPES = ['Resident Appointment', 'Family Outing']

export default function EventForm({
  residents: residentsProp,
  defaultDate,
  defaultResidentId,
  defaultEventType,
  event,
  onClose,
  onSaved,
}) {
  const isEditing = !!event
  const [residentList, setResidentList] = useState(residentsProp ?? null)
  const [form, setForm] = useState(
    isEditing
      ? {
          title: event.title,
          event_date: event.event_date,
          event_time: event.event_time ?? '',
          event_type: event.event_type,
          resident_id: event.resident_id ?? '',
          notes: event.notes ?? '',
        }
      : {
          title: '',
          event_date: defaultDate ?? '',
          event_time: '',
          event_type: defaultEventType ?? '',
          resident_id: defaultResidentId ?? '',
          notes: '',
        }
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (residentsProp != null) { setResidentList(residentsProp); return }
    supabase.from('residents').select('id, full_name').order('full_name')
      .then(({ data }) => setResidentList(data ?? []))
  }, [residentsProp])

  const isResidentEvent = RESIDENT_TYPES.includes(form.event_type)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      title: form.title,
      event_date: form.event_date,
      event_time: form.event_time || null,
      event_type: form.event_type,
      resident_id: isResidentEvent && form.resident_id ? form.resident_id : null,
      notes: form.notes || null,
    }
    const { error } = isEditing
      ? await supabase.from('calendar_events').update(payload).eq('id', event.id)
      : await supabase.from('calendar_events').insert([payload])
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('calendar_events').delete().eq('id', event.id)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isEditing ? 'Edit Event' : 'Add Event'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Dr. Park appointment" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input required type="date" className={inputCls} value={form.event_date} onChange={e => set('event_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input type="time" className={inputCls} value={form.event_time} onChange={e => set('event_time', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type <span className="text-red-500">*</span></label>
            <select required className={inputCls} value={form.event_type} onChange={e => set('event_type', e.target.value)}>
              <option value="">— Select —</option>
              <optgroup label="Resident Events">
                <option value="Resident Appointment">Resident Appointment</option>
                <option value="Family Outing">Family Outing</option>
              </optgroup>
              <optgroup label="Business Events">
                <option value="Business Meeting">Business Meeting</option>
                <option value="Other">Other</option>
              </optgroup>
            </select>
          </div>

          {isResidentEvent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Resident</label>
              <select className={inputCls} value={form.resident_id} onChange={e => set('resident_id', e.target.value)}>
                <option value="">— Select resident —</option>
                {(residentList ?? []).map(r => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || deleting} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Event'}
            </button>
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete Event'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
