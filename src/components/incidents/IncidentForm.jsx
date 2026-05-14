import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const INCIDENT_TYPES = [
  { value: 'fall', label: 'Fall' },
  { value: 'injury', label: 'Injury' },
  { value: 'medication_error', label: 'Medication Error' },
  { value: 'behavioral', label: 'Behavioral Incident' },
  { value: 'elopement', label: 'Elopement' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'other', label: 'Other' },
]

const SEVERITY = [
  { value: 'low', label: 'Low', active: 'bg-emerald-500 text-white border-emerald-500', idle: 'border-slate-200 text-slate-500' },
  { value: 'medium', label: 'Medium', active: 'bg-amber-400 text-white border-amber-400', idle: 'border-slate-200 text-slate-500' },
  { value: 'high', label: 'High', active: 'bg-red-500 text-white border-red-500', idle: 'border-slate-200 text-slate-500' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#185FA5]' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// Resident search dropdown — only shown when no residentId is pre-provided
function ResidentSearch({ communityId, value, onChange }) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!query.trim() || query === value?.name) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('residents')
        .select('id, first_name, last_name, full_name, room_number')
        .eq('community_id', communityId)
        .eq('status', 'active')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(8)
      setResults(data ?? [])
      setOpen(true)
    }, 200)
    return () => clearTimeout(t)
  }, [query, communityId, value?.name])

  function getName(r) {
    return [r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name || 'Unknown'
  }

  function select(r) {
    const name = getName(r)
    setQuery(name)
    setOpen(false)
    setResults([])
    onChange({ id: r.id, name, room: r.room_number })
  }

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); if (!e.target.value) onChange(null) }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search residents…"
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {results.map(r => (
            <button
              key={r.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => select(r)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between"
            >
              <span className="font-medium text-slate-800">{getName(r)}</span>
              {r.room_number && <span className="text-xs text-slate-400">Room {r.room_number}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function IncidentForm({ residentId, residentName, roomNumber, incident, onClose, onSaved }) {
  const { communityId } = useCommunity()
  const { profile } = useProfile()

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // When no residentId is provided, user must search for one
  const [selectedResident, setSelectedResident] = useState(
    residentId ? { id: residentId, name: residentName, room: roomNumber } : null
  )

  const [form, setForm] = useState({
    incident_date: incident?.incident_date ?? today,
    incident_time: incident?.incident_time?.slice(0, 5) ?? now,
    incident_type: incident?.incident_type ?? '',
    severity: incident?.severity ?? 'low',
    location: incident?.location ?? '',
    description: incident?.description ?? '',
    witnesses: incident?.witnesses ?? '',
    immediate_action: incident?.immediate_action ?? '',
    physician_notified: incident?.physician_notified ?? false,
    physician_notified_time: incident?.physician_notified_time
      ? new Date(incident.physician_notified_time).toISOString().slice(0, 16)
      : '',
    family_notified: incident?.family_notified ?? false,
    family_notified_time: incident?.family_notified_time
      ? new Date(incident.family_notified_time).toISOString().slice(0, 16)
      : '',
    follow_up_required: incident?.follow_up_required ?? false,
    follow_up_notes: incident?.follow_up_notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!residentId && !selectedResident) e.resident = 'Please select a resident'
    if (!form.incident_type) e.incident_type = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    const rid = residentId || selectedResident?.id
    const reporterName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name || 'Staff'
      : 'Staff'

    const payload = {
      community_id: communityId,
      resident_id: rid,
      incident_date: form.incident_date,
      incident_time: form.incident_time || null,
      incident_type: form.incident_type,
      severity: form.severity,
      location: form.location.trim() || null,
      description: form.description.trim(),
      witnesses: form.witnesses.trim() || null,
      immediate_action: form.immediate_action.trim() || null,
      physician_notified: form.physician_notified,
      physician_notified_time:
        form.physician_notified && form.physician_notified_time
          ? new Date(form.physician_notified_time).toISOString()
          : null,
      family_notified: form.family_notified,
      family_notified_time:
        form.family_notified && form.family_notified_time
          ? new Date(form.family_notified_time).toISOString()
          : null,
      follow_up_required: form.follow_up_required,
      follow_up_notes: form.follow_up_required ? form.follow_up_notes.trim() : null,
    }

    let result
    if (incident?.id) {
      result = await supabase.from('incidents').update(payload).eq('id', incident.id).select().single()
    } else {
      payload.created_by = profile?.user_id ?? null
      payload.reported_by_name = reporterName
      payload.status = 'open'
      result = await supabase.from('incidents').insert(payload).select().single()
    }

    setSaving(false)
    if (result.data) {
      const extra = selectedResident
        ? { resident_name: selectedResident.name, room_number: selectedResident.room }
        : {}
      onSaved({ ...result.data, ...extra })
    }
  }

  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-colors ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`

  const activeRes = residentId ? residentName : selectedResident?.name

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">
              {incident ? 'Edit Incident Report' : 'New Incident Report'}
            </h2>
            {activeRes && <p className="text-sm text-slate-400 mt-0.5">{activeRes}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">

          {/* Resident selector — only when no residentId passed */}
          {!residentId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Resident <span className="text-red-500">*</span>
              </label>
              <ResidentSearch communityId={communityId} value={selectedResident} onChange={setSelectedResident} />
              {errors.resident && <p className="text-xs text-red-500 mt-1">{errors.resident}</p>}
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Incident Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.incident_date}
                onChange={e => set('incident_date', e.target.value)}
                className={inputCls('incident_date')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input
                type="time"
                value={form.incident_time}
                onChange={e => set('incident_time', e.target.value)}
                className={inputCls('incident_time')}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Incident Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.incident_type}
              onChange={e => set('incident_type', e.target.value)}
              className={inputCls('incident_type')}
            >
              <option value="">Select type…</option>
              {INCIDENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.incident_type && <p className="text-xs text-red-500 mt-1">{errors.incident_type}</p>}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
            <div className="flex gap-2">
              {SEVERITY.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('severity', s.value)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                    form.severity === s.value ? s.active : s.idle + ' hover:border-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location in Facility</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Dining room, Hallway, Resident's room…"
              className={inputCls('location')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="Describe what happened in detail…"
              className={inputCls('description') + ' resize-none'}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Witnesses */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Witnesses</label>
            <input
              type="text"
              value={form.witnesses}
              onChange={e => set('witnesses', e.target.value)}
              placeholder="Names of any witnesses present…"
              className={inputCls('witnesses')}
            />
          </div>

          {/* Immediate Action */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Immediate Action Taken</label>
            <textarea
              value={form.immediate_action}
              onChange={e => set('immediate_action', e.target.value)}
              rows={3}
              placeholder="What was done immediately after the incident…"
              className={inputCls('immediate_action') + ' resize-none'}
            />
          </div>

          {/* Physician Notified */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Physician Notified</p>
                <p className="text-xs text-slate-400 mt-0.5">Was the attending physician contacted?</p>
              </div>
              <Toggle checked={form.physician_notified} onChange={v => set('physician_notified', v)} />
            </div>
            {form.physician_notified && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date & Time Notified</label>
                <input
                  type="datetime-local"
                  value={form.physician_notified_time}
                  onChange={e => set('physician_notified_time', e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Family Notified */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Family Notified</p>
                <p className="text-xs text-slate-400 mt-0.5">Was the resident's family or emergency contact contacted?</p>
              </div>
              <Toggle checked={form.family_notified} onChange={v => set('family_notified', v)} />
            </div>
            {form.family_notified && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date & Time Notified</label>
                <input
                  type="datetime-local"
                  value={form.family_notified_time}
                  onChange={e => set('family_notified_time', e.target.value)}
                  className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                />
              </div>
            )}
          </div>

          {/* Follow-Up */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Follow-Up Required</p>
                <p className="text-xs text-slate-400 mt-0.5">Does this incident require additional monitoring or action?</p>
              </div>
              <Toggle checked={form.follow_up_required} onChange={v => set('follow_up_required', v)} />
            </div>
            {form.follow_up_required && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Follow-Up Notes</label>
                <textarea
                  value={form.follow_up_notes}
                  onChange={e => set('follow_up_notes', e.target.value)}
                  rows={2}
                  placeholder="Describe the follow-up plan…"
                  className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : incident ? 'Save Changes' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
