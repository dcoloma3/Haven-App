import jsPDF from 'jspdf'

// ─────────────────────────────────────────────────────────────────────────────
// Haven Medication Administration Record — Grid Format
// Layout calibrated against Mar Test.pdf reference (pdfplumber coordinate analysis)
// ─────────────────────────────────────────────────────────────────────────────

// ── Layout constants (mm, landscape letter 279.4 × 215.9) ─────────────────────
// Reference measurements (pts → mm at 0.3528 mm/pt):
//   Medication text at x=34pt → 12.0mm
//   Time column start:   x=175pt → 61.7mm
//   Grid start:          x=207.4pt → 73.1mm
//   Day column width:    18pt → 6.35mm
//   Row height:          20pt → 7.06mm
//   5 meds per page, 4 time-slot rows each

const PAGE_W = 279.4
const PAGE_H = 215.9

// Header zones (light, minimal — matches reference)
const TITLE_H   = 16.0   // logo + title + month/year
const RES_H     = 11.0   // Resident name + Observations row
const COL_HDR_H =  6.0   // Day number header row
const HEADER_H  = TITLE_H + RES_H + COL_HDR_H  // 33mm total

// Medication grid geometry (matched to reference)
const LEFT_TEXT = 12.0   // x offset for text in left panel
const LEFT_W    = 61.7   // left panel width (from page left edge)
const TIME_W    = 11.4   // time-label column width
const GRID_X    = LEFT_W + TIME_W   // = 73.1mm — where day cells begin
const DAY_W     = 6.35   // width per day column (18pt)
const GRID_W    = DAY_W * 31        // 196.85mm

// Row geometry
const ROW_H         = 7.06   // one time-slot row (20pt)
const MED_H         = ROW_H * 4    // 28.24mm per medication block
const CONTENT_Y     = HEADER_H     // 45mm
const FOOTER_H      = 17.0
const CONTENT_H     = PAGE_H - CONTENT_Y - FOOTER_H   // ~153.9mm
const MEDS_PER_PAGE = Math.floor(CONTENT_H / MED_H)   // 5

const SLOT_LABELS = ['A.M.', 'Noon', 'P.M.', 'Bed']
const MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

// Colours
const NAVY  = [4,  44,  83]
const BLUE  = [24, 95, 165]
const BLACK = [0,  0,   0]
const WHITE = [255,255,255]
const LGRAY = [210,210,210]
const DGRAY = [120,120,120]
const HBG   = [240,244,248]   // header info row background

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysInMonth(year, month) { return new Date(year, month, 0).getDate() }
function pad2(n) { return String(n).padStart(2, '0') }

function timeToSlot(timeStr) {
  if (!timeStr) return 0
  const h = parseInt(timeStr.split(':')[0], 10)
  if (h < 12) return 0
  if (h === 12) return 1
  if (h < 20) return 2
  return 3
}

