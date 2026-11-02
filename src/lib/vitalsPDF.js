import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { localDateStr } from './dateUtils'

// Per-patient vital signs report — full history for one resident.
export function generateVitalsPDF({ resident, communityName, records }) {
  const doc = new jsPDF({ orientation: 'landscape' })

  const name = resident
    ? (`${resident.first_name || ''} ${resident.last_name || ''}`.trim() || resident.full_name || 'Resident')
    : 'Resident'

  doc.setFontSize(18)
  doc.setTextColor(4, 44, 83)
  doc.text('Vital Signs Report', 14, 18)

  doc.setFontSize(12)
  doc.setTextColor(30, 41, 59)
  doc.text(name, 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const sub = [
    resident?.room_number ? `Room ${resident.room_number}` : null,
    resident?.date_of_birth ? `DOB ${resident.date_of_birth}` : null,
    communityName || null,
  ].filter(Boolean).join('   ·   ')
  if (sub) doc.text(sub, 14, 32)
  doc.text(`Generated ${new Date().toLocaleString()}   ·   ${records.length} reading${records.length === 1 ? '' : 's'}`, 14, 37)

  const rows = [...records]
    .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
    .map(v => [
      new Date(v.recorded_at).toLocaleString(),
      v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—',
      v.pulse != null ? String(v.pulse) : '—',
      v.temperature != null ? `${v.temperature}` : '—',
      v.oxygen_saturation != null ? `${v.oxygen_saturation}%` : '—',
      v.blood_glucose != null ? String(v.blood_glucose) : '—',
      v.weight != null ? `${v.weight}` : '—',
      v.pain_scale != null ? `${v.pain_scale}/10` : '—',
      v.recorded_by_name || '—',
      v.notes || '',
    ])

  autoTable(doc, {
    startY: 42,
    head: [['Date / Time', 'BP (mmHg)', 'Pulse', 'Temp (°F)', 'O₂ %', 'Glucose', 'Weight (lbs)', 'Pain', 'Recorded By', 'Notes']],
    body: rows.length ? rows : [['No readings recorded', '', '', '', '', '', '', '', '', '']],
    headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 9: { cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  })

  const safe = name.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`vitals_${safe}_${localDateStr()}.pdf`)
}
