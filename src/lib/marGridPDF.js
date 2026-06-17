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

// Sentinel for "given but staff name couldn't be resolved" — rendered as a
// filled dot (a literal ✓ glyph is not in jsPDF's default font and prints blank).
const GIVEN_MARK = '__GIVEN__'

const SLOT_LABELS = ['A.M.', 'Noon', 'P.M.', 'Bed']
const MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

// Colours
const NAVY  = [4,  44,  83]
const BLUE  = [24, 95, 165]
const BLACK = [0,  0,   0]
const LGRAY = [210,210,210]
const DGRAY = [120,120,120]

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysInMonth(year, month) { return new Date(year, month, 0).getDate() }
function pad2(n) { return String(n).padStart(2, '0') }

function hourToSlot(h) {
  if (h < 12) return 0    // A.M.
  if (h === 12) return 1  // Noon
  if (h < 20) return 2    // P.M.
  return 3                // Bed
}

function timeToSlot(timeStr) {
  if (!timeStr) return 0
  return hourToSlot(parseInt(timeStr.split(':')[0], 10))
}

// Short human description of a medication's frequency, for the Dosage line
function freqDesc(med) {
  const t = med.frequency_type
  if (!t || t === 'daily') return 'Daily'
  if (t === 'prn') return 'As needed'
  if (t === 'one_time') return 'One time'
  if (t === 'specific_days') return 'Specific days'
  if (t === 'every_x_days') return med.frequency_interval ? `Every ${med.frequency_interval} days` : 'Every X days'
  return ''
}

