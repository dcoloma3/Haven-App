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
// Field positions derived from coordinate extraction of original LIC 622 (3/99)
// pt → mm: multiply by 0.3528

const PAGE_W = 279.4
const PAGE_H = 215.9

// Header fields
const FAC_NAME_X  = 228    // x position to write facility name value
const FAC_NAME_Y  = 27     // y position — inside "FACILITY NAME" area
const FAC_NUM_X   = 228    // x position to write facility number
const FAC_NUM_Y   = 38     // y position — inside "FACILITY NUMBER" box

// Resident info row (y=123.6pt → 43.6mm; value written near bottom of row)
const RES_ROW_Y   = 47

// Column x positions (pts → mm, left edge of each column)
// Derived from pdfplumber word positions on original form
const COL_X = {
  name:        9.0,   // MEDICATION NAME       (25pt)
  strength:   53.0,   // STRENGTH/QUANTITY     (150pt)
  instruct:   75.9,   // INSTRUCTIONS          (215pt)
  exp:       112.9,   // EXPIRATION DATE       (320pt)
  filled:    135.8,   // DATE FILLED           (385pt)
  started:   151.7,   // DATE STARTED          (430pt)
  physician: 169.3,   // PRESCRIBING PHYSICIAN (480pt)
  rxnum:     195.8,   // PRESCRIPTION NUMBER   (555pt)
  refills:   223.0,   // NO. OF REFILLS        (632pt)
  pharmacy:  241.7,   // NAME OF PHARMACY      (685pt)
}

// Resident info row x positions
const RES_X = {
  name:       9.0,   // NAME (LAST FIRST MIDDLE)  — 25pt
  admDate:  137.4,   // ADMISSION DATE             — 389pt
  physician: 171.1,  // ATTENDING PHYSICIAN        — 485pt
  admin:     226.2,  // ADMINISTRATOR              — 641pt
}

// Data rows
const P1_ROW_START_Y = 59.0   // first data row top on page 1 (~167pt)
const P2_ROW_START_Y = 14.5   // first data row top on page 2 (~41pt, after col header repeat)
const ROW_H          = 7.2    // row height in mm (~20.4pt per row)
const DATA_FONT_SIZE = 7      // pt — matches form's handwritten-entry scale
const DATA_TEXT_DY   = 5.0   // offset within row to baseline of text

