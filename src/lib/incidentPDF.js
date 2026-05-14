import jsPDF from 'jspdf'

const TYPE_LABELS = {
  fall: 'Fall',
  injury: 'Injury',
  medication_error: 'Medication Error',
  behavioral: 'Behavioral Incident',
  elopement: 'Elopement',
  property_damage: 'Property Damage',
  other: 'Other',
}

const SEVERITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const STATUS_LABELS = {
  open: 'Open',
  reviewed: 'Reviewed',
  closed: 'Closed',
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
    ' at ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function drawSection(doc, title, y, pageW, margin) {
  doc.setFillColor(240, 245, 251)
  doc.rect(margin, y, pageW - margin * 2, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(24, 95, 165)
  doc.text(title.toUpperCase(), margin + 3, y + 4.5)
  doc.setTextColor(30, 30, 30)
  return y + 9
}

function drawField(doc, label, value, x, y, labelW, maxW) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  const lines = doc.splitTextToSize(value || '—', maxW)
  doc.text(lines, x + labelW, y)
  return y + lines.length * 5
}

export function generateIncidentPDF({ incident, residentName, facilityName, roomNumber }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 15
  const contentW = pageW - margin * 2
  let y = margin

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(24, 95, 165)
  doc.rect(0, 0, pageW, 20, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('INCIDENT REPORT', margin, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 220, 245)
  if (facilityName) doc.text(facilityName, pageW - margin, 9, { align: 'right' })
  doc.text(`Printed: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, pageW - margin, 15, { align: 'right' })

  y = 26

  // Status badge area
  const statusColors = { open: [59, 130, 246], reviewed: [139, 92, 246], closed: [148, 163, 184] }
  const sc = statusColors[incident.status] ?? [148, 163, 184]
  doc.setFillColor(...sc)
  doc.roundedRect(margin, y - 4, 28, 7, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text((STATUS_LABELS[incident.status] ?? 'Open').toUpperCase(), margin + 14, y + 0.5, { align: 'center' })

  const sevColors = { low: [52, 211, 153], medium: [251, 191, 36], high: [239, 68, 68] }
  const sevc = sevColors[incident.severity] ?? [148, 163, 184]
  doc.setFillColor(...sevc)
  doc.roundedRect(margin + 31, y - 4, 26, 7, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.text(`${(SEVERITY_LABELS[incident.severity] ?? '').toUpperCase()} SEVERITY`, margin + 31 + 13, y + 0.5, { align: 'center' })

  doc.setTextColor(30, 30, 30)
  y += 10

  // ── Resident Info ──────────────────────────────────────────
  y = drawSection(doc, 'Resident Information', y, pageW, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text(residentName || '—', margin + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  if (roomNumber) doc.text(`Room ${roomNumber}`, margin + 3, y + 11)
  y += 18

  // ── Incident Details ──────────────────────────────────────
  y = drawSection(doc, 'Incident Details', y, pageW, margin)

  const col1x = margin + 3
  const col2x = margin + contentW / 2 + 3
  const halfW = contentW / 2 - 6

  // Row 1: Date + Time
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Date', col1x, y + 4)
  doc.text('Time', col2x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(fmtDate(incident.incident_date), col1x + 12, y + 4)
  doc.text(fmtTime(incident.incident_time), col2x + 12, y + 4)
  y += 9

  // Row 2: Type + Severity
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Type', col1x, y + 4)
  doc.text('Severity', col2x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(TYPE_LABELS[incident.incident_type] ?? incident.incident_type ?? '—', col1x + 12, y + 4)
  doc.text(SEVERITY_LABELS[incident.severity] ?? '—', col2x + 20, y + 4)
  y += 9

  // Row 3: Location
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Location', col1x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(incident.location || '—', col1x + 20, y + 4)
  y += 11

  // ── Description ──────────────────────────────────────────
  y = drawSection(doc, 'Description of Incident', y, pageW, margin)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  const descLines = doc.splitTextToSize(incident.description || '—', contentW - 6)
  doc.text(descLines, margin + 3, y + 4)
  y += descLines.length * 5 + 7

  // ── Witnesses ─────────────────────────────────────────────
  if (incident.witnesses) {
    y = drawSection(doc, 'Witnesses', y, pageW, margin)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const witLines = doc.splitTextToSize(incident.witnesses, contentW - 6)
    doc.text(witLines, margin + 3, y + 4)
    y += witLines.length * 5 + 7
  }

  // ── Immediate Action ─────────────────────────────────────
  if (incident.immediate_action) {
    y = drawSection(doc, 'Immediate Action Taken', y, pageW, margin)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const actLines = doc.splitTextToSize(incident.immediate_action, contentW - 6)
    doc.text(actLines, margin + 3, y + 4)
    y += actLines.length * 5 + 7
  }

  // ── Notifications ─────────────────────────────────────────
  y = drawSection(doc, 'Notifications', y, pageW, margin)

  // Physician
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Physician Notified', col1x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(
    incident.physician_notified
      ? `Yes${incident.physician_notified_time ? ' — ' + fmtDateTime(incident.physician_notified_time) : ''}`
      : 'No',
    col1x + 38, y + 4
  )
  y += 8

  // Family
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Family Notified', col1x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(
    incident.family_notified
      ? `Yes${incident.family_notified_time ? ' — ' + fmtDateTime(incident.family_notified_time) : ''}`
      : 'No',
    col1x + 38, y + 4
  )
  y += 11

  // ── Follow-Up ─────────────────────────────────────────────
  y = drawSection(doc, 'Follow-Up', y, pageW, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Follow-Up Required', col1x, y + 4)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  doc.text(incident.follow_up_required ? 'Yes' : 'No', col1x + 40, y + 4)
  y += 8

  if (incident.follow_up_required && incident.follow_up_notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('Notes', col1x, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(9)
    const fuLines = doc.splitTextToSize(incident.follow_up_notes, contentW - 6)
    doc.text(fuLines, col1x, y + 10)
    y += fuLines.length * 5 + 10
  } else {
    y += 4
  }

  // ── Reported By ───────────────────────────────────────────
  y = drawSection(doc, 'Reported By', y, pageW, margin)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  const reporterName = incident.reported_by_name || '—'
  const reportedAt = incident.created_at ? fmtDateTime(incident.created_at) : '—'
  doc.text(`${reporterName}   ·   ${reportedAt}`, margin + 3, y + 5)
  y += 13

  // ── Signature Section ────────────────────────────────────
  const sigY = Math.max(y + 6, pageH - 52)

  doc.setDrawColor(200, 210, 220)
  doc.setLineWidth(0.3)
  doc.line(margin, sigY, pageW - margin, sigY)

  const sigBoxW = (contentW - 10) / 2
  // Staff signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('STAFF SIGNATURE', margin, sigY + 6)
  doc.setDrawColor(180, 195, 210)
  doc.line(margin, sigY + 14, margin + sigBoxW, sigY + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(160, 174, 192)
  doc.text('Signature', margin, sigY + 18)
  doc.line(margin, sigY + 24, margin + sigBoxW * 0.55, sigY + 24)
  doc.text('Date', margin, sigY + 28)

  // Manager signature
  const mSigX = margin + sigBoxW + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('MANAGER REVIEW', mSigX, sigY + 6)
  doc.setDrawColor(180, 195, 210)
  doc.line(mSigX, sigY + 14, mSigX + sigBoxW, sigY + 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(160, 174, 192)
  doc.text('Signature', mSigX, sigY + 18)
  doc.line(mSigX, sigY + 24, mSigX + sigBoxW * 0.55, sigY + 24)
  doc.text('Date', mSigX, sigY + 28)

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(180, 190, 200)
  doc.text(`Incident ID: ${incident.id}`, margin, pageH - 6)
  doc.text('CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY', pageW / 2, pageH - 6, { align: 'center' })

  const safe = (s) => (s || 'resident').replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  doc.save(`Incident_${safe(residentName)}_${incident.incident_date ?? 'unknown'}.pdf`)
}
