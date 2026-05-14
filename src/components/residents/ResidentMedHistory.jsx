import { useEffect, useState, useMemo, useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabase'
import { isMedDueOnDate } from '../../lib/medStatus'

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

function residentFullName(r) {
  if (!r) return ''
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '')
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function datesInRange(fromStr, toStr) {
  const dates = []
  const cur = new Date(fromStr + 'T00:00:00')
  const end = new Date(toStr + 'T00:00:00')
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

function getDateRange(preset, customFrom, customTo) {
  const today = new Date()
  const td = getTodayStr()
  if (preset === 'today') return { from: td, to: td }
  if (preset === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 6)
    return { from: d.toISOString().split('T')[0], to: td }
  }
  if (preset === 'month') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: d.toISOString().split('T')[0], to: td }
  }
  if (preset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const last = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from: first.toISOString().split('T')[0], to: last.toISOString().split('T')[0] }
  }
  if (preset === 'year') {
    const d = new Date(today.getFullYear(), 0, 1)
    return { from: d.toISOString().split('T')[0], to: td }
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

export default function ResidentMedHistory({ residentId, resident }) {
  const [rangePreset, setRangePreset] = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [routineRecords, setRoutineRecords] = useState([])
  const [prnRecords, setPrnRecords] = useState([])
  const [allMedications, setAllMedications] = useState([])
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [marMode, setMarMode] = useState('administered') // 'administered' | 'clinical'
  const [selectedMed, setSelectedMed] = useState('')

  const { from, to } = getDateRange(rangePreset, customFrom, customTo)

  // Load staff name map
  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name, email').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
      setStaffMap(map)
    })
  }, [])

  // Load all medications for this resident — needed for Full Clinical MAR
  useEffect(() => {
    supabase.from('medications').select('*').eq('resident_id', residentId)
      .then(({ data }) => setAllMedications(data ?? []))
  }, [residentId])

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

  useEffect(() => { loadRecords() }, [loadRecords])

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

  function generateMAR() {
    setGenerating(true)
    try {
      const doc = new jsPDF()
      const name = residentFullName(resident)
      const generatedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const rangeLabel = from === to ? formatDateShort(from) : `${formatDateShort(from)} – ${formatDateShort(to)}`
      const modeLabel = marMode === 'administered' ? 'Administered Medications Only' : 'Full Clinical MAR (with missed doses)'
      const medLabel = selectedMed ? `Medication: ${selectedMed}` : 'All Medications'

      // Header bar — taller when filtering a specific med
      const headerH = selectedMed ? 36 : 30
      doc.setFillColor(4, 44, 83)
      doc.rect(0, 0, 220, headerH, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Medication Administration Record (MAR)', 14, 11)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(`The Haven  ·  Generated: ${generatedOn}`, 14, 18)
      doc.text(modeLabel, 14, 24)
      if (selectedMed) {
        doc.setFont('helvetica', 'bold')
        doc.text(`Medication Filter: ${selectedMed}`, 14, 31)
        doc.setFont('helvetica', 'normal')
      }

      // Resident info
      const residentY = headerH + 10
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text(name || '—', 14, residentY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      const infoLine = [
        resident?.room_number ? `Room ${resident.room_number}` : null,
        resident?.date_of_birth ? `DOB: ${formatDateShort(resident.date_of_birth)}` : null,
        `Period: ${rangeLabel}`,
      ].filter(Boolean).join('   ·   ')
      doc.text(infoLine, 14, residentY + 7)

      const tableStartY = residentY + 14

      // ── ADMINISTERED ONLY ──────────────────────────────────────────────────
      if (marMode === 'administered') {
        const rows = []
        filteredRoutine.forEach(r => {
          rows.push({
            sortKey: r.administered_date + '_' + (r.scheduled_time ?? ''),
            cells: [
              formatDateShort(r.administered_date),
              r.administered_at ? formatTime(r.administered_at) : fmt12(r.scheduled_time),
              r.medications?.medication_name ?? '—',
              r.medications?.dose ?? '—',
              'Routine',
              '—',
              r.administered_by ? (staffMap[r.administered_by] ?? 'Staff') : '—',
            ],
            type: 'routine',
          })
        })
        filteredPrn.forEach(r => {
          const dateStr = r.administered_at.split('T')[0]
          rows.push({
            sortKey: r.administered_at,
            cells: [
              formatDateShort(dateStr),
              formatTime(r.administered_at),
              r.medication_name,
              r.dose ?? '—',
              'PRN',
              r.reason,
              r.administered_by ? (staffMap[r.administered_by] ?? 'Staff') : '—',
            ],
            type: 'prn',
          })
        })
        rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))

        autoTable(doc, {
          startY: tableStartY,
          head: [['Date', 'Time Given', 'Medication', 'Dose', 'Type', 'Reason', 'Given By']],
          body: rows.map(r => r.cells),
          styles: { fontSize: 8, cellPadding: 2.5 },
          headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 248, 252] },
          didParseCell(data) {
            if (data.section === 'body' && data.column.index === 4) {
              if (data.cell.raw === 'PRN') {
                data.cell.styles.textColor = [124, 58, 237]
                data.cell.styles.fontStyle = 'bold'
              }
            }
          },
          columnStyles: {
            0: { cellWidth: 26 }, 1: { cellWidth: 22 }, 2: { cellWidth: 42 },
            3: { cellWidth: 20 }, 4: { cellWidth: 18 }, 5: { cellWidth: 32 }, 6: { cellWidth: 30 },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // ── FULL CLINICAL MAR ──────────────────────────────────────────────────
      if (marMode === 'clinical') {
        const dates = datesInRange(from, to)

        // Build lookup: administered_date :: scheduled_time :: medication_id → record
        // Use all routine records for the lookup (so we can mark missed doses correctly)
        const adminLookup = new Map()
        routineRecords.forEach(r => {
          adminLookup.set(`${r.administered_date}::${r.scheduled_time}::${r.medication_id}`, r)
        })

        // PRN by date — respect the medication filter
        const prnByDate = {}
        filteredPrn.forEach(r => {
          const d = r.administered_at.split('T')[0]
          if (!prnByDate[d]) prnByDate[d] = []
          prnByDate[d].push(r)
        })

        // Medications to show — filter by selected med if set
        const medsToShow = selectedMed
          ? allMedications.filter(m => m.medication_name === selectedMed)
          : allMedications

        const rows = []
        dates.forEach(dateStr => {
          const dueMeds = medsToShow.filter(m => isMedDueOnDate(m, dateStr))

          dueMeds.forEach(med => {
            ;(med.scheduled_times ?? []).forEach(time => {
              const record = adminLookup.get(`${dateStr}::${time}::${med.id}`)
              const given = !!record
              rows.push({
                cells: [
                  formatDateShort(dateStr),
                  fmt12(time),
                  med.medication_name,
                  med.dose ?? '—',
                  given ? `✓ Given ${record.administered_at ? formatTime(record.administered_at) : ''}` : '✗ Missed',
                  given && record.administered_by ? (staffMap[record.administered_by] ?? 'Staff') : '—',
                  'Routine',
                  '—',
                ],
                given,
                prn: false,
              })
            })
          })

          ;(prnByDate[dateStr] ?? []).forEach(prn => {
            rows.push({
              cells: [
                formatDateShort(dateStr),
                formatTime(prn.administered_at),
                prn.medication_name,
                prn.dose ?? '—',
                '✓ Given (PRN)',
                prn.administered_by ? (staffMap[prn.administered_by] ?? 'Staff') : '—',
                'PRN',
                prn.reason,
              ],
              given: true,
              prn: true,
            })
          })
        })

        autoTable(doc, {
          startY: tableStartY,
          head: [['Date', 'Scheduled', 'Medication', 'Dose', 'Status', 'Given By', 'Type', 'Reason']],
          body: rows.map(r => r.cells),
          styles: { fontSize: 7.5, cellPadding: 2.5 },
          headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 248, 252] },
          didParseCell(data) {
            if (data.section === 'body') {
              if (data.column.index === 4) {
                const raw = String(data.cell.raw ?? '')
                if (raw.startsWith('✓')) {
                  data.cell.styles.textColor = [5, 150, 105]
                  data.cell.styles.fontStyle = 'bold'
                } else if (raw.startsWith('✗')) {
                  data.cell.styles.textColor = [220, 38, 38]
                  data.cell.styles.fontStyle = 'bold'
                }
              }
              if (data.column.index === 6 && data.cell.raw === 'PRN') {
                data.cell.styles.textColor = [124, 58, 237]
                data.cell.styles.fontStyle = 'bold'
              }
            }
          },
          columnStyles: {
            0: { cellWidth: 22 }, 1: { cellWidth: 18 }, 2: { cellWidth: 38 },
            3: { cellWidth: 16 }, 4: { cellWidth: 32 }, 5: { cellWidth: 26 },
            6: { cellWidth: 14 }, 7: { cellWidth: 26 },
          },
          margin: { left: 14, right: 14 },
        })
      }

      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Page ${i} of ${pageCount}  ·  ${name}  ·  MAR  ·  ${rangeLabel}`,
          14, doc.internal.pageSize.height - 8
        )
      }

      const safeName = name.replace(/\s+/g, '_')
      const safeMed = selectedMed ? `_${selectedMed.replace(/\s+/g, '_')}` : ''
      doc.save(`${safeName}_MAR${safeMed}_${from}_to_${to}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Failed to generate MAR. Please try again.')
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
            {/* MAR mode toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setMarMode('administered')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${marMode === 'administered' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Only shows medications that were actually given"
              >
                Administered
              </button>
              <button
                onClick={() => setMarMode('clinical')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${marMode === 'clinical' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Shows all scheduled doses — given and missed"
              >
                Full Clinical
              </button>
            </div>
            <button
              onClick={generateMAR}
              disabled={generating}
              className="flex items-center gap-2 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {generating ? 'Generating…' : 'Generate MAR'}
            </button>
            <p className="text-[10px] text-slate-400">
              {marMode === 'administered' ? 'Given meds only' : 'Includes missed doses'}
            </p>
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
        <div className="space-y-5 mt-2">
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