// Part II — destruction record columns (page 2)
// Positions from pdfplumber extraction of page 2
const DEST_X = {
  name:      9.0,    // MEDICATION NAME      (25pt → 8.8mm)
  strength:  60.1,   // STRENGTH/QUANTITY    (170pt → 60.0mm)
  filled:    83.0,   // DATE FILLED          (235pt → 82.9mm)
  rxnum:    106.7,   // PRESCRIPTION NUMBER  (302pt → 106.5mm)
  disposal: 133.2,   // DISPOSAL DATE        (377pt → 133.0mm)
  pharmacy: 152.7,   // NAME OF PHARMACY     (433pt → 152.8mm)
  sig_admin:194.3,   // SIGNATURE OF ADMIN/REP (550pt → 194.0mm)
  sig_wit:  240.6,   // SIGNATURE OF WITNESS   (682pt → 240.7mm)
}
const P2_DEST_START_Y = 133.0  // destruction data rows start (~377pt)
const DEST_ROW_H      = 7.2

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
  // Build PDF — landscape letter, matching the original LIC 622 form
  // ─────────────────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })

  // Helper — set up data-entry text style
  function dataStyle(bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(DATA_FONT_SIZE)
    doc.setTextColor(0, 0, 0)
  }

  // Helper — truncate text to fit column width
  function fit(text, colKey, padMm = 2) {
    const nextKey = Object.keys(COL_X)[Object.keys(COL_X).indexOf(colKey) + 1]
    const maxW = nextKey
      ? (COL_X[nextKey] - COL_X[colKey] - padMm)
      : (PAGE_W - 9 - COL_X[colKey] - padMm)
    const lines = doc.splitTextToSize(String(text ?? ''), maxW)
    return lines[0] || ''
  }

  function fitDest(text, colKey, padMm = 2) {
    const keys = Object.keys(DEST_X)
    const nextKey = keys[keys.indexOf(colKey) + 1]
    const maxW = nextKey
      ? (DEST_X[nextKey] - DEST_X[colKey] - padMm)
      : (PAGE_W - 9 - DEST_X[colKey] - padMm)
    const lines = doc.splitTextToSize(String(text ?? ''), maxW)
    return lines[0] || ''
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1 — Form background + header data + medication rows (first ~24 meds)
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addImage(p1Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  dataStyle()

  // Facility name
  doc.text(community.name || '', FAC_NAME_X, FAC_NAME_Y)

  // Facility number
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(community.license_number || '', FAC_NUM_X, FAC_NUM_Y)
  dataStyle()

  // Resident info row
  doc.text(nameLastFirst(resident),                             RES_X.name,      RES_ROW_Y)
  doc.text(fmtDate(resident.move_in_date || resident.admission_date) || '', RES_X.admDate, RES_ROW_Y)
  doc.text(resident.physician || '',                            RES_X.physician, RES_ROW_Y)
  // ADMINISTRATOR left blank — filled in by hand

  // ── Medication rows ───────────────────────────────────────────────────────────
  // Page 1 can fit approximately 24 rows before the footer
  const P1_MAX_ROWS = 24
  const p1Meds = meds.slice(0, P1_MAX_ROWS)

  p1Meds.forEach((med, idx) => {
    const rowY = P1_ROW_START_Y + idx * ROW_H + DATA_TEXT_DY

    dataStyle(true)
    doc.text(fit(med.medication_name, 'name'), COL_X.name, rowY)

    dataStyle()
    doc.text(fit(med.dose || '',                'strength'),  COL_X.strength,  rowY)

    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    doc.text(fit(instrVal || '',                'instruct'),  COL_X.instruct,  rowY)
    doc.text(fit(fmtDate(med.expiration_date),  'exp'),       COL_X.exp,       rowY)
    doc.text(fit(fmtDate(med.date_filled),      'filled'),    COL_X.filled,    rowY)
    doc.text(fit(fmtDate(med.start_date),       'started'),   COL_X.started,   rowY)
    doc.text(fit(med.prescribing_physician || resident.physician || '', 'physician'), COL_X.physician, rowY)
    doc.text(fit(med.prescription_number || '', 'rxnum'),     COL_X.rxnum,     rowY)
    doc.text(fit(String(med.refills || ''),     'refills'),   COL_X.refills,   rowY)
    doc.text(fit(med.pharmacy || '',            'pharmacy'),  COL_X.pharmacy,  rowY)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2 — Form background + overflow meds (if any) + Part II
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage()
  doc.addImage(p2Img, 'JPEG', 0, 0, PAGE_W, PAGE_H)

  dataStyle()

  // Overflow meds (page 2 carries rows 25+ before Part II)
  const p2Meds = meds.slice(P1_MAX_ROWS)
  const P2_MAX_MED_ROWS = 15  // rows available before Part II header

  p2Meds.slice(0, P2_MAX_MED_ROWS).forEach((med, idx) => {
    const rowY = P2_ROW_START_Y + idx * ROW_H + DATA_TEXT_DY

    dataStyle(true)
    doc.text(fit(med.medication_name, 'name'), COL_X.name, rowY)

    dataStyle()
    doc.text(fit(med.dose || '',                'strength'),  COL_X.strength,  rowY)
    const instrVal = [med.route, med.instructions].filter(Boolean).join(' ')
    doc.text(fit(instrVal || '',                'instruct'),  COL_X.instruct,  rowY)
    doc.text(fit(fmtDate(med.expiration_date),  'exp'),       COL_X.exp,       rowY)
    doc.text(fit(fmtDate(med.date_filled),      'filled'),    COL_X.filled,    rowY)
    doc.text(fit(fmtDate(med.start_date),       'started'),   COL_X.started,   rowY)
    doc.text(fit(med.prescribing_physician || resident.physician || '', 'physician'), COL_X.physician, rowY)
    doc.text(fit(med.prescription_number || '', 'rxnum'),     COL_X.rxnum,     rowY)
    doc.text(fit(String(med.refills || ''),     'refills'),   COL_X.refills,   rowY)
    doc.text(fit(med.pharmacy || '',            'pharmacy'),  COL_X.pharmacy,  rowY)
  })

  // Part II destruction record rows are left blank for manual completion
  // (destruction events are not yet tracked in the app — fill by hand)

  // ─────────────────────────────────────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────────────────────────────────────
  const resName = nameLastFirst(resident).replace(/[, ]+/g, '_') || 'resident'
  const today   = new Date()
  const yyyymm  = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  doc.save(`LIC622_${resName}_${yyyymm}.pdf`)
}
