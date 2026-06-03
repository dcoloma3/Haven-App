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
  const last  = resident.last_name   || ''
  const first = resident.first_name  || ''
  const mid   = resident.middle_name || ''
  if (!last && !first) return resident.full_name || ''
  return [last, first, mid].filter(Boolean).join(', ')
}

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ─── Layout constants ─────────────────────────────────────────────────────────
// All in mm. Form is landscape letter: 279.4 × 215.9 mm.
// Pixel analysis of lic622-p1.jpg (1584×1224px → 0.1764 mm/px) used to find
// exact blank fill-in zones distinct from pre-printed label text.

const PAGE_W = 279.4
const PAGE_H = 215.9

// ── Header fill-in Y positions (blank zones BELOW each label) ─────────────────
// Brightness analysis showed:
//   FACILITY NAME label text:   y ≈ 25.1–27.4 mm
//   Blank fill-in below label:  y ≈ 27.8–30.0 mm  → write at 28.8mm
//
//   FACILITY NUMBER label text: y ≈ 33.7–35.8 mm
//   Blank fill-in:              y ≈ 36.0–41.8 mm  → write at 38.5mm
//
//   Resident row labels:        y ≈ 42.1–45.5 mm  (NAME, ADMISSION DATE, etc.)
//   Blank fill-in area:         y ≈ 45.5–50.0 mm  → write at 48.0mm

const FAC_NAME_Y    = 28.8   // baseline for facility name value
const FAC_NAME_X1   = 225.4  // left edge of right column
const FAC_NAME_X2   = 270.0  // right edge of right column

const FAC_NUM_Y     = 38.5   // baseline for facility number value
const FAC_NUM_X1    = 225.4
const FAC_NUM_X2    = 270.0

const RES_Y         = 48.0   // baseline for ALL resident header values

// Resident header column left edges
const RES_X = {
  name:       9.0,   // NAME (LAST FIRST MIDDLE)   0–137mm
  admDate:  137.4,   // ADMISSION DATE             137–171mm
  physician: 171.1,  // ATTENDING PHYSICIAN        171–226mm
  admin:     226.2,  // ADMINISTRATOR              226–270mm
}

// ── Medication table column LEFT edges (mm) ───────────────────────────────────
const COL_X = {
  name:        9.0,
  strength:   53.0,
  instruct:   75.9,
  exp:       112.9,
  filled:    135.8,
  started:   151.7,
  physician: 169.3,
  rxnum:     195.8,
  refills:   223.0,
  pharmacy:  241.7,
}
const COL_RIGHT = PAGE_W - 9.0

// ── Data row geometry ─────────────────────────────────────────────────────────
// Pixel scan found row separator lines at 8.47mm intervals starting at 59.09mm.
// Page 1 has 17 rows (59.09 to 203.55mm).
// Page 2 med-overflow rows start at 16.4mm; ~11 rows before Part II at 111.65mm.

