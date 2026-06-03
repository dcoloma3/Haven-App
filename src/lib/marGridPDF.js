import jsPDF from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────────
// Haven Medication Administration Record — Grid Format
// Matches the layout of Mar Test.pdf (Advantis format) with Haven branding
// ─────────────────────────────────────────────────────────────────────────────

// ── Layout constants (mm, landscape letter 279.4 × 215.9) ────────────────────
const PAGE_W  = 279.4
const PAGE_H  = 215.9
const ML      = 6         // left margin
const MR      = 6         // right margin

const NAVY    = [4,  44,  83]    // #042C53
const BLUE    = [24, 95, 165]   // #185FA5
const LGRAY   = [220, 220, 220]
const MGRAY   = [150, 150, 150]
const BLACK   = [0, 0, 0]
const WHITE   = [255, 255, 255]

// Header zones
const TITLE_H   = 14    // Haven branding bar
const RES_H     = 11    // resident name / observations row
const COL_HDR_H = 8     // day-number row (01 02 … 31)
const HEADER_H  = TITLE_H + RES_H + COL_HDR_H  // 33mm

// Med grid
const LEFT_W   = 57     // medication details panel width (mm)
const TIME_W   = 14     // "A.M."/"Noon" etc. column width
const GRID_X   = ML + LEFT_W + TIME_W   // where day cells begin
const GRID_W   = PAGE_W - MR - GRID_X   // remaining width for 31 day cols
const DAY_W    = GRID_W / 31            // width per day column (~6.3mm)
const ROW_H    = 7.0    // height of each time-slot row
const MED_H    = ROW_H * 4              // 4 rows per medication (28mm)

// Footer
const FOOTER_H     = 18
const CONTENT_Y    = HEADER_H           // where med blocks start
const CONTENT_H    = PAGE_H - HEADER_H - FOOTER_H
const MEDS_PER_PAGE = Math.floor(CONTENT_H / MED_H)   // ≈ 5

const SLOT_LABELS  = ['A.M.', 'Noon', 'P.M.', 'Bed']
const MONTHS       = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December']

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function timeToSlot(timeStr) {
  if (!timeStr) return 0
  const h = parseInt(timeStr.split(':')[0], 10)
  if (h < 12) return 0   // A.M.
  if (h === 12) return 1 // Noon
  if (h < 20) return 2   // P.M.
  return 3               // Bed
}

