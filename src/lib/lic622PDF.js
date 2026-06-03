import jsPDF from 'jspdf'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return ''
  const parts = str.split('-')
  if (parts.length !== 3) return str
  const [y, mo, d] = parts
  return `${mo}/${d}/${y}`
}

function nameLastFirst(resident) {
  if (!resident) return ''
  const last = resident.last_name   || ''
  const first = resident.first_name  || ''
  const mid  = resident.middle_name  || ''
  if (!last && !first) return resident.full_name || ''
  return [last, first, mid].filter(Boolean).join(', ')
}

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ─── Layout constants (mm) ────────────────────────────────────────────────────
// Form is landscape letter: 279.4 × 215.9 mm (792 × 612 pts at 0.3528 mm/pt)
// Column x values = LEFT edge of each column (derived from pdfplumber extraction)

const PAGE_W = 279.4
const PAGE_H = 215.9

// Medication table column LEFT edges (mm)
const COL_X = {
  name:        9.0,   // MEDICATION NAME
  strength:   53.0,   // STRENGTH/QUANTITY
  instruct:   75.9,   // INSTRUCTIONS CONTROL/CUSTODY
  exp:       112.9,   // EXPIRATION DATE
  filled:    135.8,   // DATE FILLED
  started:   151.7,   // DATE STARTED
  physician: 169.3,   // PRESCRIBING PHYSICIAN
  rxnum:     195.8,   // PRESCRIPTION NUMBER
  refills:   223.0,   // NO. OF REFILLS
  pharmacy:  241.7,   // NAME OF PHARMACY
}
const COL_RIGHT = PAGE_W - 9.0  // right edge of last column

// Resident info row column LEFT edges (mm)
const RES_X = {
  name:       9.0,   // NAME (LAST FIRST MIDDLE)
  admDate:  137.4,   // ADMISSION DATE
  physician: 171.1,  // ATTENDING PHYSICIAN
  admin:     226.2,  // ADMINISTRATOR
}

// Header field boxes (mm) — top / bottom of each box
const FAC_NAME_BOX  = { x1: 225.4, x2: 270.0, y1: 23.3, y2: 30.0 }  // FACILITY NAME
const FAC_NUM_BOX   = { x1: 225.4, x2: 270.0, y1: 30.0, y2: 41.3 }  // FACILITY NUMBER
const RES_ROW_BOX   = { y1: 41.3,  y2: 47.0  }                       // resident info row

// Medication data rows
const P1_ROW_START_Y = 59.0   // top of first data row, page 1
const P2_ROW_START_Y = 14.5   // top of first data row, page 2
const ROW_H          = 7.2    // row height (mm)
const DATA_FONT_SIZE = 7      // pt

