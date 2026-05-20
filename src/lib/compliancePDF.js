import jsPDF from 'jspdf'
import { DOC_TYPES, DOC_CATEGORIES, computeDocStatus } from './complianceDocs'
import { localDateStr } from './dateUtils'

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
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

function checkPage(doc, y, pageH, margin, _pageW) {
  if (y > pageH - 30) {
    doc.addPage()
    // Footer on the new page will be added at end — just reset y
    return margin + 6
  }
  return y
}

const STATUS_LABEL = {
  on_file:       'On File',
  expiring_soon: 'Expiring Soon',
  expired:       'Expired',
  missing:       'Missing',
  not_applicable:'N/A',
}

// Fetch community data and generate PDF
export async function generateCompliancePDF({ residentId: _residentId, communityId, supabase, resident, items: _items, itemMap }) {
  // Fetch community name
  const { data: community } = await supabase
    .from('communities')
    .select('name, address, phone')
    .eq('id', communityId)
    .single()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 15
  const contentW = pageW - margin * 2
  let y = margin

  const fullName = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(' ')
    || resident.full_name || '—'

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(24, 95, 165)
  doc.rect(0, 0, pageW, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text('RESIDENT COMPLIANCE CHART', margin, 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 220, 245)
  doc.text('CCLD Title 22 Compliance Record', margin, 16)

  if (community?.name) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(community.name, pageW - margin, 10, { align: 'right' })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(200, 220, 245)
  doc.text(`Printed: ${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`, pageW - margin, 16, { align: 'right' })

  y = 30

  // ── Resident info block ──────────────────────────────────────────────────────
  y = drawSection(doc, 'Resident Information', y, pageW, margin)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text(fullName, margin + 3, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)

  const col1x = margin + 3
  const col2x = margin + contentW / 2

  y += 10
  const infoFields = [
    ['DOB', fmtDate(resident.date_of_birth)],
    ['Room', resident.room_number || '—'],
    ['Care Level', resident.care_level || '—'],
    ['Admission Date', fmtDate(resident.move_in_date)],
  ]
  infoFields.forEach(([label, val], i) => {
    const x = i % 2 === 0 ? col1x : col2x
    if (i % 2 === 0 && i > 0) y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(label + ':', x, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(val, x + 28, y)
  })

  y += 10

  // Condition flags
  const flags = []
  if (resident.is_hospice) flags.push('Hospice')
  if (resident.has_dementia) flags.push('Dementia/Memory Care')
  if (resident.has_poa) flags.push('Power of Attorney')
  if (resident.has_conservatorship) flags.push('Conservatorship')
  if (flags.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(24, 95, 165)
    doc.text('Conditions: ' + flags.join(' · '), margin + 3, y)
    y += 6
  }

  y += 3

  // ── Document category tables ──────────────────────────────────────────────────

  const colW = [90, 28, 25, 28, 15]   // doc name | status | date | expiry | signed
  const colX = [margin + 3, margin + 93, margin + 121, margin + 146, margin + 174]
  const headers = ['Document', 'Status', 'Completed', 'Expires', 'Signed By']
  const ROW_H = 6.5

  function drawTableHeader(y) {
    doc.setFillColor(230, 241, 251)
    doc.rect(margin, y, contentW, ROW_H, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(24, 95, 165)
    headers.forEach((h, i) => doc.text(h, colX[i], y + 4.5))
    return y + ROW_H
  }

  Object.keys(DOC_CATEGORIES).forEach(cat => {
    const catDef = DOC_CATEGORIES[cat]

    // Gather docs for this category that apply to this resident
    const docKeys = Object.entries(DOC_TYPES)
      .filter(([, def]) => {
        if (def.category !== cat) return false
        if (def.alwaysShow || !def.conditionFlag) return true
        return resident[def.conditionFlag] === true
      })
      .map(([key]) => key)

    if (!docKeys.length) return

    y = checkPage(doc, y, pageH, margin, pageW)
    y = drawSection(doc, catDef.label, y, pageW, margin)

    y = drawTableHeader(y)

    docKeys.forEach((key, idx) => {
      y = checkPage(doc, y, pageH, margin, pageW)

      const item = itemMap?.[key]
      const def = DOC_TYPES[key]
      const status = item ? computeDocStatus(item) : 'missing'

      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252)
        doc.rect(margin, y, contentW, ROW_H, 'F')
      }

      // Status color dot
      const dotColors = {
        on_file:       [16, 185, 129],
        expiring_soon: [245, 158, 11],
        expired:       [239, 68, 68],
        missing:       [148, 163, 184],
        not_applicable:[203, 213, 225],
      }
      const [dr, dg, db] = dotColors[status] ?? dotColors.missing
      doc.setFillColor(dr, dg, db)
      doc.circle(colX[1] - 2, y + ROW_H / 2, 1.2, 'F')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(status === 'not_applicable' ? 160 : 30, 30, 30)

      const nameText = doc.splitTextToSize(def?.label ?? key, colW[0] - 2)
      doc.text(nameText[0], colX[0], y + 4.5)   // truncate to 1 line for table

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      const dotColors2 = {
        on_file:       [10, 150, 100],
        expiring_soon: [200, 120, 0],
        expired:       [200, 50, 50],
        missing:       [100, 116, 139],
        not_applicable:[180, 180, 180],
      }
      const [tr, tg, tb] = dotColors2[status] ?? dotColors2.missing
      doc.setTextColor(tr, tg, tb)
      doc.text(STATUS_LABEL[status] ?? status, colX[1], y + 4.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(30, 30, 30)
      doc.text(fmtDate(item?.date_completed), colX[2], y + 4.5)
      doc.text(fmtDate(item?.expiration_date), colX[3], y + 4.5)

      const signedBy = item?.signed_by ? item.signed_by.slice(0, 12) : '—'
      doc.text(signedBy, colX[4], y + 4.5)

      y += ROW_H
    })

    y += 4
  })

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(180, 190, 200)
    doc.text('Generated by Haven · For CCLD inspection use', margin, pageH - 6)
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' })
  }

  const safe = (s) => (s || 'resident').replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  const dateStr = localDateStr()
  doc.save(`Compliance_${safe(fullName)}_${dateStr}.pdf`)
}