function initials(firstName, lastName) {
  const f = (firstName || '').trim()
  const l = (lastName  || '').trim()
  if (!f && !l) return '?'
  return `${f[0] || ''}${l[0] || ''}`.toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMarGridPDF({ residentId, communityId, month, year, supabase }) {
  const mm    = pad2(month)
  const days  = daysInMonth(year, month)
  const from  = `${year}-${mm}-01`
  const to    = `${year}-${mm}-${pad2(days)}`

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const [resRes, comRes, medsRes, adminsRes, membersRes] = await Promise.all([
    supabase.from('residents')
      .select('first_name, last_name, full_name, physician')
      .eq('id', residentId).eq('community_id', communityId).single(),
    supabase.from('communities')
      .select('name, license_number')
      .eq('id', communityId).single(),
    supabase.from('medications')
      .select('id, medication_name, dose, prescription_number, route, frequency_type, scheduled_times')
      .eq('resident_id', residentId).eq('community_id', communityId)
      .order('medication_name'),
    supabase.from('medication_administrations')
      .select('medication_id, scheduled_time, administered_date, administered_by')
      .eq('resident_id', residentId)
      .gte('administered_date', from).lte('administered_date', to),
    supabase.from('community_members')
      .select('user_id, profiles(first_name, last_name)')
      .eq('community_id', communityId),
  ])

  const resident = resRes.data  ?? {}
  const community = comRes.data ?? {}
  const meds     = medsRes.data ?? []
  const admins   = adminsRes.data ?? []
  const members  = membersRes.data ?? []

  // Build staff lookup: userId → { initials, fullName }
  const staffMap = {}
  for (const m of members) {
    const p = m.profiles
    if (!p) continue
    staffMap[m.user_id] = {
      initials: initials(p.first_name, p.last_name),
      fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    }
  }

  // Build admin lookup: `${medicationId}|${day}|${slotIndex}` → initials string
  const adminLookup = {}
  const staffUsed = {}   // initials → fullName for footer legend
  for (const a of admins) {
    const day  = parseInt(a.administered_date.split('-')[2], 10)
    const slot = timeToSlot(a.scheduled_time)
    const key  = `${a.medication_id}|${day}|${slot}`
    const staff = staffMap[a.administered_by]
    if (staff) {
      adminLookup[key] = staff.initials
      staffUsed[staff.initials] = staff.fullName
    } else {
      adminLookup[key] = '✓'
    }
  }

  // Resident full name
  const resName = resident.full_name
    || `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
    || 'Unknown'

  // ── Build PDF ───────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  let pageNum  = 1
  let medIdx   = 0
  const totalPages = Math.ceil(meds.length / MEDS_PER_PAGE) || 1

  function drawPage(medsOnPage) {
    drawHeader(doc, resName, community.name || '', month, year)
    drawColHeaders(doc, days)
    drawMedBlocks(doc, medsOnPage, medIdx, adminLookup, days)
    drawFooter(doc, staffUsed, month, year, pageNum, totalPages)
    pageNum++
    medIdx += medsOnPage.length
  }

  // Chunk medications into pages
  for (let i = 0; i < Math.max(meds.length, 1); i += MEDS_PER_PAGE) {
    if (i > 0) doc.addPage()
    const chunk = meds.slice(i, i + MEDS_PER_PAGE)
    drawPage(chunk)
  }

  // Save
  const safeName = resName.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`MAR_${safeName}_${year}-${mm}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing functions
// ─────────────────────────────────────────────────────────────────────────────

function drawHeader(doc, resName, communityName, month, year) {
  // ── Title bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PAGE_W, TITLE_H, 'F')

  // Haven house icon (simplified SVG path as jsPDF lines)
  const hx = ML + 1, hy = 2
  doc.setDrawColor(...WHITE)
  doc.setLineWidth(0.6)
  // House outline
  doc.lines([
    [4, -3.5],   // left slope up
    [4,  3.5],   // right slope down
  ], hx, hy + 4.5, [1,1], null, false)
  doc.lines([
    [0,  0],
    [8,  0],
    [8, -7],
    [0, -7],
  ], hx, hy + 8.5, [1,1], null, true)
  // Door
  doc.setFillColor(...WHITE)
  doc.rect(hx + 2.5, hy + 5, 3, 3.5, 'F')

  // "haven" wordmark
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text('haven', hx + 10, hy + 7)

  // Form title centered
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Medication Administration Record', PAGE_W / 2, TITLE_H / 2 + 2, { align: 'center' })

  // Month/Year right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${MONTHS[month - 1]} ${year}`, PAGE_W - MR, TITLE_H / 2 + 2, { align: 'right' })

  // ── Resident info row ───────────────────────────────────────────────────────
  const ry = TITLE_H
  doc.setFillColor(240, 244, 248)
  doc.rect(0, ry, PAGE_W, RES_H, 'F')
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.rect(0, ry, PAGE_W, RES_H, 'S')

  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Resident:', ML + 1, ry + 4.5)
  doc.setFont('helvetica', 'normal')
  doc.text(resName, ML + 19, ry + 4.5)

  doc.setFont('helvetica', 'bold')
  doc.text('Facility:', ML + 1, ry + 9)
  doc.setFont('helvetica', 'normal')
  doc.text(communityName, ML + 17, ry + 9)

  doc.setFont('helvetica', 'bold')
  doc.text('Observations:', PAGE_W * 0.55, ry + 4.5)
  // Observation line for handwriting
  doc.setDrawColor(...MGRAY)
  doc.setLineWidth(0.3)
  doc.line(PAGE_W * 0.55 + 28, ry + 5, PAGE_W - MR, ry + 5)
  doc.line(PAGE_W * 0.55, ry + 9.5, PAGE_W - MR, ry + 9.5)
}

function drawColHeaders(doc, days) {
  const hy = TITLE_H + RES_H

  // Background for left panel and time column headers
  doc.setFillColor(...BLUE)
  doc.rect(0, hy, ML + LEFT_W + TIME_W, COL_HDR_H, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...WHITE)
  doc.text('Medication', ML + LEFT_W / 2, hy + COL_HDR_H / 2 + 1.5, { align: 'center' })
  doc.text('Time', ML + LEFT_W + TIME_W / 2, hy + COL_HDR_H / 2 + 1.5, { align: 'center' })

  // Day number headers
  doc.setFillColor(230, 238, 248)
  doc.rect(GRID_X, hy, GRID_W, COL_HDR_H, 'F')

  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  for (let d = 1; d <= 31; d++) {
    const cx = GRID_X + (d - 1) * DAY_W + DAY_W / 2
    if (d <= days) {
      doc.text(pad2(d), cx, hy + COL_HDR_H / 2 + 1.5, { align: 'center' })
    } else {
      // Days past end of month — gray out
      doc.setTextColor(...LGRAY)
      doc.text(pad2(d), cx, hy + COL_HDR_H / 2 + 1.5, { align: 'center' })
      doc.setTextColor(...NAVY)
    }
    // Vertical dividers
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.2)
    doc.line(GRID_X + (d - 1) * DAY_W, hy, GRID_X + (d - 1) * DAY_W, hy + COL_HDR_H)
  }
  // Right border of grid
  doc.line(GRID_X + GRID_W, hy, GRID_X + GRID_W, hy + COL_HDR_H)

  // Outer border
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.rect(0, hy, PAGE_W, COL_HDR_H, 'S')
}

function drawMedBlocks(doc, meds, startIdx, adminLookup, days) {
  for (let i = 0; i < meds.length; i++) {
    const med = meds[i]
    const blockY = CONTENT_Y + i * MED_H

    // Zebra background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 253)
      doc.rect(0, blockY, PAGE_W, MED_H, 'F')
    }

    // ── Left panel ────────────────────────────────────────────────────────────
    // Medication name (row 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BLACK)
    const nameLines = doc.splitTextToSize(med.medication_name || '', LEFT_W - 4)
    doc.text(nameLines[0], ML + 2, blockY + ROW_H * 0.65)

    // Strength (row 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(80, 80, 80)
    const strengthText = med.dose ? `Strength: ${med.dose}` : 'Strength: —'
    doc.text(doc.splitTextToSize(strengthText, LEFT_W - 4)[0], ML + 2, blockY + ROW_H + ROW_H * 0.65)

    // RX Number (row 2)
    const rxText = med.prescription_number ? `RX#: ${med.prescription_number}` : 'RX#: —'
    doc.text(doc.splitTextToSize(rxText, LEFT_W - 4)[0], ML + 2, blockY + ROW_H * 2 + ROW_H * 0.65)

    // Dosage/instructions (row 3) — route + frequency
    const parts = [med.route, med.dose].filter(Boolean)
    const dosageText = `Dosage: ${parts.join(' · ') || '—'}`
    doc.text(doc.splitTextToSize(dosageText, LEFT_W - 4)[0], ML + 2, blockY + ROW_H * 3 + ROW_H * 0.65)

    // ── Time labels + grid rows ────────────────────────────────────────────────
    for (let slot = 0; slot < 4; slot++) {
      const rowY = blockY + slot * ROW_H

      // Time label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(...NAVY)
      doc.text(SLOT_LABELS[slot], ML + LEFT_W + TIME_W / 2, rowY + ROW_H * 0.65, { align: 'center' })

      // Day cells
      for (let d = 1; d <= 31; d++) {
        const cx = GRID_X + (d - 1) * DAY_W
        const cy = rowY
        const cellW = DAY_W
        const cellH = ROW_H

        // Fill days past month end
        if (d > days) {
          doc.setFillColor(245, 245, 245)
          doc.rect(cx, cy, cellW, cellH, 'F')
        }

        // Administration initials
        const key = `${med.id}|${d}|${slot}`
        const init = adminLookup[key]
        if (init && d <= days) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(5.5)
          doc.setTextColor(...BLUE)
          doc.text(init, cx + cellW / 2, cy + cellH * 0.68, { align: 'center' })
        }

        // Cell borders
        doc.setDrawColor(...LGRAY)
        doc.setLineWidth(0.15)
        doc.rect(cx, cy, cellW, cellH, 'S')
      }

      // Horizontal rule between time rows (except after the last)
      if (slot < 3) {
        doc.setDrawColor(...LGRAY)
        doc.setLineWidth(0.2)
        doc.line(ML, rowY + ROW_H, PAGE_W - MR, rowY + ROW_H)
      }
    }

    // Left panel border
    doc.setDrawColor(...MGRAY)
    doc.setLineWidth(0.3)
    doc.rect(ML, blockY, LEFT_W, MED_H, 'S')

    // Time column border
    doc.rect(ML + LEFT_W, blockY, TIME_W, MED_H, 'S')

    // Outer medication block border
    doc.setDrawColor(...NAVY)
    doc.setLineWidth(0.5)
    doc.rect(0, blockY, PAGE_W, MED_H, 'S')

    // Vertical dividers between day columns
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.2)
    for (let d = 1; d <= 31; d++) {
      doc.line(GRID_X + (d - 1) * DAY_W, blockY, GRID_X + (d - 1) * DAY_W, blockY + MED_H)
    }
  }
}

