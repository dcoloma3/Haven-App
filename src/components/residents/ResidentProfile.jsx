/*
-- Run in Supabase SQL editor:
alter table residents add column if not exists gender text;
alter table residents add column if not exists insurance_carrier text;
alter table residents add column if not exists insurance_id text;
alter table residents add column if not exists admission_type text;
alter table emergency_contacts add column if not exists email text;
alter table emergency_contacts add column if not exists is_primary boolean not null default false;
alter table emergency_contacts add column if not exists is_poa boolean not null default false;
*/

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RESIDENT_COLORS, getColor } from '../../lib/colors'
import { useCommunity } from '../../context/CommunityContext'
import EventForm from '../calendar/EventForm'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function Field({ label, value, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']
const ADMISSION_TYPE_OPTIONS = [
  'Private Pay',
  'Medicare',
  'Medicaid',
  'Medi-Cal',
  'VA Benefits',
  'Long-Term Care Insurance',
  'Other',
]

export default function ResidentProfile({ resident, onUpdate }) {
  const { communityId } = useCommunity()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showEventForm, setShowEventForm] = useState(false)

  // Warn user if they try to navigate away with unsaved edits
  useUnsavedChanges(editing && !saving)

  function startEdit() {
    setForm({ ...resident })
    setError('')
    setEditing(true)
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.first_name?.trim() && !form.last_name?.trim()) { setError('First name or last name is required.'); return }
    setSaving(true)
    setError('')
    const full_name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')
    const { data, error } = await supabase
      .from('residents')
      .update({
        first_name: form.first_name || null,
        middle_name: form.middle_name || null,
        last_name: form.last_name || null,
        full_name,
        date_of_birth: form.date_of_birth || null,
        room_number: form.room_number || null,
        move_in_date: form.move_in_date || null,
        physician: form.physician || null,
        physician_phone: form.physician_phone || null,
        gender: form.gender || null,
        insurance_carrier: form.insurance_carrier || null,
        insurance_id: form.insurance_id || null,
        care_level: form.care_level || null,
        admission_type: form.admission_type || null,
        notes: form.notes || null,
        color: form.color || 'blue',
      })
      .eq('id', resident.id)
      .select()
      .single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onUpdate(data)
    setEditing(false)
  }

  const currentColor = getColor(resident.color)

  if (!editing) {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: currentColor.swatch }} />
              <h2 className="font-medium text-slate-700">Profile</h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEventForm(true)}
                className="text-sm text-slate-500 hover:text-[#185FA5] transition-colors"
              >
                + Add Calendar Event
              </button>
              <button onClick={startEdit} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">Edit</button>
            </div>
          </div>

          {/* Personal Info */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <Field label="First Name" value={resident.first_name || (resident.full_name?.split(' ')[0] ?? '')} />
            <Field label="Last Name" value={resident.last_name || (resident.full_name?.split(' ').slice(-1)[0] ?? '')} />
            <Field label="Middle Name" value={resident.middle_name} />
            <Field label="Gender" value={resident.gender} />
            <Field label="Date of Birth" value={formatDate(resident.date_of_birth)} />
            <Field label="Room Number" value={resident.room_number} />
            <Field label="Move-in Date" value={formatDate(resident.move_in_date)} />
            <Field label="Care Level" value={resident.care_level} />
            <Field label="Admission Type" value={resident.admission_type} />
            <Field label="Primary Physician" value={resident.physician} />
            <Field label="Physician Phone" value={resident.physician_phone} />
          </dl>

          {/* Financial & Insurance */}
          <div className="border-t border-slate-100 pt-5 mb-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Financial &amp; Insurance</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Insurance Carrier" value={resident.insurance_carrier} />
              <Field label="Insurance ID / Member #" value={resident.insurance_id} />
            </dl>
          </div>

          {/* Notes */}
          <div className="border-t border-slate-100 pt-5">
            <dl className="grid grid-cols-1 gap-5">
              <Field label="Notes" value={resident.notes} wide />
            </dl>
          </div>
        </div>

        {showEventForm && (
          <EventForm
            residents={[resident]}
            communityId={communityId}
            defaultResidentId={resident.id}
            defaultEventType="Resident Appointment"
            onClose={() => setShowEventForm(false)}
            onSaved={() => setShowEventForm(false)}
          />
        )}
      </>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="font-medium text-slate-700 mb-5">Edit Profile</h2>
      <div className="space-y-4">

        {/* Name */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.first_name ?? ''} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
            <input className={inputCls} value={form.middle_name ?? ''} onChange={e => set('middle_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
            <input className={inputCls} value={form.last_name ?? ''} onChange={e => set('last_name', e.target.value)} />
          </div>
        </div>

        {/* Gender + DOB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select className={inputCls} value={form.gender ?? ''} onChange={e => set('gender', e.target.value)}>
              <option value="">— Select —</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input type="date" className={inputCls} value={form.date_of_birth ?? ''} onChange={e => set('date_of_birth', e.target.value)} />
          </div>
        </div>

        {/* Room + Move-in */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
            <input className={inputCls} value={form.room_number ?? ''} onChange={e => set('room_number', e.target.value)} placeholder="e.g. 1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Move-in Date</label>
            <input type="date" className={inputCls} value={form.move_in_date ?? ''} onChange={e => set('move_in_date', e.target.value)} />
          </div>
        </div>

        {/* Care Level */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Care Level</label>
          <select className={inputCls} value={form.care_level ?? ''} onChange={e => set('care_level', e.target.value)}>
            <option value="">— Select —</option>
            <option value="AL">Assisted Living (AL)</option>
            <option value="IL">Independent Living (IL)</option>
            <option value="MC">Memory Care (MC)</option>
            <option value="SNF">Skilled Nursing (SNF)</option>
            <option value="Hospice">Hospice</option>
            <option value="Respite">Respite</option>
          </select>
        </div>

        {/* Admission Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Admission Type</label>
          <select className={inputCls} value={form.admission_type ?? ''} onChange={e => set('admission_type', e.target.value)}>
            <option value="">— Select —</option>
            {ADMISSION_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Primary Physician + Physician Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Physician</label>
            <input className={inputCls} value={form.physician ?? ''} onChange={e => set('physician', e.target.value)} placeholder="Dr. Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Physician Phone</label>
            <input type="tel" className={inputCls} value={form.physician_phone ?? ''} onChange={e => set('physician_phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>

        {/* Financial & Insurance */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Financial &amp; Insurance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Carrier</label>
              <input className={inputCls} value={form.insurance_carrier ?? ''} onChange={e => set('insurance_carrier', e.target.value)} placeholder="e.g. Medicare" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Insurance ID / Member #</label>
              <input className={inputCls} value={form.insurance_id ?? ''} onChange={e => set('insurance_id', e.target.value)} placeholder="e.g. 1EG4-TE5-MK72" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
          <div className="flex gap-2.5">
            {RESIDENT_COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                title={c.label}
                onClick={() => set('color', c.name)}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c.swatch,
                  boxShadow: (form.color ?? 'blue') === c.name
                    ? `0 0 0 3px white, 0 0 0 5px ${c.swatch}`
                    : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={() => setEditing(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