// Part II destruction record column LEFT edges (mm)
const DEST_X = {
  name:       9.0,
  strength:  60.1,
  filled:    83.0,
  rxnum:    106.7,
  disposal: 133.2,
  pharmacy: 152.7,
  sig_admin:194.3,
  sig_wit:  240.6,
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateLIC622PDF({ residentId, communityId, supabase }) {

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const [residentRes, communityRes, medsRes] = await Promise.all([
    supabase.from('residents')
      .select('*')
      .eq('id', residentId)
      .eq('community_id', communityId)
      .single(),
    supabase.from('communities')
      .select('name, address, phone, license_number')
      .eq('id', communityId)
      .single(),
    supabase.from('medications')
      .select('*')
      .eq('resident_id', residentId)
      .eq('community_id', communityId)
      .order('medication_name'),
  ])

  const resident  = residentRes.data  ?? {}
  const community = communityRes.data ?? {}
  const meds      = medsRes.data      ?? []

  // ── Load form background images ──────────────────────────────────────────────
  const [p1Img, p2Img] = await Promise.all([
    fetchImageAsDataUrl('/lic622-p1.jpg'),
    fetchImageAsDataUrl('/lic622-p2.jpg'),
  ])

  // ─────────────────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

  // ── Text style helpers ────────────────────────────────────────────────────────
  function dataStyle(bold = false, size = DATA_FONT_SIZE) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(0, 0, 0)
  }

  // Center X of a medication column
  function colMidX(key) {
    const keys = Object.keys(COL_X)
    const idx  = keys.indexOf(key)
    const right = idx < keys.length - 1 ? COL_X[keys[idx + 1]] : COL_RIGHT
    return (COL_X[key] + right) / 2
  }

  // Vertical center baseline of a row (given row top Y)
  // For 7pt font, the optical center sits ~3.6mm below the row top
  function rowMidY(rowTopY) {
    return rowTopY + ROW_H / 2 + 1.2   // 1.2mm ≈ half cap-height at 7pt
  }

  // Max width available for a column (with 1.5mm padding each side)
  function colMaxW(key) {
    const keys = Object.keys(COL_X)
    const idx  = keys.indexOf(key)
    const right = idx < keys.length - 1 ? COL_X[keys[idx + 1]] : COL_RIGHT
    return right - COL_X[key] - 3.0
  }

  // Truncate text to fit column, then return it
  function fit(text, key) {
    const lines = doc.splitTextToSize(String(text ?? ''), colMaxW(key))
    return lines[0] || ''
  }

  // Centered text helper — places text centered within a box
  function textCenter(text, x1, x2, y) {
    const cx = (x1 + x2) / 2
    doc.text(String(text ?? ''), cx, y, { align: 'center' })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addImage(p1Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  // ── Header fields ─────────────────────────────────────────────────────────────

  // Facility name — centered in the FACILITY NAME box
  dataStyle(false, 8)
  const facNameY = (FAC_NAME_BOX.y1 + FAC_NAME_BOX.y2) / 2 + 1.2
  textCenter(community.name || '', FAC_NAME_BOX.x1, FAC_NAME_BOX.x2, facNameY)

  // Facility number — centered in the FACILITY NUMBER box, slightly larger/bold
  dataStyle(true, 8.5)
  const facNumY = (FAC_NUM_BOX.y1 + FAC_NUM_BOX.y2) / 2 + 1.4
  textCenter(community.license_number || '', FAC_NUM_BOX.x1, FAC_NUM_BOX.x2, facNumY)

  // ── Resident info row ─────────────────────────────────────────────────────────
  dataStyle(false, 7.5)
  const resY = (RES_ROW_BOX.y1 + RES_ROW_BOX.y2) / 2 + 1.2

  // NAME — left-aligned with padding (can be long)
  const resNameStr = nameLastFirst(resident)
  const resNameLines = doc.splitTextToSize(resNameStr, RES_X.admDate - RES_X.name - 3)
  doc.text(resNameLines[0] || '', RES_X.name + 1.5, resY)

  // ADMISSION DATE — centered in its column
  textCenter(
    fmtDate(resident.move_in_date || resident.admission_date) || '',
    RES_X.admDate, RES_X.physician, resY
  )

  // ATTENDING PHYSICIAN — centered in its column
  const physLines = doc.splitTextToSize(resident.physician || '', RES_X.admin - RES_X.physician - 3)
  textCenter(physLines[0] || '', RES_X.physician, RES_X.admin, resY)

  // ADMINISTRATOR — left blank (filled by hand)

  // ── Medication rows ───────────────────────────────────────────────────────────
  const P1_MAX_ROWS = 24
  const p1Meds = meds.slice(0, P1_MAX_ROWS)

  p1Meds.forEach((med, idx) => {
    const rowTop = P1_ROW_START_Y + idx * ROW_H
    const midY   = rowMidY(rowTop)
    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    const physName = med.prescribing_physician || resident.physician || ''

    // MEDICATION NAME — left-aligned (long text)
    dataStyle(true, DATA_FONT_SIZE)
    doc.text(fit(med.medication_name, 'name'), COL_X.name + 1.5, midY)

    // All other columns — centered
    dataStyle(false, DATA_FONT_SIZE)
    doc.text(fit(med.dose || '', 'strength'),              colMidX('strength'),  midY, { align: 'center' })
    doc.text(fit(instrVal,       'instruct'),              colMidX('instruct'),  midY, { align: 'center' })
    doc.text(fit(fmtDate(med.expiration_date), 'exp'),     colMidX('exp'),       midY, { align: 'center' })
    doc.text(fit(fmtDate(med.date_filled),     'filled'),  colMidX('filled'),    midY, { align: 'center' })
    doc.text(fit(fmtDate(med.start_date),      'started'), colMidX('started'),   midY, { align: 'center' })
    doc.text(fit(physName,                     'physician'),colMidX('physician'), midY, { align: 'center' })
    doc.text(fit(med.prescription_number || '','rxnum'),   colMidX('rxnum'),     midY, { align: 'center' })
    doc.text(fit(String(med.refills || ''),    'refills'), colMidX('refills'),   midY, { align: 'center' })
    doc.text(fit(med.pharmacy || '',           'pharmacy'),colMidX('pharmacy'),  midY, { align: 'center' })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage()
  doc.addImage(p2Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  const p2Meds = meds.slice(P1_MAX_ROWS)
  const P2_MAX_MED_ROWS = 15

  p2Meds.slice(0, P2_MAX_MED_ROWS).forEach((med, idx) => {
    const rowTop   = P2_ROW_START_Y + idx * ROW_H
    const midY     = rowMidY(rowTop)
    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    const physName = med.prescribing_physician || resident.physician || ''

    dataStyle(true, DATA_FONT_SIZE)
    doc.text(fit(med.medication_name, 'name'), COL_X.name + 1.5, midY)

    dataStyle(false, DATA_FONT_SIZE)
    doc.text(fit(med.dose || '',                'strength'), colMidX('strength'),  midY, { align: 'center' })
    doc.text(fit(instrVal,                      'instruct'), colMidX('instruct'),  midY, { align: 'center' })
    doc.text(fit(fmtDate(med.expiration_date),  'exp'),      colMidX('exp'),       midY, { align: 'center' })
    doc.text(fit(fmtDate(med.date_filled),      'filled'),   colMidX('filled'),    midY, { align: 'center' })
    doc.text(fit(fmtDate(med.start_date),       'started'),  colMidX('started'),   midY, { align: 'center' })
    doc.text(fit(physName,                      'physician'),colMidX('physician'),  midY, { align: 'center' })
    doc.text(fit(med.prescription_number || '', 'rxnum'),    colMidX('rxnum'),     midY, { align: 'center' })
    doc.text(fit(String(med.refills || ''),     'refills'),  colMidX('refills'),   midY, { align: 'center' })
    doc.text(fit(med.pharmacy || '',            'pharmacy'), colMidX('pharmacy'),  midY, { align: 'center' })
  })

  // Part II destruction record rows left blank for manual completion

  // ─────────────────────────────────────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────────────────────────────────────
  const resName = nameLastFirst(resident).replace(/[, ]+/g, '_') || 'resident'
  const today   = new Date()
  const yyyymm  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  doc.save(`LIC622_${resName}_${yyyymm}.pdf`)
}