function drawFooter(doc, staffUsed, month, year, pageNum, totalPages) {
  const fy = PAGE_H - FOOTER_H

  // Footer background
  doc.setFillColor(245, 247, 250)
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.line(0, fy, PAGE_W, fy)

  // Legend codes (left)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...BLACK)
  doc.text('Legend:', ML, fy + 5)
  doc.setFont('helvetica', 'normal')
  const codes = [
    ['P', 'Paused'],
    ['R', 'Refused'],
    ['O.F', 'Out of Facility'],
    ['N/A', 'Not Available'],
  ]
  let lx = ML + 15
  for (const [code, label] of codes) {
    doc.setFont('helvetica', 'bold')
    doc.text(`[${code}]`, lx, fy + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(label, lx + doc.getTextWidth(`[${code}]`) + 1, fy + 5)
    lx += doc.getTextWidth(`[${code}] ${label}`) + 6
  }

  // Staff initials key (center)
  const staffEntries = Object.entries(staffUsed)
  if (staffEntries.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text('Staff:', ML, fy + 11)
    doc.setFont('helvetica', 'normal')
    let sx = ML + 13
    for (const [init, name] of staffEntries) {
      const txt = `[${init}] ${name}`
      doc.text(txt, sx, fy + 11)
      sx += doc.getTextWidth(txt) + 6
      if (sx > PAGE_W * 0.7) break  // don't overflow into right panel
    }
  }

  // Print info (right)
  const today = new Date()
  const printDate = `${pad2(today.getMonth()+1)}/${pad2(today.getDate())}/${today.getFullYear()}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 100, 100)

  const infoLines = [
    `Print Date: ${printDate}`,
    `Report: ${MONTHS[month-1]} ${year}`,
    `Page ${pageNum} of ${totalPages}`,
  ]
  let iy = fy + 5
  for (const line of infoLines) {
    doc.text(line, PAGE_W - MR, iy, { align: 'right' })
    iy += 4
  }

  // "Powered by Haven" branding
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6)
  doc.setTextColor(...BLUE)
  doc.text('Powered by Haven · havencare.app', PAGE_W - MR, fy + FOOTER_H - 2, { align: 'right' })
}
