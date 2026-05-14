/*
-- Run in Supabase SQL editor:
create table vital_signs (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  recorded_by_name text,
  created_at timestamptz default now(),
  recorded_at timestamptz not null default now(),
  systolic integer,
  diastolic integer,
  pulse integer,
  temperature numeric(4,1),
  oxygen_saturation integer,
  weight numeric(5,1),
  notes text
);
create index on vital_signs(resident_id, recorded_at desc);
alter table vital_signs enable row level security;
create policy "community members can manage vitals" on vital_signs
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'

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

function anyOutOfRange(record) {
  return ['systolic', 'diastolic', 'pulse', 'oxygen_saturation', 'temperature', 'blood_glucose', 'pain_scale'].some(
    f => isOutOfRange(f, record[f])
  )
}

function painColor(val) {
  if (val == null || val === '') return 'text-slate-700'
  const v = Number(val)
  if (v >= 7) return 'text-red-600 font-semibold'
  if (v >= 4) return 'text-amber-600 font-semibold'
  return 'text-emerald-600'
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
  recorded_at: '',
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

// ─── Inline Record Vitals Modal ───────────────────────────────────────────────

function RecordVitalsModal({ resident, communityId, onClose, onSaved }) {
  const { profile } = useProfile()
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    recorded_at: new Date().toISOString().slice(0, 16),
  })
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: resident.id,
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
    const { data, error } = await supabase.from('vital_signs').insert(payload).select().single()
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Record Vital Signs</h2>
            <p className="text-xs text-slate-500">{resident.first_name} {resident.last_name} · Room {resident.room_number || '—'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                  className={`${inputCls} ${isOutOfRange(key, form[key]) ? 'border-red-300' : ''}`}
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
            <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Vitals'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VitalSigns() {
  const { communityId } = useCommunity()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [recordingFor, setRecordingFor] = useState(null) // resident object

  async function load() {
    // Get all active residents
    const { data: residents } = await supabase
      .from('residents')
      .select('id, first_name, last_name, room_number')
      .eq('community_id', communityId)
      .eq('status', 'active')
      .order('last_name')

    // Get latest vital per resident
    const { data: vitals } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('community_id', communityId)
      .order('recorded_at', { ascending: false })

    // Build map: resident_id -> latest vital
    const vitalMap = {}
    for (const v of (vitals || [])) {
      if (!vitalMap[v.resident_id]) vitalMap[v.resident_id] = v
    }

    const combined = (residents || []).map(r => ({
      resident: r,
      vital: vitalMap[r.id] || null,
    }))
    setRows(combined)
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId]) // eslint-disable-line

  function handleVitalSaved(resident, newVital) {
    setRows(prev => prev.map(row => {
      if (row.resident.id !== resident.id) return row
      // only replace if newer
      if (!row.vital || newVital.recorded_at >= row.vital.recorded_at) {
        return { ...row, vital: newVital }
      }
      return row
    }))
    setRecordingFor(null)
  }

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const filtered = rows.filter(({ vital }) => {
    if (filter === 'today') return vital && vital.recorded_at?.startsWith(today)
    if (filter === 'week') return vital && vital.recorded_at >= weekAgo
    return true
  })

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vital Signs</h1>
        <p className="text-sm text-slate-500 mt-1">Latest reading per resident</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {[['all', 'All'], ['today', 'Today'], ['week', 'This Week']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === val ? 'bg-[#185FA5] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pulse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Temp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">O2%</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Glucose</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pain</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alert</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ resident, vital }) => (
                <tr key={resident.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/residents/${resident.id}`)}
                      className="text-[#185FA5] hover:text-[#0C447C] font-medium text-left transition-colors"
                    >
                      {resident.first_name} {resident.last_name}
                    </button>
                    <p className="text-xs text-slate-400">Room {resident.room_number || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {vital?.systolic && vital?.diastolic
                      ? <span className={isOutOfRange('systolic', vital.systolic) || isOutOfRange('diastolic', vital.diastolic) ? 'text-red-600 font-semibold' : ''}>{vital.systolic}/{vital.diastolic}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.pulse != null
                      ? <span className={isOutOfRange('pulse', vital.pulse) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.pulse}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.temperature != null
                      ? <span className={isOutOfRange('temperature', vital.temperature) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.temperature}°F</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.oxygen_saturation != null
                      ? <span className={isOutOfRange('oxygen_saturation', vital.oxygen_saturation) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.oxygen_saturation}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.blood_glucose != null
                      ? <span className={isOutOfRange('blood_glucose', vital.blood_glucose) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.blood_glucose}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.pain_scale != null
                      ? <span className={painColor(vital.pain_scale)}>{vital.pain_scale}/10</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {vital ? new Date(vital.recorded_at).toLocaleDateString() : <span className="text-slate-300">No data</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital && anyOutOfRange(vital) && (
                      <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">⚠ Alert</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setRecordingFor(resident)}
                      className="text-xs text-[#185FA5] hover:text-[#0C447C] font-medium bg-[#E6F1FB] hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                      + Record
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-sm">No data for selected filter</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {recordingFor && (
        <RecordVitalsModal
          resident={recordingFor}
          communityId={communityId}
          onClose={() => setRecordingFor(null)}
          onSaved={(vital) => handleVitalSaved(recordingFor, vital)}
        />
      )}
    </Layout>
  )
}
