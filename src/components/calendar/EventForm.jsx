import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

// Appointment sub-types
const APPOINTMENT_TYPES = [
  'Doctor',
  'Dentist',
  'Therapy',
  'Specialist',
  'Eye Doctor',
  'Pharmacy',
  'Other',
]

// Determine initial tab from an existing event
function inferTab(event) {
  if (!event) return 'Appointment'
  return event.event_type === 'Community Event' ? 'Community Event' : 'Appointment'
}

export default function EventForm({
  residents = [],
  communityId,
  defaultDate,
  defaultResidentId,
  event,
  onClose,
  onSaved,
}) {
  const isEditing = !!event

  // Toggle pill: "Appointment" | "Community Event"
  const [tab, setTab] = useState(() => inferTab(event))

  // ── Form state ───────────────────────────────────────────────────────────────
  const [apptForm, setApptForm] = useState({
    resident_id: event?.resident_id ?? defaultResidentId ?? '',
    appointment_type: event?.appointment_type ?? '',
    event_date: event?.event_date ?? defaultDate ?? '',
    event_time: event?.event_time ?? '',
    location: event?.location ?? '',
    notes: event?.notes ?? '',
  })

  const [communityForm, setCommunityForm] = useState({
    title: (event?.event_type === 'Community Event' ? event?.title : '') ?? '',
    event_date: event?.event_date ?? defaultDate ?? '',
    event_time: event?.event_time ?? '',
    location: event?.location ?? '',
    notes: event?.notes ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function setAppt(field, value) { setApptForm(f => ({ ...f, [field]: value })) }
  function setComm(field, value) { setCommunityForm(f => ({ ...f, [field]: value })) }

  // ── Compute auto-title for appointments ──────────────────────────────────────
  function buildApptTitle() {
    const resident = residents.find(r => r.id === apptForm.resident_id)
    const residentName = resident
      ? (resident.full_name || [resident.first_name, resident.last_name].filter(Boolean).join(' '))
      : ''
    const type = apptForm.appointment_type || 'Appointment'
    return residentName ? `${type} - ${residentName}` : type
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let payload
    if (tab === 'Appointment') {
      if (!apptForm.resident_id) { setError('Please select a resident.'); setSaving(false); return }
      if (!apptForm.appointment_type) { setError('Please select an appointment type.'); setSaving(false); return }
      if (!apptForm.event_date) { setError('Please choose a date.'); setSaving(false); return }
      payload = {
        community_id: communityId,
        event_type: 'Appointment',
        appointment_type: apptForm.appointment_type,
        title: buildApptTitle(),
        event_date: apptForm.event_date,
        event_time: apptForm.event_time || null,
        location: apptForm.location || null,
        notes: apptForm.notes || null,
        resident_id: apptForm.resident_id,
      }
    } else {
      if (!communityForm.title.trim()) { setError('Please enter a title.'); setSaving(false); return }
      if (!communityForm.event_date) { setError('Please choose a date.'); setSaving(false); return }
      payload = {
        community_id: communityId,
        event_type: 'Community Event',
        appointment_type: null,
        title: communityForm.title.trim(),
        event_date: communityForm.event_date,
        event_time: communityForm.event_time || null,
        location: communityForm.location || null,
        notes: communityForm.notes || null,
        resident_id: null,
      }
    }

    const { error: dbErr } = isEditing
      ? await supabase.from('calendar_events').update(payload).eq('id', event.id)
      : await supabase.from('calendar_events').insert([payload])

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    onSaved()
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true)
    await supabase.from('calendar_events').delete().eq('id', event.id)
    onSaved()
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-base">
            {isEditing ? 'Edit Event' : 'Add Event'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type toggle pills */}
          <div className="flex gap-2">
            {['Appointment', 'Community Event'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  tab === t
                    ? 'bg-[#185FA5] text-white border-[#185FA5]'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#185FA5] hover:text-[#185FA5]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Appointment fields ── */}
          {tab === 'Appointment' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Resident <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputCls}
                  value={apptForm.resident_id}
                  onChange={e => setAppt('resident_id', e.target.value)}
                  required
                >
                  <option value="">— Select resident —</option>
                  {residents.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Appointment Type <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputCls}
                  value={apptForm.appointment_type}
                  onChange={e => setAppt('appointment_type', e.target.value)}
                  required
                >
                  <option value="">— Select type —</option>
                  {APPOINTMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={apptForm.event_date}
                    onChange={e => setAppt('event_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    className={inputCls}
                    value={apptForm.event_time}
                    onChange={e => setAppt('event_time', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  className={inputCls}
                  value={apptForm.location}
                  onChange={e => setAppt('location', e.target.value)}
                  placeholder="e.g. 123 Main St, Suite 4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={apptForm.notes}
                  onChange={e => setAppt('notes', e.target.value)}
                  placeholder="Any additional notes…"
                />
              </div>
            </>
          )}

          {/* ── Community Event fields ── */}
          {tab === 'Community Event' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputCls}
                  value={communityForm.title}
                  onChange={e => setComm('title', e.target.value)}
                  placeholder="e.g. Movie Night"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={communityForm.event_date}
                    onChange={e => setComm('event_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    className={inputCls}
                    value={communityForm.event_time}
                    onChange={e => setComm('event_time', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  className={inputCls}
                  value={communityForm.location}
                  onChange={e => setComm('location', e.target.value)}
                  placeholder="e.g. Community Room"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={communityForm.notes}
                  onChange={e => setComm('notes', e.target.value)}
                  placeholder="Any additional notes…"
                />
              </div>
            </>
          )}

          {/* Inline error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Event'}
            </button>
          </div>

          {/* Delete — editing only, with confirm step */}
          {isEditing && (
            confirmDelete ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting || saving}
                className="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                Delete Event
              </button>
            )
          )}
        </form>
      </div>
    </div>
  )
}