import { supabase } from './supabase'

// Per-resident universal search. Fetches each data source for the resident,
// then does generic keyword matching across every meaningful text field so a
// query can hit "anything" on the profile. Returns results grouped by category,
// each tagged with the tab to jump to.

const SOURCES = [
  { table: 'medications',                category: 'Medication',        tab: 'Medications', date: 'created_at',     title: r => r.medication_name || 'Medication', keywords: 'medication med meds rx drug prescription' },
  { table: 'medication_administrations', category: 'MAR · administered', tab: 'Medications', date: r => r.administered_at || r.administered_date, title: r => `${r._medName || 'Medication'} — administered`, needsMed: true, keywords: 'mar medication administration record administered given med pass dose' },
  { table: 'prn_administrations',        category: 'PRN dose',          tab: 'Medications', date: 'administered_at', title: r => `${r.medication_name || 'Medication'} — PRN`, keywords: 'prn as needed dose administered mar' },
  { table: 'medication_not_given',       category: 'Dose not given',    tab: 'Medications', date: 'administered_date', title: r => `${r._medName || 'Medication'} — not given`, needsMed: true, keywords: 'not given refused held missed withheld mar dose' },
  { table: 'bowel_movements',            category: 'Bowel movement',    tab: 'Health',      date: 'occurred_at',    title: r => `Bowel movement${r.period ? ` (${r.period})` : ''}`, keywords: 'bowel movement bm stool bristol poop' },
  { table: 'vital_signs',                category: 'Vitals',            tab: 'Health',      date: 'recorded_at',    title: () => 'Vital signs', keywords: 'vitals vital signs blood pressure bp pulse temperature weight oxygen glucose pain' },
  { table: 'care_plans',                 category: 'Care plan',         tab: 'Health',      date: r => r.updated_at || r.created_at, title: r => r.goal ? truncate(r.goal, 50) : 'Care plan', keywords: 'care plan goal intervention' },
  { table: 'adl_records',                category: 'ADL record',        tab: 'Health',      date: 'recorded_date',  title: () => 'ADL record', keywords: 'adl activities of daily living bathing dressing eating mobility toileting grooming' },
  { table: 'health_care',                category: 'Health & care',     tab: 'Health',      date: 'created_at',     title: () => 'Health & care info', keywords: 'health care allergy allergies diagnosis diagnoses care level fall risk dnr diet' },
  { table: 'dietary_profiles',           category: 'Dietary',           tab: 'Profile',     date: 'updated_at',     title: () => 'Dietary profile', keywords: 'diet dietary food nutrition texture fluid supplement' },
  { table: 'emergency_contacts',         category: 'Contact',           tab: 'Contacts',    date: 'created_at',     title: r => r.contact_name || 'Contact', keywords: 'contact family emergency next of kin poa relationship' },
  { table: 'resident_documents',         category: 'Document',          tab: 'Records',     date: 'created_at',     title: r => r.file_name || 'Document', keywords: 'document doc file form upload lic record' },
  { table: 'resident_photos',            category: 'Photo',             tab: 'Records',     date: 'uploaded_at',    title: r => r.file_name || 'Photo', keywords: 'photo picture image' },
  { table: 'calendar_events',            category: 'Appointment',       tab: 'Records',     date: 'event_date',     title: r => r.title || 'Appointment', keywords: 'appointment appt event calendar visit' },
  { table: 'incidents',                  category: 'Incident',          tab: 'Records',     date: 'incident_date',  title: r => r.incident_type || 'Incident', keywords: 'incident fall injury report event' },
  { table: 'transportation_log',         category: 'Transport',         tab: 'Records',     date: 'trip_date',      title: r => r.destination || 'Transport', keywords: 'transport transportation trip ride outing' },
]

// Fields never worth matching or showing (ids, URLs, binary metadata).
const EXCLUDE = new Set([
  'id', 'resident_id', 'community_id', 'created_by', 'recorded_by', 'administered_by',
  'administered_by_caregiver_id', 'user_id', 'medication_id', 'storage_path', 'file_url',
  'file_type', 'file_size', '_medName',
])