const P1_ROW_START = 59.09   // top of first data row, page 1
const P2_ROW_START = 16.40   // top of first data row, page 2
const ROW_H        =  8.47   // row height (px scan confirmed)
const ROW_TEXT_DY  =  5.5    // text baseline offset from row top (≈ vertical center)
const DATA_FONT    =  7      // pt
const P1_MAX_ROWS  = 17
const P2_MAX_ROWS  = 11

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateLIC622PDF({ residentId, communityId, supabase }) {

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

  const [p1Img, p2Img] = await Promise.all([
    fetchImageAsDataUrl('/lic622-p1.jpg'),
    fetchImageAsDataUrl('/lic622-p2.jpg'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function style(bold = false, size = DATA_FONT) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(0, 0, 0)
  }

  // Horizontal center of a column
  function colCx(key) {
    const keys = Object.keys(COL_X)
    const i    = keys.indexOf(key)
    const r    = i < keys.length - 1 ? COL_X[keys[i + 1]] : COL_RIGHT
    return (COL_X[key] + r) / 2
  }

  // Max width of a column (3mm total padding)
  function colW(key) {
    const keys = Object.keys(COL_X)
    const i    = keys.indexOf(key)
    const r    = i < keys.length - 1 ? COL_X[keys[i + 1]] : COL_RIGHT
    return r - COL_X[key] - 3
  }

  // Truncate text to one line fitting the column
  function fit(text, key) {
    return doc.splitTextToSize(String(text ?? ''), colW(key))[0] || ''
  }

  // Center text within [x1, x2] at y
  function cx(text, x1, x2, y) {
    doc.text(String(text ?? ''), (x1 + x2) / 2, y, { align: 'center' })
  }

  // Truncate and center within a column
  function col(text, key, y) {
    doc.text(fit(text, key), colCx(key), y, { align: 'center' })
  }

  // ── PAGE 1 ───────────────────────────────────────────────────────────────────
  doc.addImage(p1Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  // Facility name — centered in the blank zone below "FACILITY NAME" label
  style(false, 8)
  cx(community.name || '', FAC_NAME_X1, FAC_NAME_X2, FAC_NAME_Y)

  // Facility number — bold, centered in blank zone below "FACILITY NUMBER" label
  style(true, 8.5)
  cx(community.license_number || '', FAC_NUM_X1, FAC_NUM_X2, FAC_NUM_Y)

  // Resident row — all values at RES_Y (in the blank area below the label row)
  style(false, 7.5)

  // Name: left-aligned with 2mm padding (can be long)
  const nameStr   = nameLastFirst(resident)
  const nameLines = doc.splitTextToSize(nameStr, RES_X.admDate - RES_X.name - 4)
  doc.text(nameLines[0] || '', RES_X.name + 2, RES_Y)

  // Admission date: centered in its column
  cx(fmtDate(resident.move_in_date || resident.admission_date) || '',
     RES_X.admDate, RES_X.physician, RES_Y)

  // Attending physician: centered in its column
  const physStr   = resident.physician || ''
  const physLines = doc.splitTextToSize(physStr, RES_X.admin - RES_X.physician - 4)
  cx(physLines[0] || '', RES_X.physician, RES_X.admin, RES_Y)

  // Administrator: left blank (filled by hand)

  // ── Medication rows ───────────────────────────────────────────────────────────
  meds.slice(0, P1_MAX_ROWS).forEach((med, idx) => {
    const y        = P1_ROW_START + idx * ROW_H + ROW_TEXT_DY
    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    const phys     = med.prescribing_physician || resident.physician || ''

    // Medication name: bold, left-aligned
    style(true, DATA_FONT)
    doc.text(fit(med.medication_name, 'name'), COL_X.name + 2, y)

    // Remaining columns: normal weight, horizontally centered
    style(false, DATA_FONT)
    col(med.dose || '',              'strength',  y)
    col(instrVal,                    'instruct',  y)
    col(fmtDate(med.expiration_date),'exp',       y)
    col(fmtDate(med.date_filled),    'filled',    y)
    col(fmtDate(med.start_date),     'started',   y)
    col(phys,                        'physician', y)
    col(med.prescription_number || '','rxnum',    y)
    col(String(med.refills || ''),   'refills',   y)
    col(med.pharmacy || '',          'pharmacy',  y)
  })

  // ── PAGE 2 ───────────────────────────────────────────────────────────────────
  doc.addPage()
  doc.addImage(p2Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  // Overflow meds (rows 18+)
  meds.slice(P1_MAX_ROWS, P1_MAX_ROWS + P2_MAX_ROWS).forEach((med, idx) => {
    const y        = P2_ROW_START + idx * ROW_H + ROW_TEXT_DY
    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    const phys     = med.prescribing_physician || resident.physician || ''

    style(true, DATA_FONT)
    doc.text(fit(med.medication_name, 'name'), COL_X.name + 2, y)

    style(false, DATA_FONT)
    col(med.dose || '',              'strength',  y)
    col(instrVal,                    'instruct',  y)
    col(fmtDate(med.expiration_date),'exp',       y)
    col(fmtDate(med.date_filled),    'filled',    y)
    col(fmtDate(med.start_date),     'started',   y)
    col(phys,                        'physician', y)
    col(med.prescription_number || '','rxnum',    y)
    col(String(med.refills || ''),   'refills',   y)
    col(med.pharmacy || '',          'pharmacy',  y)
  })

  // Part II destruction record rows left blank for manual completion

  // ── Save ─────────────────────────────────────────────────────────────────────
  const resName = nameLastFirst(resident).replace(/[, ]+/g, '_') || 'resident'
  const today   = new Date()
  const yyyymm  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  doc.save(`LIC622_${resName}_${yyyymm}.pdf`)
}
