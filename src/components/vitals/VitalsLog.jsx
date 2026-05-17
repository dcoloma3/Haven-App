/*
-- Run in Supabase SQL editor:
alter table vital_signs add column if not exists blood_glucose numeric(5,1);
alter table vital_signs add column if not exists pain_scale integer;
alter table dietary_profiles add column if not exists liquid_thickness text default 'Thin';
alter table medication_administrations add column if not exists admin_status text default 'given';
alter table medication_administrations add column if not exists admin_notes text;
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

function isOutOfRange(field, value) {
  if (value == null || value === '') return false
  const v = Number(value)
  if (field === 'systolic') return v > 140 || v < 90
  if (field === 'diastolic') return v > 90 || v < 60
  if (field === 'pulse') return v > 100 || v < 60
  if (field === 'oxygen_saturation') return v < 95
  if (field === 'temperature') return v > 99.5 || v < 97.0
  if (field === 'blood_glucose') return v > 180 || v < 70
  if (field === 'pain_scale') return v >= 4
  return false
}

function isPainRed(value) {
  if (value == null || value === '') return false
  return Number(value) >= 7
}

function isPainAmber(value) {
  if (value == null || value === '') return false
  const v = Number(value)
  return v >= 4 && v < 7
}

function anyOutOfRange(record) {
  return ['systolic', 'diastolic', 'pulse', 'oxygen_saturation', 'temperature', 'blood_glucose', 'pain_scale'].some(
    f => isOutOfRange(f, record[f])
  )
}

function painColor(val) {
  if (val == null || val === '') return ''
  const v = Number(val)
  if (v >= 7) return 'text-red-600'
  if (v >= 4) return 'text-amber-600'
  return 'text-emerald-600'
}

function painBg(val) {
  if (val == null || val === '') return 'bg-slate-50'
  const v = Number(val)
  if (v >= 7) return 'bg-red-50'
  if (v >= 4) return 'bg-amber-50'
  return 'bg-emerald-50'
}

const RANGES = {
  systolic: 'Normal: 90–140 mmHg',
  diastolic: 'Normal: 60–90 mmHg',
  pulse: 'Normal: 60–100 bpm',
  temperature: 'Normal: 97.0–99.5 °F',
  oxygen_saturation: 'Normal: ≥95%',
  weight: '',
  blood_glucose: 'Normal fasting: 70–100 mg/dL',
  pain_scale: '0 = No pain, 10 = Worst pain',
}

const EMPTY_FORM = {
  recorded_at: new Date().toISOString().slice(0, 16),
  systolic: '',
  diastolic: '',
  pulse: '',
  temperature: '',
  oxygen_saturation: '',
  weight: '',
  blood_glucose: '',
  pain_scale: '',
  notes: '',
}

export default function VitalsLog({ residentId, resident }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null) // null = new, object = editing existing
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchRecords() {
    const { data } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('resident_id', residentId)
      .order('recorded_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [residentId]) // eslint-disable-line

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function openNew() {
    setEditRecord(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(r) {
    setEditRecord(r)
    setForm({
      recorded_at: r.recorded_at ? r.recorded_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      systolic: r.systolic ?? '',
      diastolic: r.diastolic ?? '',
      pulse: r.pulse ?? '',
      temperature: r.temperature ?? '',
      oxygen_saturation: r.oxygen_saturation ?? '',
      weight: r.weight ?? '',
      blood_glucose: r.blood_glucose ?? '',
      pain_scale: r.pain_scale ?? '',
      notes: r.notes ?? '',
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditRecord(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      recorded_by_name: authorName,
      recorded_at: form.recorded_at || new Date().toISOString(),
      systolic: form.systolic !== '' ? parseInt(form.systolic) : null,
      diastolic: form.diastolic !== '' ? parseInt(form.diastolic) : null,
      pulse: form.pulse !== '' ? parseInt(form.pulse) : null,
      temperature: form.temperature !== '' ? parseFloat(form.temperature) : null,
      oxygen_saturation: form.oxygen_saturation !== '' ? parseInt(form.oxygen_saturation) : null,
      weight: form.weight !== '' ? parseFloat(form.weight) : null,
      blood_glucose: form.blood_glucose !== '' ? parseFloat(form.blood_glucose) : null,
      pain_scale: form.pain_scale !== '' ? parseInt(form.pain_scale) : null,
      notes: form.notes.trim() || null,
    }

    let error
    if (editRecord) {
      ;({ error } = await supabase.from('vital_signs').update(payload).eq('id', editRecord.id))
    } else {
      ;({ error } = await supabase.from('vital_signs').insert(payload))
    }

    if (error) {
      console.error(error)
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    closeModal()
    await fetchRecords()
  }

  async function handleDelete(r) {
    if (!window.confirm('Delete this vital signs record? This cannot be undone.')) return
    await supabase.from('vital_signs').delete().eq('id', r.id)
    await fetchRecords()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading vitals…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Vital Signs Log</h3>
        <button
          onClick={openNew}
          className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Record Vitals
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No vitals recorded yet</p>
          <p className="text-slate-400 text-xs mt-1">Record the first vital signs reading using the button above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className={`bg-white border rounded-2xl p-4 ${anyOutOfRange(r) ? 'border-red-200' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{new Date(r.recorded_at).toLocaleString()}</p>
                  {r.recorded_by_name && <p className="text-xs text-slate-400">Recorded by {r.recorded_by_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {anyOutOfRange(r) && (
                    <span className="bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">Alert</span>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-[#E6F1FB]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {r.systolic != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('systolic', r.systolic) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">BP Systolic</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('systolic', r.systolic) ? 'text-red-600' : 'text-slate-800'}`}>{r.systolic} mmHg</p>
                  </div>
                )}
                {r.diastolic != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('diastolic', r.diastolic) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">BP Diastolic</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('diastolic', r.diastolic) ? 'text-red-600' : 'text-slate-800'}`}>{r.diastolic} mmHg</p>
                  </div>
                )}
                {r.pulse != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('pulse', r.pulse) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">Pulse</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('pulse', r.pulse) ? 'text-red-600' : 'text-slate-800'}`}>{r.pulse} bpm</p>
                  </div>
                )}
                {r.temperature != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('temperature', r.temperature) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">Temperature</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('temperature', r.temperature) ? 'text-red-600' : 'text-slate-800'}`}>{r.temperature}°F</p>
                  </div>
                )}
                {r.oxygen_saturation != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('oxygen_saturation', r.oxygen_saturation) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">O2 Sat</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('oxygen_saturation', r.oxygen_saturation) ? 'text-red-600' : 'text-slate-800'}`}>{r.oxygen_saturation}%</p>
                  </div>
                )}
                {r.weight != null && (
                  <div className="p-2 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">Weight</p>
                    <p className="text-sm font-semibold text-slate-800">{r.weight} lbs</p>
                  </div>
                )}
                {r.blood_glucose != null && (
                  <div className={`p-2 rounded-lg ${isOutOfRange('blood_glucose', r.blood_glucose) ? 'bg-red-50' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-500">Blood Glucose</p>
                    <p className={`text-sm font-semibold ${isOutOfRange('blood_glucose', r.blood_glucose) ? 'text-red-600' : 'text-slate-800'}`}>{r.blood_glucose} mg/dL</p>
                  </div>
                )}
                {r.pain_scale != null && (
                  <div className={`p-2 rounded-lg ${painBg(r.pain_scale)}`}>
                    <p className="text-xs text-slate-500">Pain Scale</p>
                    <p className={`text-sm font-semibold ${painColor(r.pain_scale)}`}>{r.pain_scale}/10</p>
                  </div>
                )}
              </div>
              {r.notes && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Record / Edit Vitals Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editRecord ? 'Edit Vital Signs' : 'Record Vital Signs'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date & Time</label>
                <input type="datetime-local" value={form.recorded_at} onChange={e => handleChange('recorded_at', e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'systolic', label: 'Systolic (mmHg)' },
                  { key: 'diastolic', label: 'Diastolic (mmHg)' },
                  { key: 'pulse', label: 'Pulse (bpm)' },
                  { key: 'temperature', label: 'Temperature (°F)' },
                  { key: 'oxygen_saturation', label: 'O2 Sat (%)' },
                  { key: 'weight', label: 'Weight (lbs)' },
                  { key: 'blood_glucose', label: 'Blood Glucose (mg/dL)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type="number"
                      step={key === 'temperature' || key === 'weight' || key === 'blood_glucose' ? '0.1' : '1'}
                      value={form[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      className={`${inputCls} ${isOutOfRange(key, form[key]) ? 'border-red-300 ring-red-200' : ''}`}
                      placeholder="—"
                    />
                    {RANGES[key] && (
                      <p className={`text-xs mt-0.5 ${isOutOfRange(key, form[key]) ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        {RANGES[key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Pain Scale */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pain Scale (0–10)</label>
                <div className="flex gap-1 flex-wrap">
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => {
                    const isSelected = form.pain_scale !== '' && parseInt(form.pain_scale) === n
                    let colorCls
                    if (n <= 3) colorCls = isSelected ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    else if (n <= 6) colorCls = isSelected ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                    else colorCls = isSelected ? 'bg-red-500 text-white border-red-500' : 'border-red-300 text-red-700 hover:bg-red-50'
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleChange('pain_scale', isSelected ? '' : String(n))}
                        className={`w-9 h-9 rounded-lg border text-xs font-semibold transition-colors ${colorCls}`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1">{RANGES.pain_scale}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 space-y-3">
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={closeModal} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {saving ? 'Saving…' : editRecord ? 'Update Vitals' : 'Save Vitals'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
