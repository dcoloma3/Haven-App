import { useEffect, useState, useMemo } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../../lib/supabase'

function fmt12(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function residentFullName(r) {
  if (!r) return ''
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '')
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

export default function ResidentMedHistory({ residentId, resident }) {
  const [records, setRecords] = useState([])
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    // Load this resident's full administration history
    supabase
      .from('medication_administrations')
      .select(`
        id,
        scheduled_time,
        administered_date,
        administered_at,
        administered_by,
        medications!medication_id(medication_name, dose)
      `)
      .eq('resident_id', residentId)
      .order('administered_date', { ascending: false })
      .order('scheduled_time', { ascending: true })
      .then(({ data }) => {
        setRecords(data ?? [])
        setLoading(false)
      })

    // Load staff profiles for "given by" attribution
    supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
        setStaffMap(map)
      })
  }, [residentId])

  // Group records by date for the on-screen list
  const grouped = useMemo(() => {
    const map = {}
    records.forEach(r => {
      if (!map[r.administered_date]) map[r.administered_date] = []
      map[r.administered_date].push(r)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [records])

  function handleDownloadPDF() {
    setGenerating(true)
    try {
      const doc = new jsPDF()
      const name = residentFullName(resident)
      const generatedOn = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })

      // ── Header ──────────────────────────────────────────────
      doc.setFillColor(4, 44, 83) // #042C53
      doc.rect(0, 0, 220, 28, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Medication Administration Record', 14, 12)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${generatedOn}`, 14, 20)

      // ── Resident info block ──────────────────────────────────
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Resident', 14, 38)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(name || '—', 14, 45)

      if (resident?.room_number) {
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(9)
        doc.text(`Room ${resident.room_number}`, 14, 51)
      }

      doc.setTextColor(100, 100, 100)
      doc.setFontSize(9)
      doc.text(`Total doses on record: ${records.length}`, 14, 58)

      // ── Table ────────────────────────────────────────────────
      autoTable(doc, {
        startY: 65,
        head: [['Date', 'Medication', 'Dose', 'Scheduled', 'Given At', 'Given By']],
        body: records.map(r => [
          formatDate(r.administered_date),
          r.medications?.medication_name ?? '—',
          r.medications?.dose ?? '—',
          fmt12(r.scheduled_time),
          r.administered_at ? formatTime(r.administered_at) : '—',
          r.administered_by ? (staffMap[r.administered_by] ?? 'Staff') : '—',
        ]),
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [24, 95, 165], // #185FA5
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [245, 248, 252],
        },
        columnStyles: {
          0: { cellWidth: 34 },
          1: { cellWidth: 42 },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      })

      // ── Footer on each page ──────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Page ${i} of ${pageCount}  ·  ${name}  ·  Medication Administration Record`,
          14,
          doc.internal.pageSize.height - 8
        )
      }

      const safeName = name.replace(/\s+/g, '_')
      doc.save(`${safeName}_medication_history.pdf`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-medium text-slate-700">Medication History</h2>
          {!loading && (
            <p className="text-xs text-slate-400 mt-0.5">
              {records.length} dose{records.length !== 1 ? 's' : ''} administered
            </p>
          )}
        </div>
        {!loading && records.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            disabled={generating}
            className="flex items-center gap-2 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <DownloadIcon />
            {generating ? 'Generating…' : 'Download PDF'}
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && records.length === 0 && (
        <p className="text-sm text-slate-400">No medications have been administered yet.</p>
      )}

      {!loading && grouped.length > 0 && (
        <div className="space-y-5">
          {grouped.map(([dateStr, dayRecords]) => (
            <div key={dateStr}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {formatDate(dateStr)}
                </span>
                <div className="flex-1 border-t border-slate-100" />
                <span className="text-xs text-slate-400">{dayRecords.length} dose{dayRecords.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {dayRecords.map(record => {
                  const med = record.medications
                  const givenBy = record.administered_by ? (staffMap[record.administered_by] ?? 'Staff') : null
                  return (
                    <div key={record.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {med?.medication_name ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {med?.dose ?? '—'}
                          {givenBy && <span> · Given by {givenBy}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-600">{fmt12(record.scheduled_time)}</p>
                        {record.administered_at && (
                          <p className="text-xs text-emerald-600 mt-0.5">✓ {formatTime(record.administered_at)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
