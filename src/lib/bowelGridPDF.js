import jsPDF from 'jspdf'
import { drawHavenMark } from './havenMarkPdf'

// Monthly bowel-movement grid report — MAR-style layout (days across the top,
// AM / PM rows). Each cell shows the Bristol type(s) recorded that period, or a
// dot when an entry exists without a recorded type.

const PAGE_W = 279.4
const PAGE_H = 215.9

const TITLE_H  = 16.0
const RES_H    = 11.0
const COL_HDR_H = 6.0
const HEADER_H = TITLE_H + RES_H + COL_HDR_H

const LEFT_TEXT = 12.0
const LEFT_W    = 40.0            // row-label column width
const DAY_W     = (PAGE_W - 8 - LEFT_W) / 31
const GRID_X    = LEFT_W
const GRID_W    = DAY_W * 31
const ROW_H     = 12.0

const BLUE  = [24, 95, 165]
const BLACK = [0, 0, 0]
const LGRAY = [210, 210, 210]
const DGRAY = [120, 120, 120]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']
const PERIODS = ['AM', 'PM']

function pad2(n) { return String(n).padStart(2, '0') }
function daysInMonth(year, month) { return new Date(year, month, 0).getDate() }

export async function generateBowelGridPDF({ residentId, communityId, month, year, supabase }) {
  const mm   = pad2(month)
  const days = daysInMonth(year, month)

  // Local-month bounds, widened ±1 day in UTC so entries near a boundary aren't
  // dropped; each entry is then placed by its LOCAL date.
  const fromBound = new Date(year, month - 1, 1, 0, 0, 0); fromBound.setDate(fromBound.getDate() - 1)
  const toBound   = new Date(year, month - 1, days, 23, 59, 59); toBound.setDate(toBound.getDate() + 1)

  const [resRes, comRes, bmRes] = await Promise.all([
    supabase.from('residents').select('first_name, last_name, full_name').eq('id', residentId).single(),
    supabase.from('communities').select('name').eq('id', communityId).single(),
    supabase.from('bowel_movements').select('*').eq('resident_id', residentId)
      .gte('occurred_at', fromBound.toISOString()).lte('occurred_at', toBound.toISOString()),
  ])

  const resident = resRes.data ?? {}
  const community = comRes.data ?? {}
  const entries  = bmRes.data ?? []

  const resName = resident.full_name
    || `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
    || 'Unknown'

  // cell key `${period}|${day}` → array of entries
  const cells = {}
  let total = 0
  for (const e of entries) {
    const dt = new Date(e.occurred_at)
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1) continue
    const day = dt.getDate()
    const period = e.period === 'PM' ? 'PM' : 'AM'
    const key = `${period}|${day}`
    ;(cells[key] = cells[key] || []).push(e)
    total++
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  drawHeader(doc, resName, community.name || '', month, year)
  drawGrid(doc, cells, days)
  drawLegend(doc, total)
  drawFooter(doc, month, year)

  const safeName = resName.replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`BowelLog_${safeName}_${year}-${mm}.pdf`)
}

function drawHeader(doc, resName, communityName, month, year) {
  const hx = LEFT_TEXT, hy = 2
  drawHavenMark(doc, hx, hy, 11, BLUE, [55, 138, 221])

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE)
  doc.text('haven', hx + 11, hy + 8)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...BLACK)
  doc.text('Bowel Movement Record', PAGE_W / 2, hy + 6.5, { align: 'center' })

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`${MONTHS[month - 1]}-${year}`, PAGE_W - 8, hy + 6.5, { align: 'right' })

  doc.setDrawColor(...BLUE); doc.setLineWidth(0.5)
  doc.line(LEFT_TEXT, TITLE_H - 2, PAGE_W - 8, TITLE_H - 2)

  const ry = TITLE_H
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.3)
  doc.line(0, ry + RES_H, PAGE_W, ry + RES_H)

  doc.setTextColor(...DGRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text('Resident:', LEFT_TEXT, ry + 5)
  doc.setTextColor(...BLACK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text(resName, LEFT_TEXT + 17, ry + 5.3)

  doc.setTextColor(...DGRAY); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
  doc.text('Facility:', LEFT_TEXT, ry + 9.5)
  doc.setTextColor(...BLACK)
  doc.text(communityName, LEFT_TEXT + 15, ry + 9.5)
}

function drawGrid(doc, cells, days) {
  const topY = HEADER_H

  // Day-number header row
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
  doc.setTextColor(...BLACK)
  doc.text('Period', LEFT_W / 2, topY - COL_HDR_H / 2 + 1.4, { align: 'center' })

  doc.setFontSize(5.5)
  for (let d = 1; d <= 31; d++) {
    const cx = GRID_X + (d - 1) * DAY_W
    if (d > days) {
      doc.setFillColor(243, 243, 243); doc.rect(cx, topY - COL_HDR_H, DAY_W, COL_HDR_H, 'F')
      doc.setTextColor(...LGRAY)
    } else {
      doc.setTextColor(...BLACK)
    }
    doc.text(pad2(d), cx + DAY_W / 2, topY - COL_HDR_H / 2 + 1.4, { align: 'center' })
    doc.setDrawColor(...LGRAY); doc.setLineWidth(0.15)
    doc.line(cx, topY - COL_HDR_H, cx, topY + ROW_H * 2)
  }
  doc.line(GRID_X + GRID_W, topY - COL_HDR_H, GRID_X + GRID_W, topY + ROW_H * 2)

  // AM / PM rows
  PERIODS.forEach((period, i) => {
    const rowY = topY + i * ROW_H

    // Row label
    doc.setFillColor(247, 249, 252); doc.rect(0, rowY, LEFT_W, ROW_H, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLACK)
    doc.text(period, LEFT_W / 2, rowY + ROW_H / 2 + 1.5, { align: 'center' })

    for (let d = 1; d <= days; d++) {
      const cx = GRID_X + (d - 1) * DAY_W
      const list = cells[`${period}|${d}`]
      if (list && list.length) {
        const types = list.map(e => e.bristol_type).filter(Boolean)
        const label = types.length ? types.join(',') : '•'
        doc.setFont('helvetica', 'bold'); doc.setFontSize(types.length > 1 ? 6 : 8)
        doc.setTextColor(...BLUE)
        doc.text(label, cx + DAY_W / 2, rowY + ROW_H / 2 + 1.6, { align: 'center' })
      }
    }
  })

  // Horizontal rules
  doc.setDrawColor(...DGRAY); doc.setLineWidth(0.3)
  doc.line(0, topY - COL_HDR_H, PAGE_W, topY - COL_HDR_H)
  doc.line(0, topY, PAGE_W, topY)
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.2)
  doc.line(0, topY + ROW_H, GRID_X + GRID_W, topY + ROW_H)
  doc.setDrawColor(...DGRAY); doc.setLineWidth(0.3)
  doc.line(0, topY + ROW_H * 2, PAGE_W, topY + ROW_H * 2)
}

function drawLegend(doc, total) {
  const y = HEADER_H + ROW_H * 2 + 10
  const x = LEFT_TEXT
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLACK)
  doc.text('Bristol Stool Scale', x, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...DGRAY)
  const scale = [
    '1 — Separate hard lumps',
    '2 — Lumpy, sausage-shaped',
    '3 — Sausage with cracks',
    '4 — Smooth, soft sausage (normal)',
    '5 — Soft blobs, clear edges',
    '6 — Mushy, ragged edges',
    '7 — Watery, no solid pieces',
  ]
  scale.forEach((s, i) => doc.text(s, x, y + 6 + i * 4.6))

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...BLACK)
  doc.text(`Total bowel movements this month: ${total}`, x, y + 6 + scale.length * 4.6 + 3)
  doc.setTextColor(...DGRAY); doc.setFontSize(7.5)
  doc.text('Cell shows the Bristol type(s) recorded; a dot (•) means an entry was logged without a type.',
    x, y + 6 + scale.length * 4.6 + 8)
}

function drawFooter(doc, month, year) {
  const y = PAGE_H - 8
  doc.setDrawColor(...LGRAY); doc.setLineWidth(0.25)
  doc.line(LEFT_TEXT, y - 3, PAGE_W - 8, y - 3)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...DGRAY)
  const printed = new Date().toLocaleDateString('en-US')
  doc.text(`Print Date ${printed}  ·  Report Date ${MONTHS[month - 1]}-${year}`, LEFT_TEXT, y)
  doc.text('Powered by Haven · havencare.app', PAGE_W - 8, y, { align: 'right' })
}
