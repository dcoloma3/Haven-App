import jsPDF from 'jspdf'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return ''
  return name.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
}

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function fmtDate(str) {
  if (!str) return ''
  const [y, mo, d] = str.split('-')
  return `${mo}/${d}/${y}`
}

function isMedDueOnDate(med, dateStr) {
  if (med.start_date && dateStr < med.start_date) return false
  if (med.end_date && dateStr > med.end_date) return false
  const type = med.frequency_type || 'daily'
  if (type === 'one_time') return !med.start_date || dateStr === med.start_date
  if (type === 'daily') return true
  if (type === 'specific_days') {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    return (med.frequency_days || []).includes(dayName)
  }
  if (type === 'every_x_days') {
    if (!med.start_date || !med.frequency_interval) return true
    const [sy, sm, sd] = med.start_date.split('-').map(Number)
    const [dy, dm, dd] = dateStr.split('-').map(Number)
    const diffDays = Math.round((new Date(dy, dm - 1, dd) - new Date(sy, sm - 1, sd)) / 86400000)
    return diffDays >= 0 && diffDays % med.frequency_interval === 0
  }
  return true
}

function describeFreq(med) {
  const type = med.frequency_type || 'daily'
  if (type === 'daily') return 'Daily'
  if (type === 'one_time') return 'One Time'
  if (type === 'specific_days') {
    const DAY = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
    return (med.frequency_days || []).map(d => DAY[d] ?? d).join(', ')
  }
  if (type === 'every_x_days') return `Every ${med.frequency_interval || '?'} days`
  return med.frequency || 'Daily'
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateLIC622PDF({ residentId, communityId, year, month, supabase }) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const mm = String(month).padStart(2, '0')
  const startDate = `${year}-${mm}-01`
  const endDate   = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`

  // ── Fetch all data in parallel ──────────────────────────────────────────────
  const [residentRes, communityRes, healthRes, medsRes] = await Promise.all([
    supabase.from('residents').select('*').eq('id', residentId).eq('community_id', communityId).single(),
    supabase.from('communities').select('name, address, phone, license_number').eq('id', communityId).single(),
    supabase.from('health_care').select('allergies').eq('resident_id', residentId).maybeSingle(),
    supabase.from('medications').select('*')
      .eq('resident_id', residentId)
      .eq('community_id', communityId)
      .neq('frequency_type', 'prn')
      .order('medication_name'),
  ])

  const resident  = residentRes.data ?? {}
  const community = communityRes.data ?? {}
  const health    = healthRes.data ?? {}
  const meds      = (medsRes.data ?? []).filter(m => m.scheduled_times?.length > 0)
  const medIds    = meds.map(m => m.id)

  // ── Fetch administration records for the month ──────────────────────────────
  let adminRecords = [], notGivenRecords = []
  if (medIds.length > 0) {
    const [adminRes, ngRes] = await Promise.all([
      supabase.from('medication_administrations').select('*')
        .in('medication_id', medIds)
        .gte('administered_date', startDate)
        .lte('administered_date', endDate),
      supabase.from('medication_not_given').select('*')
        .in('medication_id', medIds)
        .gte('administered_date', startDate)
        .lte('administered_date', endDate),
    ])
    adminRecords    = adminRes.data ?? []
    notGivenRecords = ngRes.data  ?? []
  }

  // ── Staff initials map ──────────────────────────────────────────────────────
  const staffIds = [...new Set(adminRecords.map(r => r.administered_by).filter(Boolean))]
  const staffMap = {}
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles').select('user_id, full_name, first_name, last_name').in('user_id', staffIds)
    ;(profiles ?? []).forEach(p => {
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
      staffMap[p.user_id] = initials(name)
    })
  }

  // ── Lookup maps ─────────────────────────────────────────────────────────────
  const adminMap = {}
  adminRecords.forEach(r => {
    adminMap[`${r.medication_id}::${r.scheduled_time}::${r.administered_date}`] = r
  })
  const ngMap = {}
  notGivenRecords.forEach(r => {
    ngMap[`${r.medication_id}::${r.scheduled_time}::${r.administered_date}`] = r
  })

  // ── Build rows: one per med × time ─────────────────────────────────────────
  const rows = []
  meds.forEach(med => {
    const times = [...(med.scheduled_times ?? [])].sort()
    times.forEach((time, tIdx) => rows.push({ med, time, isFirstTime: tIdx === 0 }))
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF layout  (landscape letter)
  // ─────────────────────────────────────────────────────────────────────────────
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' })
  const pageW  = 279.4
  const pageH  = 215.9
  const margin = 8
  const cW     = pageW - margin * 2   // 263.4 mm usable width

  // Day column width — scale to fill remaining space
  const DAY_W   = 4.6
  const DAYS_W  = daysInMonth * DAY_W
  const INFO_W  = cW - DAYS_W         // ~120 mm for info columns

  // Info column proportions (must sum to INFO_W)
  const C = {
    name:       32,
    dose:       15,
    route:      14,
    freq:       20,
    prescriber: 20,
    start:      10,
    stop:       10,
  }
  C.time = INFO_W - C.name - C.dose - C.route - C.freq - C.prescriber - C.start - C.stop

  // X positions
  const X = {}
  X.name       = margin
  X.dose       = X.name       + C.name
  X.route      = X.dose       + C.dose
  X.freq       = X.route      + C.route
  X.prescriber = X.freq       + C.freq
  X.start      = X.prescriber + C.prescriber
  X.stop       = X.start      + C.start
  X.time       = X.stop       + C.stop
  X.days       = X.time       + C.time

  const ROW_H    = 7    // med-time row height
  const COL_HD_H = 10   // column header row height
  const FOOTER_H = 10   // reserved at page bottom for footer + legend

  let y    = margin
  let page = 1

  // ── Draw page header ────────────────────────────────────────────────────────
  function drawHeader() {
    let hy = margin

    // Title bar
    doc.setFillColor(24, 95, 165)
    doc.rect(margin, hy, cW, 7.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(255, 255, 255)
    doc.text('MEDICATION ADMINISTRATION RECORD  (LIC 622)', margin + cW / 2, hy + 5.2, { align: 'center' })
    hy += 7.5

    // Facility row
    doc.setFillColor(240, 245, 252)
    doc.rect(margin, hy, cW, 7.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    doc.text('FACILITY:', margin + 2, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(community.name || '—', margin + 18, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('ADDRESS:', margin + 90, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(community.address || '—', margin + 108, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('LICENSE #:', margin + 195, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(community.license_number || '—', margin + 213, hy + 4.8)
    hy += 7.5

    // Resident / month row
    doc.setFillColor(255, 255, 255)
    doc.rect(margin, hy, cW, 7.5, 'F')
    const resName = resident.full_name ||
      [resident.first_name, resident.last_name].filter(Boolean).join(' ') || '—'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    doc.text('RESIDENT:', margin + 2, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(resName, margin + 20, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('DOB:', margin + 90, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(fmtDate(resident.date_of_birth) || '—', margin + 99, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('ROOM:', margin + 125, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(String(resident.room_number || '—'), margin + 135, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('MONTH:', margin + 155, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(monthName, margin + 168, hy + 4.8)
    hy += 7.5

    // Physician / allergies row
    doc.setFillColor(255, 251, 240)
    doc.rect(margin, hy, cW, 7.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    doc.text('PHYSICIAN:', margin + 2, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(resident.physician || '—', margin + 21, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.text('PHONE:', margin + 90, hy + 4.8)
    doc.setFont('helvetica', 'normal')
    doc.text(resident.physician_phone || '—', margin + 103, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(160, 30, 30)
    doc.text('ALLERGIES:', margin + 145, hy + 4.8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(160, 30, 30)
    doc.text(health.allergies || 'NKDA', margin + 164, hy + 4.8)
    doc.setTextColor(30, 30, 30)
    hy += 7.5

    // Border around whole header
    doc.setDrawColor(170, 195, 225)
    doc.setLineWidth(0.4)
    doc.rect(margin, margin, cW, hy - margin, 'S')

    return hy + 2
  }

  // ── Draw column header row ──────────────────────────────────────────────────
  function drawColHeader(hy) {
    const infoCols = [
      { label: 'MEDICATION',  x: X.name,       w: C.name },
      { label: 'DOSE',        x: X.dose,       w: C.dose },
      { label: 'ROUTE',       x: X.route,      w: C.route },
      { label: 'FREQUENCY',   x: X.freq,       w: C.freq },
      { label: 'PRESCRIBER',  x: X.prescriber, w: C.prescriber },
      { label: 'START',       x: X.start,      w: C.start },
      { label: 'STOP',        x: X.stop,       w: C.stop },
      { label: 'TIME',        x: X.time,       w: C.time },
    ]

    doc.setFillColor(210, 225, 245)
    doc.rect(margin, hy, cW, COL_HD_H, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(20, 20, 20)

    infoCols.forEach(({ label, x, w }) => {
      doc.text(label, x + w / 2, hy + COL_HD_H / 2 + 1.5, { align: 'center' })
      doc.setDrawColor(160, 190, 220)
      doc.setLineWidth(0.2)
      doc.rect(x, hy, w, COL_HD_H, 'S')
    })

    // Day number headers
    for (let d = 1; d <= daysInMonth; d++) {
      const dx  = X.days + (d - 1) * DAY_W
      const dow = new Date(year, month - 1, d).getDay()
      const isWknd = dow === 0 || dow === 6

      if (isWknd) {
        doc.setFillColor(225, 232, 252)
        doc.rect(dx, hy, DAY_W, COL_HD_H, 'F')
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(20, 20, 20)
      doc.text(String(d), dx + DAY_W / 2, hy + 3.8, { align: 'center' })

      const abbr = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'][dow]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(4.5)
      doc.setTextColor(90, 100, 130)
      doc.text(abbr, dx + DAY_W / 2, hy + COL_HD_H - 2.2, { align: 'center' })

      doc.setDrawColor(160, 190, 220)
      doc.setLineWidth(0.15)
      doc.rect(dx, hy, DAY_W, COL_HD_H, 'S')
    }

    return hy + COL_HD_H
  }

  // ── Draw one med-time row ───────────────────────────────────────────────────
  function drawMedRow(hy, row, rowIndex) {
    const { med, time, isFirstTime } = row
    const bgEven = rowIndex % 2 === 0

    doc.setFillColor(bgEven ? 255 : 250, bgEven ? 255 : 251, bgEven ? 255 : 253)
    doc.rect(margin, hy, cW, ROW_H, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(30, 30, 30)

    if (isFirstTime) {
      // Medication name (bold)
      doc.setFont('helvetica', 'bold')
      const nameLines = doc.splitTextToSize(med.medication_name || '', C.name - 2)
      doc.text(nameLines[0], X.name + 1.5, hy + ROW_H / 2 + 1.5)
      doc.setFont('helvetica', 'normal')
      // Dose
      doc.text(med.dose || '', X.dose + 1.5, hy + ROW_H / 2 + 1.5)
      // Route
      doc.text(med.route || '', X.route + 1.5, hy + ROW_H / 2 + 1.5)
      // Frequency
      const freqLines = doc.splitTextToSize(describeFreq(med), C.freq - 2)
      doc.text(freqLines[0], X.freq + 1.5, hy + ROW_H / 2 + 1.5)
      // Prescriber (resident's physician)
      const prescrLines = doc.splitTextToSize(resident.physician || '', C.prescriber - 2)
      doc.text(prescrLines[0], X.prescriber + 1.5, hy + ROW_H / 2 + 1.5)
      // Start / Stop
      doc.text(fmtDate(med.start_date), X.start + 1, hy + ROW_H / 2 + 1.5)
      doc.text(fmtDate(med.end_date),   X.stop  + 1, hy + ROW_H / 2 + 1.5)
    } else {
      // Continuation row — subtle up-arrow to indicate same med
      doc.setTextColor(190, 195, 205)
      doc.text('↑', X.name + C.name / 2, hy + ROW_H / 2 + 1.5, { align: 'center' })
      doc.setTextColor(30, 30, 30)
    }

    // Time column
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(30, 30, 30)
    doc.text(fmt12(time), X.time + C.time / 2, hy + ROW_H / 2 + 1.5, { align: 'center' })

    // Info column borders
    const infoCols = [
      [X.name, C.name], [X.dose, C.dose], [X.route, C.route],
      [X.freq, C.freq], [X.prescriber, C.prescriber],
      [X.start, C.start], [X.stop, C.stop], [X.time, C.time],
    ]
    infoCols.forEach(([x, w]) => {
      doc.setDrawColor(195, 210, 225)
      doc.setLineWidth(0.15)
      doc.rect(x, hy, w, ROW_H, 'S')
    })

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dx      = X.days + (d - 1) * DAY_W
      const dateStr = `${year}-${mm}-${String(d).padStart(2, '0')}`
      const dow     = new Date(year, month - 1, d).getDay()
      const isWknd  = dow === 0 || dow === 6

      if (isWknd) {
        doc.setFillColor(238, 242, 255)
        doc.rect(dx, hy, DAY_W, ROW_H, 'F')
      }

      const isDue = isMedDueOnDate(med, dateStr)

      if (!isDue) {
        // Med not scheduled this day — shade it out
        doc.setFillColor(220, 223, 228)
        doc.rect(dx + 0.3, hy + 0.3, DAY_W - 0.6, ROW_H - 0.6, 'F')
      } else {
        const aKey = `${med.id}::${time}::${dateStr}`
        const adminRec  = adminMap[aKey]
        const ngRec     = ngMap[aKey]

        let cellLabel = ''
        let cellColor = [30, 30, 30]

        if (adminRec) {
          if (adminRec.admin_status === 'given') {
            cellLabel = staffMap[adminRec.administered_by] || '✓'
            cellColor = [14, 110, 55]
          } else if (adminRec.admin_status === 'refused') {
            cellLabel = 'R'
            cellColor = [185, 28, 28]
          } else if (adminRec.admin_status === 'held') {
            cellLabel = 'H'
            cellColor = [160, 90, 0]
          }
        } else if (ngRec) {
          const CODE = { refused: 'R', held: 'H', absent: 'A', out_of_stock: 'OS', other: 'NG', side_effects: 'SE' }
          cellLabel = CODE[ngRec.reason] || 'NG'
          cellColor = [185, 28, 28]
        }

        if (cellLabel) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(5)
          doc.setTextColor(...cellColor)
          doc.text(cellLabel, dx + DAY_W / 2, hy + ROW_H / 2 + 1.5, { align: 'center' })
          doc.setTextColor(30, 30, 30)
        }
      }

      doc.setDrawColor(195, 210, 225)
      doc.setLineWidth(0.12)
      doc.rect(dx, hy, DAY_W, ROW_H, 'S')
    }
  }

  // ── Draw footer + legend ────────────────────────────────────────────────────
  function drawFooter(pageNum) {
    const fy = pageH - 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(70, 70, 70)
    doc.text('CODES:', margin, fy)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Initials = Given   R = Refused   H = Held   A = Absent   NG = Not Given   OS = Out of Stock   SE = Side Effects   (shaded = not scheduled)',
      margin + 12, fy
    )
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(130, 130, 130)
    doc.text(`Page ${pageNum}   ·   Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageW - margin, fy, { align: 'right' })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  y = drawHeader()
  y = drawColHeader(y)

  const maxY = pageH - margin - FOOTER_H

  rows.forEach((row, idx) => {
    if (y + ROW_H > maxY) {
      drawFooter(page)
      doc.addPage()
      page++
      y = drawHeader()
      y = drawColHeader(y)
    }
    drawMedRow(y, row, idx)
    y += ROW_H
  })

  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'No scheduled medications on file for this period.',
      margin + cW / 2, y + 20, { align: 'center' }
    )
  }

  drawFooter(page)

  // Save
  const resName = (resident.full_name ||
    [resident.first_name, resident.last_name].filter(Boolean).join(' ') || 'resident'
  ).replace(/\s+/g, '_')

  doc.save(`LIC622_${resName}_${year}-${mm}.pdf`)
}
