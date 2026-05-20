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
import { useNavigate, useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'
import { localDateStr } from '../lib/dateUtils'

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

// ─── Resident Picker Modal ────────────────────────────────────────────────────

function ResidentPickerModal({ residents, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const filtered = residents.filter(r =>
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    String(r.room_number || '').includes(search)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Select resident</h2>
            <p className="text-xs text-slate-400 mt-0.5">Choose who you're recording vitals for</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or room…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-[#F3F8FD] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
        </div>

        {/* Resident list */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No residents match "{search}"</p>
          )}
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#F3F8FD] transition-colors border-b border-slate-100 last:border-0 text-left"
            >
              {/* Initials avatar */}
              <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#042C53] text-sm font-semibold flex items-center justify-center flex-shrink-0">
                {r.first_name?.[0]}{r.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{r.first_name} {r.last_name}</p>
                <p className="text-xs text-slate-400">Room {r.room_number || '—'}</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Inline Record Vitals Modal ───────────────────────────────────────────────

function RecordVitalsModal({ resident, communityId, onClose, onSaved }) {
  const { profile } = useProfile()
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    recorded_at: new Date().toISOString().slice(0, 16),
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  function handleChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaveError('')
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
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
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
        {saveError && (
          <div className="mx-5 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {saveError}
          </div>
        )}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
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
  const location = useLocation()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [recordingFor, setRecordingFor] = useState(null) // resident object
  const [showPicker, setShowPicker] = useState(false)
  const [quickAddMode, setQuickAddMode] = useState(false)

  useEffect(() => { if (location.state?.quickAdd) setQuickAddMode(true) }, [])

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

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(18)
    doc.setTextColor(4, 44, 83)
    doc.text('Vital Signs Report', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    const filterLabel = filter === 'all' ? 'All residents' : filter === 'today' ? 'Recorded today' : 'This week'
    doc.text(`Filter: ${filterLabel}  |  Generated: ${new Date().toLocaleString()}`, 14, 29)

    autoTable(doc, {
      startY: 36,
      head: [['Resident', 'Room', 'BP (mmHg)', 'Pulse (bpm)', 'Temp (°F)', 'O2 Sat %', 'Glucose', 'Weight (lbs)', 'Pain (0–10)', 'Recorded By', 'Date']],
      body: filtered.map(({ resident, vital }) => [
        `${resident.first_name} ${resident.last_name}`,
        resident.room_number || '—',
        vital?.systolic && vital?.diastolic ? `${vital.systolic}/${vital.diastolic}` : '—',
        vital?.pulse != null ? String(vital.pulse) : '—',
        vital?.temperature != null ? `${vital.temperature}°F` : '—',
        vital?.oxygen_saturation != null ? `${vital.oxygen_saturation}%` : '—',
        vital?.blood_glucose != null ? String(vital.blood_glucose) : '—',
        vital?.weight != null ? `${vital.weight} lbs` : '—',
        vital?.pain_scale != null ? `${vital.pain_scale}/10` : '—',
        vital?.recorded_by_name || '—',
        vital ? new Date(vital.recorded_at).toLocaleDateString() : 'No data',
      ]),
      headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    doc.save(`vital-signs-${localDateStr()}.pdf`)
  }

  // Use local midnight for date comparisons — avoids UTC/local off-by-one at day boundaries
  const localMidnight = new Date(); localMidnight.setHours(0, 0, 0, 0)
  const weekAgoMidnight = new Date(localMidnight); weekAgoMidnight.setDate(weekAgoMidnight.getDate() - 7)

  const filtered = rows.filter(({ vital }) => {
    if (!vital) return filter === 'all'
    const recordedAt = new Date(vital.recorded_at)
    if (filter === 'today') return recordedAt >= localMidnight
    if (filter === 'week') return recordedAt >= weekAgoMidnight
    return true
  })

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vital Signs</h1>
          <p className="text-sm text-slate-500 mt-1">Latest reading per resident</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!loading && filtered.length > 0 && (
            <button
              onClick={exportPDF}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
              title="Export to PDF"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Export PDF
            </button>
          )}
          <button
            onClick={() => setShowPicker(true)}
            className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Record Vitals
          </button>
        </div>
      </div>

      {quickAddMode && (
        <div className="flex items-center justify-between bg-[#E6F1FB] border border-[#185FA5]/20 text-[#185FA5] rounded-xl px-4 py-3 mb-4 text-sm">
          <span className="font-medium">Select a resident below to record vitals.</span>
          <button onClick={() => setQuickAddMode(false)} className="text-[#185FA5]/60 hover:text-[#185FA5] ml-4 flex-shrink-0 text-lg leading-none">&times;</button>
        </div>
      )}

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
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight</th>
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
                      className="text-[#185FA5] hover:text-[#0C447C] font-medium text-left transition-colors whitespace-nowrap"
                    >
                      {resident.first_name} {resident.last_name}
                    </button>
                    <p className="text-xs text-slate-400 whitespace-nowrap">Room {resident.room_number || '—'}</p>
                    {/* Inline record button — visible immediately without horizontal scroll */}
                    <button
                      onClick={() => setRecordingFor(resident)}
                      className="mt-1 text-[10px] text-[#185FA5] font-semibold bg-[#E6F1FB] hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors whitespace-nowrap"
                    >
                      + Record
                    </button>
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
                  <td className="px-4 py-3 text-slate-700">
                    {vital?.weight != null
                      ? <span>{vital.weight} lbs</span>
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
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">No data for selected filter</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Step 1: pick a resident */}
      {showPicker && !recordingFor && (
        <ResidentPickerModal
          residents={rows.map(r => r.resident)}
          onSelect={resident => { setShowPicker(false); setRecordingFor(resident) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Step 2: record vitals for selected resident */}
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
