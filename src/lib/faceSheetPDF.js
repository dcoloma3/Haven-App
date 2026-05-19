import jsPDF from 'jspdf'

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function calcAge(dob) {
  if (!dob) return null
  const birth = new Date(dob + 'T00:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const mo = today.getMonth() - birth.getMonth()
  if (mo < 0 || (mo === 0 && today.getDate() < birth.getDate())) age--
  return age
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

const CARE_LEVEL_LABELS = {
  AL: 'Assisted Living',
  IL: 'Independent Living',
  MC: 'Memory Care',
  SNF: 'Skilled Nursing',
  Hospice: 'Hospice',
  Respite: 'Respite Care',
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function generateFaceSheetPDF({ residentId, communityId, supabase }) {
  // Fetch all data in parallel
  const [residentRes, contactsRes, healthRes, medsRes, communityRes] = await Promise.all([
    supabase.from('residents').select('*').eq('id', residentId).eq('community_id', communityId).single(),
    supabase.from('emergency_contacts').select('*').eq('resident_id', residentId).order('is_primary', { ascending: false }),
    supabase.from('health_care').select('*').eq('resident_id', residentId).maybeSingle(),
    supabase.from('medications')
      .select('medication_name, dose, frequency, frequency_type')
      .eq('resident_id', residentId)
      .eq('community_id', communityId)
      .order('medication_name'),
    supabase.from('communities').select('name, address, phone').eq('id', communityId).single(),
  ])

  const resident = residentRes.data ?? {}
  const contacts = contactsRes.data ?? []
  const health = healthRes.data ?? {}
  const meds = medsRes.data ?? []
  const community = communityRes.data ?? {}

  // ─── PDF setup ─────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = 215.9
  const pageH = 279.4
  const margin = 15
  const contentW = pageW - margin * 2
  let y = margin

  const col1x = margin + 3
  const col2x = margin + contentW / 2 + 3
  const halfW = contentW / 2 - 6

  // Add new page and reset y when running out of space
  function checkBreak(needed) {
    if (y + needed > pageH - 20) {
      doc.addPage()
      y = margin
    }
  }

  const residentName =
    [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(' ') ||
    resident.full_name ||
    'Unknown Resident'

  const safe = (s) => (s || 'resident').replace(/[^a-z0-9]/gi, '_').slice(0, 30)
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })

  // ─── HEADER ────────────────────────────────────────────────────────────
  doc.setFillColor(24, 95, 165)
  doc.rect(0, 0, pageW, 20, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('RESIDENT FACE SHEET', margin, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 220, 245)
  if (community.name) doc.text(community.name, pageW - margin, 9, { align: 'right' })
  doc.text(`Printed: ${today}`, pageW - margin, 15, { align: 'right' })

  y = 26

  // ─── RESIDENT NAME ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(residentName, margin, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const subParts = [`Room ${resident.room_number || '—'}`]
  if (community.name) subParts.push(community.name)
  doc.text(subParts.join('  ·  '), margin, y + 12)
  y += 18

  // ─── PERSONAL INFORMATION ──────────────────────────────────────────────
  y = drawSection(doc, 'Personal Information', y, pageW, margin)

  const age = calcAge(resident.date_of_birth)
  const dobDisplay = resident.date_of_birth
    ? `${fmtDate(resident.date_of_birth)}${age !== null ? `  (Age ${age})` : ''}`
    : '—'

  // Row 1: DOB / Gender
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Date of Birth', col1x, y + 4)
  doc.text('Gender', col2x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(dobDisplay, col1x + 28, y + 4)
  doc.text(resident.gender || '—', col2x + 16, y + 4)
  y += 8

  // Row 2: Admission Date / Care Level
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Admission Date', col1x, y + 4)
  doc.text('Care Level', col2x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(fmtDate(resident.move_in_date), col1x + 28, y + 4)
  doc.text(CARE_LEVEL_LABELS[resident.care_level] ?? (resident.care_level || '—'), col2x + 24, y + 4)
  y += 8

  // Row 3: Payer Type
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Payer Type', col1x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(resident.admission_type || '—', col1x + 24, y + 4)
  y += 11

  // ─── EMERGENCY CONTACTS ────────────────────────────────────────────────
  checkBreak(20)
  y = drawSection(doc, 'Emergency Contacts', y, pageW, margin)

  if (contacts.length === 0) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(150, 160, 175)
    doc.text('No emergency contacts on record', col1x, y + 5)
    y += 11
  } else {
    contacts.forEach((c, i) => {
      checkBreak(16)
      // Contact name + badges
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
      doc.text(c.contact_name || '—', col1x, y + 4)
      let badgeX = col1x + doc.getTextWidth(c.contact_name || '—') + 3
      if (c.is_primary) {
        doc.setFillColor(24, 95, 165)
        doc.roundedRect(badgeX, y + 0.5, 16, 5, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(255, 255, 255)
        doc.text('PRIMARY', badgeX + 8, y + 4, { align: 'center' })
        badgeX += 18
      }
      if (c.is_poa) {
        doc.setFillColor(124, 58, 237)
        doc.roundedRect(badgeX, y + 0.5, 10, 5, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(255, 255, 255)
        doc.text('POA', badgeX + 5, y + 4, { align: 'center' })
      }
      // Details row
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 116, 139)
      const details = [c.relationship, c.phone_number, c.email].filter(Boolean).join('  ·  ')
      doc.text(details || '—', col1x, y + 10)
      y += 14
      // Thin divider between contacts
      if (i < contacts.length - 1) {
        doc.setDrawColor(230, 235, 240); doc.setLineWidth(0.2)
        doc.line(margin, y - 1, pageW - margin, y - 1)
      }
    })
    y += 2
  }

  // ─── PHYSICIAN & HOSPITAL ──────────────────────────────────────────────
  checkBreak(25)
  y = drawSection(doc, 'Physician & Hospital', y, pageW, margin)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Primary Physician', col1x, y + 4)
  doc.text('Phone', col2x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(resident.physician || '—', col1x + 34, y + 4)
  doc.text(resident.physician_phone || '—', col2x + 14, y + 4)
  y += 8

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Preferred Hospital', col1x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  const hospLines = doc.splitTextToSize(health.hospital_preferences || '—', contentW - 40)
  doc.text(hospLines, col1x + 36, y + 4)
  y += hospLines.length * 5 + 6

  // ─── INSURANCE ─────────────────────────────────────────────────────────
  checkBreak(22)
  y = drawSection(doc, 'Insurance', y, pageW, margin)

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Carrier', col1x, y + 4)
  doc.text('Member ID', col2x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  doc.text(resident.insurance_carrier || '—', col1x + 16, y + 4)
  doc.text(resident.insurance_id || '—', col2x + 22, y + 4)
  y += 11

  // ─── DIAGNOSES ─────────────────────────────────────────────────────────
  checkBreak(20)
  y = drawSection(doc, 'Diagnoses / Medical History', y, pageW, margin)
  if (health.diagnoses) {
    const diagLines = doc.splitTextToSize(health.diagnoses, contentW - 6)
    checkBreak(diagLines.length * 5 + 7)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
    doc.text(diagLines, col1x, y + 4)
    y += diagLines.length * 5 + 9
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(150, 160, 175)
    doc.text('Not recorded', col1x, y + 5)
    y += 11
  }

  // ─── ALLERGIES (highlighted red box) ──────────────────────────────────
  checkBreak(24)
  y = drawSection(doc, 'Allergies', y, pageW, margin)
  if (health.allergies) {
    const allergyLines = doc.splitTextToSize(health.allergies, contentW - 10)
    const boxH = allergyLines.length * 5 + 8
    doc.setFillColor(254, 226, 226)
    doc.rect(margin, y, contentW, boxH, 'F')
    doc.setDrawColor(252, 165, 165); doc.setLineWidth(0.4)
    doc.rect(margin, y, contentW, boxH, 'S')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(185, 28, 28)
    doc.text(allergyLines, margin + 5, y + 6)
    y += boxH + 5
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(150, 160, 175)
    doc.text('No known allergies on record', col1x, y + 5)
    y += 11
  }

  // ─── CODE STATUS ───────────────────────────────────────────────────────
  checkBreak(18)
  y = drawSection(doc, 'Advance Directives / Code Status', y, pageW, margin)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('DNR on File', col1x, y + 4)
  doc.setFontSize(9)
  if (health.dnr_on_file === true) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(185, 28, 28)
    doc.text('YES — Do Not Resuscitate', col1x + 24, y + 4)
  } else if (health.dnr_on_file === false) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
    doc.text('No (Full Code)', col1x + 24, y + 4)
  } else {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
    doc.text('—', col1x + 24, y + 4)
  }
  y += 11

  // ─── CURRENT MEDICATIONS ───────────────────────────────────────────────
  checkBreak(20)
  y = drawSection(doc, `Current Medications (${meds.length})`, y, pageW, margin)

  if (meds.length === 0) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(150, 160, 175)
    doc.text('No active medications on record', col1x, y + 5)
    y += 11
  } else {
    // Column header row
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139)
    doc.text('MEDICATION', col1x, y + 3)
    doc.text('DOSE', col2x - 5, y + 3)
    doc.text('FREQUENCY', col2x + 35, y + 3)
    y += 6

    meds.forEach((med, i) => {
      checkBreak(8)
      // Alternating row shade
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, contentW, 7, 'F')
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30)
      // Truncate long med names to fit column
      const medNameFull = med.medication_name || '—'
      const medNameLines = doc.splitTextToSize(medNameFull, halfW - 5)
      doc.text(medNameLines[0], col1x, y + 5)

      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 100, 120)
      doc.text(med.dose || '—', col2x - 5, y + 5)

      const freqDisplay = med.frequency_type === 'prn'
        ? 'PRN (as needed)'
        : (med.frequency || '—')
      const freqLines = doc.splitTextToSize(freqDisplay, halfW)
      doc.text(freqLines[0], col2x + 35, y + 5)

      y += 7
    })
    y += 4
  }

  // ─── SPECIAL NEEDS ─────────────────────────────────────────────────────
  checkBreak(30)
  y = drawSection(doc, 'Special Needs', y, pageW, margin)

  // Fall Risk
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Fall Risk', col1x, y + 4)
  doc.setFontSize(9)
  const frColors = { High: [185, 28, 28], Medium: [161, 98, 7], Low: [21, 128, 61] }
  const frColor = frColors[health.fall_risk] ?? [30, 30, 30]
  if (health.fall_risk) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...frColor)
  } else {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30)
  }
  doc.text(health.fall_risk || '—', col1x + 18, y + 4)
  y += 8

  // Diet Restrictions
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Diet', col1x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  if (health.diet_restrictions) {
    const dietLines = doc.splitTextToSize(health.diet_restrictions, contentW - 16)
    doc.text(dietLines, col1x + 10, y + 4)
    y += dietLines.length * 5 + 4
  } else {
    doc.text('—', col1x + 10, y + 4)
    y += 8
  }

  // Mobility Aids
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 116, 139)
  doc.text('Mobility Aids', col1x, y + 4)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(30, 30, 30)
  const mobilityRaw = health.mobility_aids
  const mobilityText = Array.isArray(mobilityRaw) && mobilityRaw.length > 0
    ? mobilityRaw.filter(a => a !== 'None').join(', ') || 'None'
    : (typeof mobilityRaw === 'string' ? mobilityRaw : '—')
  doc.text(mobilityText, col1x + 26, y + 4)
  y += 11

  // ─── FOOTER on every page ──────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 190, 200)
    doc.text('CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY', pageW / 2, pageH - 6, { align: 'center' })
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' })
    if (community.address) doc.text(community.address, margin, pageH - 6)
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  doc.save(`FaceSheet_${safe(residentName)}_${dateStr}.pdf`)
}