// Build "F.L" initials from a profile. Prefers first/last name, then falls back
// to splitting full_name (the field that's reliably populated in this app).
function makeInitials(profile) {
  if (!profile) return null
  const f = (profile.first_name || '').trim()
  const l = (profile.last_name || '').trim()
  if (f || l) {
    return [f[0], l[0]].filter(Boolean).join('.').toUpperCase()
  }
  const full = (profile.full_name || '').trim()
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}.${parts[parts.length - 1][0]}`.toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  }
  return null
}

function profileFullName(profile) {
  if (!profile) return 'Staff'
  const full = (profile.full_name || '').trim()
  if (full) return full
  const fl = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  return fl || 'Staff'
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMarGridPDF({ residentId, communityId, month, year, supabase }) {
  const mm   = pad2(month)
  const days = daysInMonth(year, month)
  const from = `${year}-${mm}-01`
  const to   = `${year}-${mm}-${pad2(days)}`

  // PRN administered_at is a UTC timestamp; query a ±1-day-wider window so a dose
  // given near a month boundary in local time isn't dropped by UTC bounds. Each
  // PRN is then placed by its LOCAL date/time and filtered to the report month.
  const prnFromBound = new Date(year, month - 1, 1, 0, 0, 0)
  prnFromBound.setDate(prnFromBound.getDate() - 1)
  const prnToBound = new Date(year, month - 1, days, 23, 59, 59)
  prnToBound.setDate(prnToBound.getDate() + 1)

  // ── First batch: resident, community, medications, staff ─────────────────────
  // Use select('*') for medications so a column that doesn't exist in a given
  // environment (e.g. prescription_number) can't error the whole query → blank.
  // Scope meds by resident_id only (matches MedicationList); RLS still isolates.
  const [resRes, comRes, medsRes, membersRes] = await Promise.all([
    supabase.from('residents')
      .select('first_name, last_name, full_name, physician')
      .eq('id', residentId).eq('community_id', communityId).single(),
    supabase.from('communities')
      .select('name, license_number')
      .eq('id', communityId).single(),
    supabase.from('medications')
      .select('*')
      .eq('resident_id', residentId)
      .order('medication_name'),
    supabase.from('community_members')
      .select('user_id, role')
      .eq('community_id', communityId),
  ])

  const resident  = resRes.data   ?? {}
  const community = comRes.data   ?? {}
  const meds      = medsRes.data  ?? []
  const members   = membersRes.data ?? []
  const medIds    = meds.map(m => m.id)

  // ── Second batch: administrations ────────────────────────────────────────────
  // Query routine administrations by medication_id (matches how the Dispense tab
  // reads them) rather than by resident_id — robust to any resident_id drift on
  // administration rows. PRN rows have a reliable NOT NULL resident_id.
  // select('*') so the administered_by_name / _caregiver_id columns are included
  // when present, but a pre-migration DB (without them) doesn't error the query.
  const [adminsRes, prnRes] = await Promise.all([
    medIds.length
      ? supabase.from('medication_administrations')
          .select('*')
          .in('medication_id', medIds)
          .gte('administered_date', from).lte('administered_date', to)
      : Promise.resolve({ data: [] }),
    supabase.from('prn_administrations')
      .select('*')
      .eq('resident_id', residentId)
      .gte('administered_at', prnFromBound.toISOString())
      .lte('administered_at', prnToBound.toISOString()),
  ])

  const admins = adminsRes.data ?? []
  const prns   = prnRes.data   ?? []

  // Resolve administering-staff names. community_members has NO foreign key to
  // profiles, so an embedded join (profiles(...)) returns null and every cell
  // falls back to the dot. Instead, fetch profiles directly by user_id — the
  // same two-step pattern StaffDirectory uses. Include both community members
  // and anyone who actually administered (administered_by) so every cell resolves.
  const staffIds = [...new Set([
    ...members.map(m => m.user_id),
    ...admins.map(a => a.administered_by),
    ...prns.map(p => p.administered_by),
  ].filter(Boolean))]

  let profiles = []
  if (staffIds.length) {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, first_name, last_name')
      .in('user_id', staffIds)
    profiles = data ?? []
  }

  const staffMap = {}
  for (const p of profiles) {
    if (!p.user_id) continue
    staffMap[p.user_id] = { initials: makeInitials(p), fullName: profileFullName(p) }
  }

  // Admin lookup: `${medicationId}|${day}|${slotIndex}` → initials
  const adminLookup = {}
  const staffUsed   = {}   // initials → fullName for footer legend

  // Resolve who administered: prefer the caregiver NAME recorded on the row
  // (the person selected on the device), then fall back to the logged-in account.
  function resolveAdministrator(row) {
    if (row.administered_by_name) {
      return { initials: makeInitials({ full_name: row.administered_by_name }), fullName: row.administered_by_name.trim() }
    }
    const staff = staffMap[row.administered_by]
    if (staff && staff.initials) return staff
    return null
  }

  // Routine administrations
  for (const a of admins) {
    const day  = parseInt(a.administered_date.split('-')[2], 10)
    const slot = timeToSlot(a.scheduled_time)
    const key  = `${a.medication_id}|${day}|${slot}`
    const who  = resolveAdministrator(a)
    if (who && who.initials) {
      adminLookup[key]        = who.initials
      staffUsed[who.initials] = who.fullName
    } else {
      adminLookup[key] = GIVEN_MARK   // given, but administrator couldn't be resolved
    }
  }

  // PRN administrations — link by medication_name (no medication_id FK on prn_administrations)
  const medByName = {}
  for (const m of meds) medByName[(m.medication_name || '').trim().toLowerCase()] = m.id
  for (const p of prns) {
    const medId = medByName[(p.medication_name || '').trim().toLowerCase()]
    if (!medId) continue   // PRN med not in this resident's medication list — skip
    // Place by LOCAL date/time (matches the time shown in the on-screen log)
    const dt = new Date(p.administered_at)
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1) continue  // outside report month
    const day  = dt.getDate()
    const slot = hourToSlot(dt.getHours())
    const key  = `${medId}|${day}|${slot}`
    const who  = resolveAdministrator(p)
    if (who && who.initials) {
      adminLookup[key]        = who.initials
      staffUsed[who.initials] = who.fullName
    } else if (!adminLookup[key]) {
      adminLookup[key] = GIVEN_MARK
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
  // Always render a full page of MEDS_PER_PAGE blocks; pad with blank rows
  // (matches a real MAR form — blank blocks leave room for handwritten meds)
  for (let i = 0; i < MEDS_PER_PAGE; i++) {
    const med    = meds[i] || null
    const blockY = CONTENT_Y + i * MED_H

    // ── Left panel text (plain black on white — matches reference) ─────────────
    if (med) {
      // Medication name (bold) — shrink + wrap to 2 lines for long names
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BLACK)
      const nameW = LEFT_W - LEFT_TEXT - 2
      doc.setFontSize(7.5)
      let nameLines = doc.splitTextToSize(med.medication_name || '', nameW)
      if (nameLines.length > 1) {
        doc.setFontSize(6.2)
        nameLines = doc.splitTextToSize(med.medication_name || '', nameW)
      }
      if (nameLines.length === 1) {
        doc.text(nameLines[0], LEFT_TEXT, blockY + ROW_H * 0.72)
      } else {
        doc.text(nameLines.slice(0, 2), LEFT_TEXT, blockY + ROW_H * 0.4, { lineHeightFactor: 1.15 })
      }
    }

    // Strength / RX Number / Dosage — labels always shown; values only if med
    doc.setFontSize(6.8)
    const detail = (label, value, rowIdx, labelW) => {
      const ty = blockY + ROW_H * rowIdx + ROW_H * 0.62
      doc.setTextColor(med ? 0 : 150, med ? 0 : 150, med ? 0 : 150)
      doc.setFont('helvetica', 'bold')
      doc.text(label, LEFT_TEXT, ty)
      if (med) {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...BLACK)
        const v = doc.splitTextToSize(String(value), LEFT_W - LEFT_TEXT - labelW - 1)[0]
        doc.text(v, LEFT_TEXT + labelW, ty)
      }
    }
    detail('Strength:',  med?.dose || '—', 1, 16)
    detail('RX Number:', med?.prescription_number || 'N/A', 2, 20)
    const dosageText = med
      ? ([med.route, freqDesc(med)].filter(Boolean).join(' · ') || '—')
      : '—'
    detail('Dosage:', dosageText, 3, 14)

    // ── Time labels + grid rows ───────────────────────────────────────────────
    for (let slot = 0; slot < 4; slot++) {
      const rowY = blockY + slot * ROW_H

      // Time label (always shown, even on blank blocks)
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

        if (med) {
          const init = adminLookup[`${med.id}|${d}|${slot}`]
          if (init && d <= days) {
            if (init === GIVEN_MARK) {
              // given, staff unresolved → filled dot (always renders)
              doc.setFillColor(...BLACK)
              doc.circle(cx + DAY_W / 2, rowY + ROW_H * 0.5, 0.7, 'F')
            } else {
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(5.5)
              doc.setTextColor(...BLACK)
              doc.text(init, cx + DAY_W / 2, rowY + ROW_H * 0.68, { align: 'center' })
            }
          }
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

  // Outer table border (thin) — spans the full page of blocks
  const tableTop = CONTENT_Y
  const tableBot = CONTENT_Y + MEDS_PER_PAGE * MED_H
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
