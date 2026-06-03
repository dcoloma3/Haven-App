import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { generateMarGridPDF } from '../../lib/marGridPDF'
import { useCommunity } from '../../context/CommunityContext'
import { localDateStr } from '../../lib/dateUtils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDateLong(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getTodayStr() {
  return localDateStr()
}

function getDateRange(preset, customFrom, customTo) {
  const today = new Date()
  const td = getTodayStr()
  if (preset === 'today') return { from: td, to: td }
  if (preset === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return { from: localDateStr(d), to: td }
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: localDateStr(d), to: td }
  }
  if (preset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const last = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: localDateStr(first), to: localDateStr(last) }
  }
  if (preset === 'year') {
    const d = new Date(today.getFullYear(), 0, 1)
    return { from: localDateStr(d), to: td }
  }
  if (preset === 'custom') return { from: customFrom || td, to: customTo || td }
  return { from: td, to: td }
}

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResidentMedHistory({ residentId }) {
  const { communityId } = useCommunity()
  const [rangePreset, setRangePreset] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [routineRecords, setRoutineRecords] = useState([])
  const [prnRecords, setPrnRecords] = useState([])
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [marError, setMarError] = useState('')
  const [selectedMed, setSelectedMed] = useState('')

  const { from, to } = getDateRange(rangePreset, customFrom, customTo)

  // Load staff name map — scoped to this community only
  useEffect(() => {
    if (!communityId) return
    supabase
      .from('community_members')
      .select('user_id, profiles(user_id, full_name, email)')
      .eq('community_id', communityId)
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(m => {
          const p = m.profiles
          if (p) map[p.user_id] = p.full_name || p.email || 'Staff'
        })
        setStaffMap(map)
      })
  }, [communityId])


  // Load administered records for the selected range
  const loadRecords = useCallback(async () => {
    setLoading(true)
    const [{ data: routine }, { data: prn }] = await Promise.all([
      supabase
        .from('medication_administrations')
        .select('id, medication_id, scheduled_time, administered_date, administered_at, administered_by, medications!medication_id(medication_name, dose)')
        .eq('resident_id', residentId)
        .gte('administered_date', from)
        .lte('administered_date', to)
        .order('administered_date', { ascending: false })
        .order('scheduled_time', { ascending: true }),
      supabase
        .from('prn_administrations')
        .select('*')
        .eq('resident_id', residentId)
        .gte('administered_at', from + 'T00:00:00')
        .lte('administered_at', to + 'T23:59:59')
        .order('administered_at', { ascending: false }),
    ])
    setRoutineRecords(routine ?? [])
    setPrnRecords(prn ?? [])
    setLoading(false)
  }, [residentId, from, to])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords()
  }, [loadRecords])

  // Unique medication names across both routine and PRN records in range
  const medOptions = useMemo(() => {
    const names = new Set()
    routineRecords.forEach(r => { if (r.medications?.medication_name) names.add(r.medications.medication_name) })
    prnRecords.forEach(r => { if (r.medication_name) names.add(r.medication_name) })
    return [...names].sort()
  }, [routineRecords, prnRecords])

  // Apply medication filter
  const filteredRoutine = useMemo(() =>
    selectedMed ? routineRecords.filter(r => r.medications?.medication_name === selectedMed) : routineRecords,
    [routineRecords, selectedMed]
  )
  const filteredPrn = useMemo(() =>
    selectedMed ? prnRecords.filter(r => r.medication_name === selectedMed) : prnRecords,
    [prnRecords, selectedMed]
  )

  // Group combined records by date for on-screen display
  const grouped = useMemo(() => {
    const map = {}
    filteredRoutine.forEach(r => {
      const d = r.administered_date
      if (!map[d]) map[d] = { routine: [], prn: [] }
      map[d].routine.push(r)
    })
    filteredPrn.forEach(r => {
      const d = r.administered_at.split('T')[0]
      if (!map[d]) map[d] = { routine: [], prn: [] }
      map[d].prn.push(r)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredRoutine, filteredPrn])

  const totalDoses = filteredRoutine.length + filteredPrn.length

  // ─── PDF / MAR generation ──────────────────────────────────────────────────

  async function generateMAR() {
    setGenerating(true)
    setMarError('')
    try {
      const [y, m] = from.split('-')   // from = 'YYYY-MM-DD' of the selected range start
      await generateMarGridPDF({
        residentId,
        communityId,
        month: Number(m),
        year: Number(y),
        supabase,
      })
    } catch (err) {
      console.error(err)
      setMarError(`Failed to generate MAR: ${err?.message || 'Please try again.'}`)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">

      {/* Title row */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-medium text-slate-700">Medication History (MAR)</h2>
          {!loading && (
            <p className="text-xs text-slate-400 mt-0.5">
              {totalDoses} record{totalDoses !== 1 ? 's' : ''}
              {selectedMed ? <span className="text-purple-500 font-medium"> · {selectedMed}</span> : null}
              {' · '}{formatDateShort(from)}{from !== to ? ` – ${formatDateShort(to)}` : ''}
            </p>
          )}
        </div>
        {!loading && totalDoses > 0 && (
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={generateMAR}
              disabled={generating}
              className="flex items-center gap-2 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {generating ? 'Generating…' : 'Generate MAR'}
            </button>
            <p className="text-[10px] text-slate-400">Monthly grid · routine + PRN</p>
            {marError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{marError}</p>
            )}
          </div>
        )}
      </div>

      {/* Date range presets */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => setRangePreset(p.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              rangePreset === p.id
                ? 'bg-[#185FA5] text-white border-[#185FA5]'
                : 'bg-white text-slate-600 border-slate-300 hover:border-[#185FA5]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {rangePreset === 'custom' && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              max={customTo || getTodayStr()}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              max={getTodayStr()}
              onChange={e => setCustomTo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Medication filter */}
      {!loading && medOptions.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs font-medium text-slate-500 flex-shrink-0">Filter by medication</label>
          <select
            value={selectedMed}
            onChange={e => setSelectedMed(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent bg-white"
          >
            <option value="">All Medications</option>
            {medOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {selectedMed && (
            <button
              onClick={() => setSelectedMed('')}
              className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-slate-400 text-sm mt-4">Loading…</p>}

      {!loading && totalDoses === 0 && (
        <p className="text-sm text-slate-400 mt-2">
          {selectedMed
            ? `No records for "${selectedMed}" in this period.`
            : 'No medications recorded in this period.'}
        </p>
      )}

      {/* Day-grouped log */}
      {!loading && grouped.length > 0 && (
        <div className="space-y-5 mt-2 max-h-[480px] overflow-y-auto pr-1">
          {grouped.map(([dateStr, { routine, prn }]) => {
            const dayTotal = routine.length + prn.length
            return (
              <div key={dateStr}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {formatDateLong(dateStr)}
                  </span>
                  <div className="flex-1 border-t border-slate-100" />
                  <span className="text-xs text-slate-400">{dayTotal} record{dayTotal !== 1 ? 's' : ''}</span>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {routine.map(record => {
                    const med = record.medications
                    const givenBy = record.administered_by ? (staffMap[record.administered_by] ?? 'Staff') : null
                    return (
                      <div key={record.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-800">{med?.medication_name ?? '—'}</p>
                            <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Routine</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {med?.dose ?? '—'}
                            {givenBy && <span> · {givenBy}</span>}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xs font-medium text-slate-500">{fmt12(record.scheduled_time)}</p>
                          {record.administered_at && (
                            <p className="text-xs text-emerald-600 mt-0.5">✓ {formatTime(record.administered_at)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {prn.map(record => {
                    const givenBy = record.administered_by ? (staffMap[record.administered_by] ?? 'Staff') : null
                    return (
                      <div key={record.id} className="flex items-center justify-between px-4 py-3 bg-purple-50/40 hover:bg-purple-50/70 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-800">
                              {record.medication_name}{record.dose ? ` · ${record.dose}` : ''}
                            </p>
                            <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">PRN</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-medium">Reason:</span> {record.reason}
                          </p>
                          {givenBy && <p className="text-xs text-slate-400 mt-0.5">{givenBy}</p>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-xs font-semibold text-emerald-600">✓ {formatTime(record.administered_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