// Format initials as "F.L" matching reference style (e.g. "L.O" for Liz Ochoa)
function makeInitials(firstName, lastName) {
  const f = (firstName || '').trim()
  const l = (lastName  || '').trim()
  if (!f && !l) return '?'
  const fi = f[0] || ''
  const li = l[0] || ''
  return `${fi}.${li}`.toUpperCase()
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMarGridPDF({ residentId, communityId, month, year, supabase }) {
  const mm   = pad2(month)
  const days = daysInMonth(year, month)
  const from = `${year}-${mm}-01`
  const to   = `${year}-${mm}-${pad2(days)}`

  // ── Data fetches ─────────────────────────────────────────────────────────────
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

  const resident  = resRes.data   ?? {}
  const community = comRes.data   ?? {}
  const meds      = medsRes.data  ?? []
  const admins    = adminsRes.data ?? []
  const members   = membersRes.data ?? []

  // Staff lookup: userId → { initials, fullName }
  const staffMap = {}
  for (const m of members) {
    const p = m.profiles
    if (!p) continue
    staffMap[m.user_id] = {
      initials: makeInitials(p.first_name, p.last_name),
      fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    }
  }

  // Admin lookup: `${medicationId}|${day}|${slotIndex}` → initials
  const adminLookup = {}
  const staffUsed   = {}   // initials → fullName for footer legend
  for (const a of admins) {
    const day   = parseInt(a.administered_date.split('-')[2], 10)
    const slot  = timeToSlot(a.scheduled_time)
    const key   = `${a.medication_id}|${day}|${slot}`
    const staff = staffMap[a.administered_by]
    if (staff) {
      adminLookup[key]           = staff.initials
      staffUsed[staff.initials]  = staff.fullName
    } else {
      adminLookup[key] = '✓'
    }
  }

  const resName = resident.full_name
    || `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
    || 'Unknown'

  // ── Build PDF ────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

  const totalPages = Math.ceil(meds.length / MEDS_PER_PAGE) || 1

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage()
    // White page background (so transparent areas don't render dark)
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F')
    const chunk = meds.slice(pageIdx * MEDS_PER_PAGE, (pageIdx + 1) * MEDS_PER_PAGE)
    drawHeader(doc, resName, community.name || '', month, year)
    drawColHeaders(doc, days)
    drawMedBlocks(doc, chunk, adminLookup, days)
    drawFooter(doc, staffUsed, month, year, pageIdx + 1, totalPages)
  }

  const safeName = resName.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`MAR_${safeName}_${year}-${mm}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing functions
// ─────────────────────────────────────────────────────────────────────────────

function drawHeader(doc, resName, communityName, month, year) {
  // ── Title row (light, white background — matches reference) ───────────────────
  // Small Haven logo, top-left
  const hx = LEFT_TEXT, hy = 3
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.5)
  doc.triangle(hx, hy + 4, hx + 4, hy, hx + 8, hy + 4, 'S')   // roof
  doc.rect(hx + 0.8, hy + 4, 6.4, 4.5, 'S')                   // walls
  doc.setFillColor(...NAVY)
  doc.rect(hx + 2.6, hy + 5.5, 3, 3, 'F')                     // door

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...NAVY)
  doc.text('haven', hx + 10.5, hy + 6.5)

  // Form title — centered, dark text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BLACK)
  doc.text('Medication Administration Record', PAGE_W / 2, hy + 6.5, { align: 'center' })

  // Month/Year — right
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BLACK)
  doc.text(`${MONTHS[month - 1]}-${year}`, PAGE_W - 8, hy + 6.5, { align: 'right' })

  // Thin accent rule under title
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.5)
  doc.line(LEFT_TEXT, TITLE_H - 2, PAGE_W - 8, TITLE_H - 2)

  // ── Resident info row (white, thin borders) ───────────────────────────────────
  const ry = TITLE_H
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(0, ry + RES_H, PAGE_W, ry + RES_H)

  // Resident name (bold, prominent)
  doc.setTextColor(...DGRAY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Resident:', LEFT_TEXT, ry + 5)
  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(resName, LEFT_TEXT + 17, ry + 5.3)

  // Facility (second line, smaller)
  doc.setTextColor(...DGRAY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Facility:', LEFT_TEXT, ry + 9.5)
  doc.setTextColor(...BLACK)
  doc.text(communityName, LEFT_TEXT + 15, ry + 9.5)

  // Observations label + blank lines (right side)
  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Observations:', PAGE_W * 0.52, ry + 5)
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.25)
  const obsX = PAGE_W * 0.52 + 28
  doc.line(obsX, ry + 5.3, PAGE_W - 8, ry + 5.3)
  doc.line(PAGE_W * 0.52, ry + 9.8, PAGE_W - 8, ry + 9.8)
}

function drawColHeaders(doc, days) {
  const hy = TITLE_H + RES_H

  // "Medication" and "Time" labels (white bg, dark text)
  doc.setTextColor(...BLACK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Medication', LEFT_W / 2, hy + COL_HDR_H / 2 + 1.4, { align: 'center' })
  doc.setFontSize(6.5)
  doc.text('Time', LEFT_W + TIME_W / 2, hy + COL_HDR_H / 2 + 1.4, { align: 'center' })

  // Day numbers (white bg, thin gray cell borders)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  for (let d = 1; d <= 31; d++) {
    const cx  = GRID_X + (d - 1) * DAY_W
    const mid = cx + DAY_W / 2

    if (d > days) {
      doc.setFillColor(243, 243, 243)
      doc.rect(cx, hy, DAY_W, COL_HDR_H, 'F')
      doc.setTextColor(...LGRAY)
    } else {
      doc.setTextColor(...BLACK)
    }
    doc.text(pad2(d), mid, hy + COL_HDR_H / 2 + 1.4, { align: 'center' })

    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.15)
    doc.line(cx, hy, cx, hy + COL_HDR_H)
  }
  doc.line(GRID_X + GRID_W, hy, GRID_X + GRID_W, hy + COL_HDR_H)

  // Thin rules above and below the header row
  doc.setDrawColor(...DGRAY)
  doc.setLineWidth(0.3)
  doc.line(0, hy, PAGE_W, hy)
  doc.line(0, hy + COL_HDR_H, PAGE_W, hy + COL_HDR_H)

  // Vertical separators after Medication and Time columns
  doc.setDrawColor(...LGRAY)
  doc.setLineWidth(0.3)
  doc.line(LEFT_W, hy, LEFT_W, hy + COL_HDR_H)
  doc.line(GRID_X, hy, GRID_X, hy + COL_HDR_H)
}