function truncate(s, n = 90) {
  const str = String(s)
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function toDate(row, dateSpec) {
  const raw = typeof dateSpec === 'function' ? dateSpec(row) : row[dateSpec]
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(d) {
  if (!d) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Scan a row's string-ish fields for the query; return the first matching
// { field, value } (for the snippet), or null if nothing matches.
function matchRow(row, q) {
  for (const [key, value] of Object.entries(row)) {
    if (EXCLUDE.has(key) || key.endsWith('_id') || value == null) continue
    const str = Array.isArray(value) ? value.join(', ') : String(value)
    if (!str) continue
    if (str.toLowerCase().includes(q)) return { field: key, value: str }
  }
  return null
}

// A short summary for rows matched by category/keyword rather than a specific
// field — joins a few meaningful, non-date field values.
function summarize(row) {
  const parts = []
  for (const [key, value] of Object.entries(row)) {
    if (EXCLUDE.has(key) || key.endsWith('_id') || key.endsWith('_at') || key.endsWith('_date') || value == null) continue
    const str = Array.isArray(value) ? value.join(', ') : String(value)
    if (!str || str.length > 60) continue
    parts.push(`${humanize(key)}: ${str}`)
    if (parts.length >= 3) break
  }
  return parts.join(' · ')
}

// Search the resident row itself (passed in — no extra query needed).
function searchProfile(resident, q) {
  if (!resident) return []
  const fields = [
    'full_name', 'first_name', 'middle_name', 'last_name', 'room_number', 'gender',
    'care_level', 'admission_type', 'physician', 'physician_phone', 'insurance_carrier',
    'insurance_id', 'religion', 'preferred_activities', 'avoided_activities', 'notes',
  ]
  for (const f of fields) {
    const v = resident[f]
    if (v && String(v).toLowerCase().includes(q)) {
      return [{
        category: 'Profile', tab: 'Profile', title: 'Resident profile',
        snippet: `${humanize(f)}: ${truncate(v)}`, date: null, dateStr: '',
      }]
    }
  }
  return []
}

export async function searchResident(residentId, rawQuery, resident, client = supabase) {
  const q = (rawQuery || '').trim().toLowerCase()
  if (q.length < 2) return { results: [], groups: [] }

  // Medication name map (for MAR / not-given rows that store only medication_id).
  const { data: meds } = await client
    .from('medications').select('id, medication_name').eq('resident_id', residentId)
  const medNames = {}
  for (const m of (meds ?? [])) medNames[m.id] = m.medication_name

  const settled = await Promise.allSettled(
    SOURCES.map(src =>
      client.from(src.table).select('*').eq('resident_id', residentId).limit(1000)
    )
  )

  const results = [...searchProfile(resident, q)]

  settled.forEach((res, i) => {
    if (res.status !== 'fulfilled' || !res.value?.data) return
    const src = SOURCES[i]
    // A query that names the section (category / keywords) surfaces all its rows.
    const sectionMatch = src.category.toLowerCase().includes(q) || (src.keywords || '').includes(q)
    for (const row of res.value.data) {
      if (src.needsMed) row._medName = medNames[row.medication_id]
      const hit = matchRow(row, q)
      if (!hit && !sectionMatch) continue
      const d = toDate(row, src.date)
      const snippet = hit
        ? `${humanize(hit.field)}: ${truncate(hit.value)}`
        : summarize(row)
      results.push({
        category: src.category,
        tab: src.tab,
        title: src.title(row),
        snippet,
        date: d,
        dateStr: formatDate(d),
      })
    }
  })

  // Sort newest first (undated last), then group by category preserving order.
  results.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
  const groupMap = new Map()
  for (const r of results) {
    if (!groupMap.has(r.category)) groupMap.set(r.category, [])
    groupMap.get(r.category).push(r)
  }
  const groups = [...groupMap.entries()].map(([category, items]) => ({ category, tab: items[0].tab, items }))

  return { results, groups }
}
