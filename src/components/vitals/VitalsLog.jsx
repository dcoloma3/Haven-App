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
  return false
}

function anyOutOfRange(record) {
  return ['systolic', 'diastolic', 'pulse', 'oxygen_saturation', 'temperature'].some(f => isOutOfRange(f, record[f]))
}

const RANGES = {
  systolic: 'Normal: 90–140 mmHg',
  diastolic: 'Normal: 60–90 mmHg',
  pulse: 'Normal: 60–100 bpm',
  temperature: 'Normal: 97.0–99.5 °F',
  oxygen_saturation: 'Normal: ≥95%',
  weight: '',
}

export default function VitalsLog({ residentId, resident }) {
  const { communityId } = useCommunity()
  const { profile } = useProfile()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().slice(0, 16),
    systolic: '',
    diastolic: '',
    pulse: '',
    temperature: '',
    oxygen_saturation: '',
    weight: '',
    notes: '',
  })

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

  async function handleSave() {
    setSaving(true)
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
      notes: form.notes.trim() || null,
    }
    await supabase.from('vital_signs').insert(payload)
    setSaving(false)
    setShowModal(false)
    setForm({ recorded_at: new Date().toISOString().slice(0, 16), systolic: '', diastolic: '', pulse: '', temperature: '', oxygen_saturation: '', weight: '', notes: '' })
    await fetchRecords()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading vitals…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Vital Signs Log</h3>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
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
                {anyOutOfRange(r) && (
                  <span className="bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">Alert</span>
                )}
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
              </div>
              {r.notes && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Record Vitals Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">Record Vital Signs</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                    <input
                      type="number"
                      step={key === 'temperature' || key === 'weight' ? '0.1' : '1'}
                      value={form[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      className={`${inputCls} ${isOutOfRange(key, form[key]) ? 'border-red-300 ring-red-200' : ''}`}
                      placeholder="—"
                    />
                    {RANGES[key] && <p className="text-xs text-slate-400 mt-0.5">{RANGES[key]}</p>}
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={3} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : 'Save Vitals'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