function drawMedBlocks(doc, meds, adminLookup, days) {
  for (let i = 0; i < meds.length; i++) {
    const med    = meds[i]
    const blockY = CONTENT_Y + i * MED_H

    // ── Left panel text (plain black on white — matches reference) ─────────────
    // Row 0: Medication name (bold)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BLACK)
    const nameLines = doc.splitTextToSize(med.medication_name || '', LEFT_W - LEFT_TEXT - 2)
    doc.text(nameLines[0], LEFT_TEXT, blockY + ROW_H * 0.72)

    // Rows 1–3: Strength / RX Number / Dosage — label + value, all black
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    const detail = (label, value, rowIdx, labelW) => {
      const ty = blockY + ROW_H * rowIdx + ROW_H * 0.62
      doc.setFont('helvetica', 'bold')
      doc.text(label, LEFT_TEXT, ty)
      doc.setFont('helvetica', 'normal')
      const v = doc.splitTextToSize(String(value), LEFT_W - LEFT_TEXT - labelW - 1)[0]
      doc.text(v, LEFT_TEXT + labelW, ty)
    }
    detail('Strength:',  med.dose || '—', 1, 16)
    detail('RX Number:', med.prescription_number || 'N/A', 2, 20)
    detail('Dosage:',    med.route || '—', 3, 14)

    // ── Time labels + grid rows ───────────────────────────────────────────────
    for (let slot = 0; slot < 4; slot++) {
      const rowY = blockY + slot * ROW_H

      // Time label (centered, plain black)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...BLACK)
      doc.text(SLOT_LABELS[slot], LEFT_W + TIME_W / 2, rowY + ROW_H * 0.68, { align: 'center' })

      // Day cells
      for (let d = 1; d <= 31; d++) {
        const cx = GRID_X + (d - 1) * DAY_W

        if (d > days) {
          doc.setFillColor(243, 243, 243)
          doc.rect(cx, rowY, DAY_W, ROW_H, 'F')
        }

        const key  = `${med.id}|${d}|${slot}`
        const init = adminLookup[key]
        if (init && d <= days) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(5.5)
          doc.setTextColor(...BLACK)
          doc.text(init, cx + DAY_W / 2, rowY + ROW_H * 0.68, { align: 'center' })
        }

        // Thin cell border
        doc.setDrawColor(...LGRAY)
        doc.setLineWidth(0.12)
        doc.rect(cx, rowY, DAY_W, ROW_H, 'S')
      }

      // Thin horizontal rule between time rows
      doc.setDrawColor(238, 238, 238)
      doc.setLineWidth(0.12)
      doc.line(0, rowY + ROW_H, GRID_X, rowY + ROW_H)
    }

    // Vertical separators (thin gray) for Medication and Time columns
    doc.setDrawColor(...LGRAY)
    doc.setLineWidth(0.3)
    doc.line(LEFT_W, blockY, LEFT_W, blockY + MED_H)
    doc.line(GRID_X, blockY, GRID_X, blockY + MED_H)

    // Thin separator rule between medication blocks
    doc.setDrawColor(...DGRAY)
    doc.setLineWidth(0.3)
    doc.line(0, blockY + MED_H, PAGE_W, blockY + MED_H)
  }

  // Outer table border (thin)
  const tableTop = CONTENT_Y
  const tableBot = CONTENT_Y + Math.max(meds.length, 1) * MED_H
  doc.setDrawColor(...DGRAY)
  doc.setLineWidth(0.4)
  doc.rect(0, tableTop, PAGE_W, tableBot - tableTop, 'S')
}

function drawFooter(doc, staffUsed, month, year, pageNum, totalPages) {
  const fy = PAGE_H - FOOTER_H

  // Footer background + top border
  doc.setFillColor(245, 247, 250)
  doc.rect(0, fy, PAGE_W, FOOTER_H, 'F')
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.6)
  doc.line(0, fy, PAGE_W, fy)

  // Legend codes (right side, matching reference position)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...BLACK)
  const codes = [['P','Paused medication'], ['R','Refused'], ['O.F','Out of Facility']]
  let lx = PAGE_W * 0.60
  for (const [code, label] of codes) {
    doc.setFont('helvetica', 'bold')
    doc.text(`[${code}]`, lx, fy + 5)
    doc.setFont('helvetica', 'normal')
    const codeW = doc.getTextWidth(`[${code}] `)
    doc.text(label, lx + codeW, fy + 5)
    lx += doc.getTextWidth(`[${code}] ${label}  `) + 2
  }

  // Staff initials key (below legend, right side — matching reference)
  const staffEntries = Object.entries(staffUsed)
  if (staffEntries.length > 0) {
    let sx = PAGE_W * 0.60
    for (const [init, name] of staffEntries) {
      const txt = `[${init}] ${name}  `
      if (sx + doc.getTextWidth(txt) > PAGE_W - 8) break
      doc.setFont('helvetica', 'bold')
      doc.text(`[${init}]`, sx, fy + 10)
      doc.setFont('helvetica', 'normal')
      doc.text(name, sx + doc.getTextWidth(`[${init}] `), fy + 10)
      sx += doc.getTextWidth(txt)
    }
  }

  // Print info (bottom-left, matching reference position)
  const today     = new Date()
  const printDate = `${pad2(today.getMonth()+1)}/${pad2(today.getDate())}/${today.getFullYear()}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 100, 100)
  doc.text(`Print Date  ${printDate}`, 8, fy + 5)
  doc.text(`Report Date  ${MONTHS[month-1]}-${year}`, 8, fy + 9.5)

  // Page number and Haven branding (bottom-right)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 100, 100)
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - 8, fy + 5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...BLUE)
  doc.text('Powered by Haven  ·  havencare.app', PAGE_W - 8, fy + 10, { align: 'right' })
}
