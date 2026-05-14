import { useState } from 'react'

// ─── Brand colors ─────────────────────────────────────────────────────────────
const C = {
  primary: '#185FA5',
  dark: '#0C447C',
  accent: '#378ADD',
  sidebar: '#0f2744',
  sidebarActive: 'rgba(255,255,255,0.13)',
  bg: '#f8fafc',
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const RESIDENTS = [
  { id: 1, initials: 'MR', color: '#185FA5', name: 'Margaret R.', age: 84, room: '101', level: 'AL', status: 'Stable',   statusColor: '#22c55e', dx: 'Hypertension, Type 2 Diabetes',      eContact: 'Susan R. (daughter) · (415) 555-0192', admitDate: 'Mar 12, 2024', notes: 'Prefers morning showers. Allergic to penicillin. Participates in daily exercise group.' },
  { id: 2, initials: 'JT', color: '#7c3aed', name: 'James T.',    age: 79, room: '102', level: 'AL', status: 'Meds Due', statusColor: '#f59e0b', dx: 'Type 2 Diabetes, COPD',              eContact: 'Carol T. (wife) · (415) 555-0384',     admitDate: 'Jul 3, 2024',  notes: 'Oxygen at 2L/min PRN. Monitor blood sugar daily. Family visits every Sunday.' },
  { id: 3, initials: 'ES', color: '#0891b2', name: 'Eleanor S.',  age: 91, room: '103', level: 'MC', status: 'Stable',   statusColor: '#22c55e', dx: "Alzheimer's Disease, Osteoporosis",  eContact: 'Paul S. (son) · (415) 555-0541',       admitDate: 'Jan 18, 2023', notes: 'Memory care protocol active. Responds well to music therapy. Fall risk — non-slip footwear required.' },
  { id: 4, initials: 'HN', color: '#059669', name: 'Harold N.',   age: 76, room: '104', level: 'IL', status: 'Stable',   statusColor: '#22c55e', dx: 'Hyperlipidemia',                      eContact: 'Donna N. (wife) · (415) 555-0729',     admitDate: 'Nov 5, 2024',  notes: 'Independent ADLs. Enjoys woodworking and chess. Annual physical scheduled June 2026.' },
  { id: 5, initials: 'DM', color: '#dc2626', name: 'Dorothy M.',  age: 88, room: '105', level: 'AL', status: 'Review',   statusColor: '#ef4444', dx: 'Atrial Fibrillation, Heart Failure', eContact: 'Kevin M. (son) · (415) 555-0863',      admitDate: 'Feb 29, 2024', notes: 'Cardiology follow-up due this week. Monitor for edema daily. Low-sodium diet.' },
  { id: 6, initials: 'RK', color: '#d97706', name: 'Robert K.',   age: 82, room: '106', level: 'AL', status: 'Stable',   statusColor: '#22c55e', dx: 'GERD, Hypertension',                 eContact: 'Linda K. (daughter) · (415) 555-0114', admitDate: 'Sep 14, 2023', notes: 'Head of bed elevated 30° at all times. Soft diet. Very social — active in group activities.' },
  { id: 7, initials: 'GP', color: '#be185d', name: 'Gloria P.',   age: 77, room: '107', level: 'IL', status: 'Stable',   statusColor: '#22c55e', dx: 'Hypothyroidism',                      eContact: 'Tom P. (husband) · (415) 555-0257',    admitDate: 'May 1, 2025',  notes: 'Labs due next month for thyroid levels. Drives own vehicle. No dietary restrictions.' },
  { id: 8, initials: 'FW', color: '#4f46e5', name: 'Frank W.',    age: 85, room: '108', level: 'MC', status: 'Alert',    statusColor: '#ef4444', dx: 'Vascular Dementia, Type 2 Diabetes', eContact: 'Marie W. (daughter) · (415) 555-0398', admitDate: 'Oct 22, 2023', notes: 'Elopement risk — door sensor active. Sundowning behavior in evenings. Finger sticks BID.' },
]

const INIT_MEDS = [
  // Routine meds
  { id: 1,  resId: 1, med: 'Lisinopril',    dose: '10mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 2,  resId: 1, med: 'Metoprolol',    dose: '25mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 3,  resId: 2, med: 'Metformin',     dose: '500mg', time: '8:00 AM', route: 'Oral',    given: false, prn: false },
  { id: 4,  resId: 2, med: 'Amlodipine',    dose: '5mg',   time: '8:00 AM', route: 'Oral',    given: false, prn: false },
  { id: 5,  resId: 3, med: 'Donepezil',     dose: '10mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 6,  resId: 3, med: 'Sertraline',    dose: '50mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 7,  resId: 4, med: 'Atorvastatin',  dose: '20mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 8,  resId: 5, med: 'Warfarin',      dose: '2.5mg', time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 9,  resId: 5, med: 'Furosemide',    dose: '20mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 10, resId: 6, med: 'Omeprazole',    dose: '20mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 11, resId: 6, med: 'Aspirin',       dose: '81mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 12, resId: 7, med: 'Levothyroxine', dose: '50mcg', time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 13, resId: 8, med: 'Memantine',     dose: '10mg',  time: '8:00 AM', route: 'Oral',    given: true,  prn: false },
  { id: 14, resId: 8, med: 'Quetiapine',    dose: '25mg',  time: '9:00 PM', route: 'Oral',    given: false, prn: false },
  // PRN meds
  { id: 15, resId: 2, med: 'Albuterol',     dose: '90mcg', time: 'PRN',     route: 'Inhaled', given: false, prn: true  },
  { id: 16, resId: 5, med: 'Lorazepam',     dose: '0.5mg', time: 'PRN',     route: 'Oral',    given: false, prn: true  },
  { id: 17, resId: 8, med: 'Haloperidol',   dose: '0.5mg', time: 'PRN',     route: 'Oral',    given: true,  prn: true  },
  { id: 18, resId: 3, med: 'Acetaminophen', dose: '500mg', time: 'PRN',     route: 'Oral',    given: false, prn: true  },
]

const STAFF = [
  { id: 1, initials: 'SK', color: '#185FA5', name: 'Sarah K.',  role: 'CNA',   shifts: ['AM',  'AM',  'AM',  'OFF', 'AM'  ] },
  { id: 2, initials: 'MT', color: '#7c3aed', name: 'Marcus T.', role: 'Staff', shifts: ['PM',  'PM',  'OFF', 'PM',  'PM'  ] },
  { id: 3, initials: 'LG', color: '#059669', name: 'Linda G.',  role: 'CNA',   shifts: ['OFF', 'AM',  'AM',  'AM',  'OFF' ] },
  { id: 4, initials: 'JP', color: '#0891b2', name: 'James P.',  role: 'Night', shifts: ['NOC', 'NOC', 'NOC', 'NOC', 'NOC' ] },
  { id: 5, initials: 'RM', color: '#be185d', name: 'Rachel M.', role: 'RN',    shifts: ['AM',  'AM',  'AM',  'AM',  'AM'  ] },
]

const SHIFT_STYLE = {
  AM:  { bg: '#dbeafe', color: '#1d4ed8', label: 'AM'  },
  PM:  { bg: '#ede9fe', color: '#6d28d9', label: 'PM'  },
  NOC: { bg: '#fce7f3', color: '#be185d', label: 'NOC' },
  OFF: { bg: '#f1f5f9', color: '#94a3b8', label: 'OFF' },
}

// Base Monday for week 0: May 12, 2026
const BASE_WEEK_MS = new Date('2026-05-12').getTime()
const TODAY_STR = '5/14' // Wednesday of base week = "today" in demo

function getWeekDays(offset) {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(BASE_WEEK_MS + (offset * 7 + i) * 86400000)
    const day = d.toLocaleDateString('en-US', { weekday: 'short' })
    const date = `${d.getMonth() + 1}/${d.getDate()}`
    return { label: `${day} ${date}`, dateStr: date }
  })
}

const INIT_INCIDENTS = [
  { id: 1, resId: 5, date: 'May 14, 2026', type: 'Fall — Near Miss',    severity: 'Minor',    status: 'Open',     desc: 'Resident nearly fell while attempting to stand from chair without assistance. No injury sustained. Reported by Sarah K. at 9:15 AM. Bed alarm re-enabled and care plan updated.' },
  { id: 2, resId: 8, date: 'May 12, 2026', type: 'Behavioral Incident', severity: 'Moderate', status: 'Open',     desc: 'Resident became agitated during morning care. Verbally aggressive with staff. De-escalation techniques applied successfully. Physician and family notified. Behavior log updated.' },
  { id: 3, resId: 2, date: 'May 10, 2026', type: 'Medication Error',    severity: 'Minor',    status: 'Resolved', desc: 'Incorrect dose of Metformin identified before administration. Error caught by RN during double-check. Physician notified and corrected MAR generated. No harm to resident.' },
  { id: 4, resId: 3, date: 'May 3, 2026',  type: 'Skin Integrity',      severity: 'Minor',    status: 'Resolved', desc: 'Stage 1 pressure area noted on coccyx during routine skin assessment. Wound care protocol initiated. Area fully resolved within 5 days. Documentation filed.' },
]

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 32, fontSize }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: color, fontSize: fontSize ?? size * 0.35 }}
    >
      {initials}
    </div>
  )
}

function StatusBadge({ status, color }) {
  return (
    <span className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full" style={{ fontSize: 11, backgroundColor: color + '1a', color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {status}
    </span>
  )
}

function LevelBadge({ level }) {
  const map = {
    AL:      { bg: '#e0f2fe', color: '#0369a1' },
    MC:      { bg: '#fce7f3', color: '#be185d' },
    IL:      { bg: '#dcfce7', color: '#15803d' },
    SNF:     { bg: '#fef9c3', color: '#a16207' },
    Hospice: { bg: '#f1f5f9', color: '#64748b' },
  }
  const s = map[level] || { bg: '#f1f5f9', color: '#64748b' }
  return (
    <span className="font-semibold px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: s.bg, color: s.color }}>{level}</span>
  )
}

// ─── Demo Sidebar ─────────────────────────────────────────────────────────────

const NAV = [
  { key: 'residents', label: 'Residents', icon: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { key: 'dispense', label: 'Medications', icon: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
      <line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )},
  { key: 'schedule', label: 'Schedule', icon: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { key: 'incidents', label: 'Incidents', icon: (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )},
]

function DemoSidebar({ active, onNav }) {
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 180, backgroundColor: C.sidebar, borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <div className="px-4 py-3.5 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <svg width="15" height="19" viewBox="0 0 24 30" fill="none" aria-hidden="true">
          <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          <rect x="4" y="20" width="5" height="8" fill="white" rx="0.5"/>
          <rect x="13" y="18" width="5" height="5" stroke="white" strokeWidth="1.5" fill="none" rx="0.5"/>
          <circle cx="12" cy="1.5" r="1.5" fill="#85B7EB"/>
        </svg>
        <span className="font-semibold text-white" style={{ fontSize: 14, letterSpacing: '-0.3px' }}>haven</span>
      </div>
      {/* Community */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-semibold text-white truncate" style={{ fontSize: 11 }}>Oceanview Assisted Living</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>8 residents</p>
      </div>
      {/* Nav */}
      <nav className="flex-1 py-2">
        {NAV.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNav(item.key)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
            style={{
              backgroundColor: active === item.key ? C.sidebarActive : 'transparent',
              color: active === item.key ? 'white' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              fontWeight: active === item.key ? 600 : 400,
              borderLeft: active === item.key ? `2px solid #378ADD` : '2px solid transparent',
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      {/* Demo badge */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: 'rgba(55,138,221,0.15)', border: '1px solid rgba(55,138,221,0.3)' }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#378ADD' }} />
          <span style={{ fontSize: 10, color: '#85B7EB', fontWeight: 600, letterSpacing: '0.3px' }}>DEMO MODE</span>
        </div>
      </div>
    </div>
  )
}

// ─── Demo Navbar ──────────────────────────────────────────────────────────────

function DemoNavbar({ view }) {
  const label = NAV.find(n => n.key === view)?.label ?? ''
  return (
    <div className="flex items-center justify-between px-5 py-2.5 flex-shrink-0" style={{ backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', minHeight: 48 }}>
      <div>
        <p className="font-bold text-slate-800" style={{ fontSize: 15 }}>{label}</p>
        <p className="text-slate-400" style={{ fontSize: 11 }}>Oceanview Assisted Living</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: '#fef9c3', border: '1px solid #fde047' }}>
          <span style={{ fontSize: 11, color: '#a16207', fontWeight: 600 }}>Demo Data</span>
        </div>
        <Avatar initials="OA" color={C.primary} size={30} fontSize={11} />
      </div>
    </div>
  )
}

// ─── View: Residents ──────────────────────────────────────────────────────────

function ResidentsView({ meds }) {
  const [selected, setSelected] = useState(null)
  const [careFilter, setCareFilter] = useState('All')

  const filterOptions = ['All', 'AL', 'IL', 'MC']

  const filteredResidents = careFilter === 'All'
    ? RESIDENTS
    : RESIDENTS.filter(r => r.level === careFilter)

  const res = RESIDENTS.find(r => r.id === selected)

  // Dynamic stats
  const medsIncompleteIds = new Set(meds.filter(m => !m.given && !m.prn).map(m => m.resId))
  const medsIncomplete = medsIncompleteIds.size
  const needsReview = RESIDENTS.filter(r => r.status === 'Review' || r.status === 'Alert').length
  const mcCount = RESIDENTS.filter(r => r.level === 'MC').length

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: C.bg }}>
        <div className="p-5">
          {/* Stats — dynamic */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Residents', val: RESIDENTS.length, color: C.primary },
              { label: 'Meds Due Today',  val: medsIncomplete,   color: medsIncomplete > 0 ? '#f59e0b' : '#22c55e' },
              { label: 'Needs Review',    val: needsReview,      color: needsReview > 0 ? '#ef4444' : '#22c55e' },
              { label: 'Memory Care',     val: mcCount,          color: '#be185d' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-3.5 border border-slate-200">
                <p className="text-slate-400 mb-1" style={{ fontSize: 11 }}>{s.label}</p>
                <p className="font-bold" style={{ fontSize: 22, color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Care level filter — fully working */}
          <div className="flex items-center gap-1.5 mb-4">
            {filterOptions.map(opt => {
              const isActive = careFilter === opt
              const count = opt === 'All' ? RESIDENTS.length : RESIDENTS.filter(r => r.level === opt).length
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setCareFilter(opt); setSelected(null) }}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
                  style={isActive
                    ? { backgroundColor: C.primary, color: 'white' }
                    : { backgroundColor: '#e2e8f0', color: '#64748b' }
                  }
                >
                  {opt}
                  <span
                    className="rounded-full px-1"
                    style={{
                      fontSize: 10,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)',
                      color: isActive ? 'white' : '#64748b',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Resident rows */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {filteredResidents.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-xs">No residents in this category</div>
            ) : (
              filteredResidents.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(selected === r.id ? null : r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  style={{
                    borderBottom: i < filteredResidents.length - 1 ? '1px solid #f1f5f9' : 'none',
                    backgroundColor: selected === r.id ? '#f0f7ff' : undefined,
                  }}
                >
                  <Avatar initials={r.initials} color={r.color} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-800 truncate" style={{ fontSize: 13 }}>{r.name}</p>
                      <LevelBadge level={r.level} />
                    </div>
                    <p className="text-slate-400" style={{ fontSize: 11 }}>Age {r.age} · Room {r.room}</p>
                  </div>
                  <StatusBadge status={r.status} color={r.statusColor} />
                  <svg className="w-4 h-4 text-slate-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {res && (
        <div className="overflow-y-auto border-l border-slate-200 flex-shrink-0" style={{ width: 280, backgroundColor: 'white' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-800" style={{ fontSize: 13 }}>Resident Profile</p>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-slate-100">
              <Avatar initials={res.initials} color={res.color} size={56} fontSize={20} />
              <p className="font-bold text-slate-800 mt-2" style={{ fontSize: 15 }}>{res.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <LevelBadge level={res.level} />
                <StatusBadge status={res.status} color={res.statusColor} />
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Age',               val: `${res.age} years old` },
                { label: 'Room',              val: res.room },
                { label: 'Admitted',          val: res.admitDate },
                { label: 'Diagnoses',         val: res.dx },
                { label: 'Emergency Contact', val: res.eContact },
              ].map(item => (
                <div key={item.label}>
                  <p className="font-semibold text-slate-400 uppercase tracking-wide mb-0.5" style={{ fontSize: 9 }}>{item.label}</p>
                  <p className="text-slate-700" style={{ fontSize: 12 }}>{item.val}</p>
                </div>
              ))}
              <div>
                <p className="font-semibold text-slate-400 uppercase tracking-wide mb-1" style={{ fontSize: 9 }}>Care Notes</p>
                <p className="text-slate-600 leading-relaxed" style={{ fontSize: 11 }}>{res.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── View: Medications ────────────────────────────────────────────────────────

function DispenseView({ meds, toggleMed }) {
  const [activeTab, setActiveTab] = useState('Routine')

  const visibleMeds = meds.filter(m => activeTab === 'PRN' ? m.prn : !m.prn)
  const given   = visibleMeds.filter(m => m.given).length
  const pending = visibleMeds.filter(m => !m.given).length
  const total   = visibleMeds.length

  const grouped = RESIDENTS.map(r => ({
    resident: r,
    meds: visibleMeds.filter(m => m.resId === r.id),
  })).filter(g => g.meds.length > 0)

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: C.bg }}>
      <div className="p-5">
        {/* Stats */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 bg-white rounded-xl p-3.5 border border-slate-200">
            <p className="text-slate-400 mb-0.5" style={{ fontSize: 11 }}>Total Doses</p>
            <p className="font-bold text-slate-800" style={{ fontSize: 20 }}>{total}</p>
          </div>
          <div className="flex-1 bg-white rounded-xl p-3.5 border border-slate-200">
            <p className="text-slate-400 mb-0.5" style={{ fontSize: 11 }}>Given</p>
            <p className="font-bold" style={{ fontSize: 20, color: '#22c55e' }}>{given}</p>
          </div>
          <div className="flex-1 bg-white rounded-xl p-3.5 border border-slate-200">
            <p className="text-slate-400 mb-0.5" style={{ fontSize: 11 }}>Pending</p>
            <p className="font-bold" style={{ fontSize: 20, color: pending > 0 ? '#f59e0b' : '#94a3b8' }}>{pending}</p>
          </div>
          <div
            className="flex-1 rounded-xl p-3.5"
            style={{
              backgroundColor: total === 0 ? '#f8fafc' : given === total ? '#dcfce7' : '#fef9c3',
              border: `1px solid ${total === 0 ? '#e2e8f0' : given === total ? '#86efac' : '#fde047'}`,
            }}
          >
            <p style={{ fontSize: 11, color: total === 0 ? '#94a3b8' : given === total ? '#15803d' : '#a16207' }}>Pass Progress</p>
            <p className="font-bold" style={{ fontSize: 13, color: total === 0 ? '#94a3b8' : given === total ? '#15803d' : '#a16207' }}>
              {total === 0 ? '—' : `${Math.round(given / total * 100)}%`}
            </p>
          </div>
        </div>

        {/* Date bar + Routine / PRN tabs */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span className="font-semibold text-slate-700" style={{ fontSize: 13 }}>Thursday, May 14, 2026</span>
          </div>
          {/* Working Routine / PRN toggle */}
          <div className="flex gap-1" role="group" aria-label="Medication type">
            {['Routine', 'PRN'].map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-pressed={activeTab === tab}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={activeTab === tab
                  ? { backgroundColor: C.primary, color: 'white' }
                  : { backgroundColor: '#f1f5f9', color: '#64748b' }
                }
              >
                {tab === 'PRN' ? 'PRN / As Needed' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Grouped by resident */}
        <div className="space-y-3">
          {grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 px-4 py-8 text-center text-slate-400 text-xs">
              No {activeTab === 'PRN' ? 'PRN' : 'routine'} medications for today
            </div>
          ) : (
            grouped.map(({ resident: r, meds: rMeds }) => {
              const allGiven = rMeds.every(m => m.given)
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Avatar initials={r.initials} color={r.color} size={28} />
                      <span className="font-semibold text-slate-800" style={{ fontSize: 13 }}>{r.name}</span>
                      <span className="text-slate-400" style={{ fontSize: 11 }}>Room {r.room}</span>
                    </div>
                    <span
                      className="font-medium rounded-full px-2 py-0.5"
                      style={{ fontSize: 11, backgroundColor: allGiven ? '#dcfce7' : '#fef9c3', color: allGiven ? '#15803d' : '#a16207' }}
                    >
                      {rMeds.filter(m => m.given).length}/{rMeds.length} given
                    </span>
                  </div>
                  {rMeds.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors" style={{ borderBottom: '1px solid #f8fafc' }}>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-700" style={{ fontSize: 12 }}>
                          {m.med} <span className="font-normal text-slate-400">{m.dose}</span>
                        </p>
                        <p className="text-slate-400" style={{ fontSize: 11 }}>{m.time} · {m.route}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleMed(m.id)}
                        className="flex items-center gap-1.5 font-semibold rounded-lg px-3 py-1.5 transition-all active:scale-95"
                        style={{
                          fontSize: 11,
                          backgroundColor: m.given ? '#dcfce7' : C.primary,
                          color: m.given ? '#15803d' : 'white',
                          border: m.given ? '1px solid #86efac' : 'none',
                        }}
                      >
                        {m.given
                          ? <><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Given</>
                          : 'Mark Given'
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── View: Schedule ───────────────────────────────────────────────────────────

function ScheduleView() {
  const [viewMode, setViewMode] = useState('Weekly')
  const [weekOffset, setWeekOffset] = useState(0)

  const days = getWeekDays(weekOffset)
  const weekStart = days[0].label
  const weekEnd   = days[4].label

  // Format week label: "May 12–16, 2026" style
  const weekLabel = (() => {
    const start = new Date(BASE_WEEK_MS + weekOffset * 7 * 86400000)
    const end   = new Date(BASE_WEEK_MS + (weekOffset * 7 + 4) * 86400000)
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endStr   = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} – ${endStr}`
  })()

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: C.bg }}>
      <div className="p-5">
        {/* Week nav */}
        <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-200 mb-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekOffset(o => o - 1)}
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              aria-label="Previous week"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="font-semibold text-slate-700" style={{ fontSize: 13 }}>{weekLabel}</span>
            <button
              type="button"
              onClick={() => setWeekOffset(o => o + 1)}
              className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              aria-label="Next week"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                style={{ backgroundColor: '#E6F1FB', color: C.primary }}
              >
                Today
              </button>
            )}
          </div>
          {/* Working Daily / Weekly / Monthly toggle */}
          <div className="flex gap-1" role="group" aria-label="Schedule view">
            {['Daily', 'Weekly', 'Monthly'].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                aria-pressed={viewMode === v}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                style={viewMode === v
                  ? { backgroundColor: C.primary, color: 'white' }
                  : { backgroundColor: '#f1f5f9', color: '#64748b' }
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="grid px-4 py-2.5 border-b border-slate-100" style={{ gridTemplateColumns: '160px repeat(5, 1fr)', backgroundColor: '#f8fafc' }}>
            <span className="font-semibold text-slate-400 uppercase tracking-wide" style={{ fontSize: 10 }}>Staff</span>
            {days.map(d => {
              const isToday = weekOffset === 0 && d.dateStr === TODAY_STR
              return (
                <span key={d.label} className="text-center font-semibold uppercase tracking-wide" style={{ fontSize: 10, color: isToday ? C.primary : '#94a3b8' }}>
                  {isToday ? `${d.label} ●` : d.label}
                </span>
              )
            })}
          </div>
          {/* Rows */}
          {STAFF.map((s, i) => (
            <div
              key={s.id}
              className="grid items-center px-4 py-3"
              style={{ gridTemplateColumns: '160px repeat(5, 1fr)', borderBottom: i < STAFF.length - 1 ? '1px solid #f1f5f9' : 'none' }}
            >
              <div className="flex items-center gap-2.5">
                <Avatar initials={s.initials} color={s.color} size={30} />
                <div>
                  <p className="font-semibold text-slate-700" style={{ fontSize: 12 }}>{s.name}</p>
                  <p className="text-slate-400" style={{ fontSize: 10 }}>{s.role}</p>
                </div>
              </div>
              {s.shifts.map((sh, j) => {
                const style = SHIFT_STYLE[sh]
                const isToday = weekOffset === 0 && j === 2
                return (
                  <div key={j} className="flex justify-center">
                    <span
                      className="font-semibold rounded-md px-2 py-1 text-center"
                      style={{
                        fontSize: 11,
                        backgroundColor: style.bg,
                        color: style.color,
                        minWidth: 36,
                        boxShadow: isToday ? `0 0 0 1.5px ${style.color}40` : 'none',
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 px-1">
          {Object.entries(SHIFT_STYLE).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: v.bg, border: `1px solid ${v.color}50` }} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{k} Shift</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── View: Incidents ──────────────────────────────────────────────────────────

function IncidentsView() {
  const [incidents, setIncidents] = useState(INIT_INCIDENTS)
  const [expanded, setExpanded] = useState(null)

  const resolve = id => setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status: 'Resolved' } : inc))
  const toggle  = id => setExpanded(e => e === id ? null : id)

  const openCount = incidents.filter(i => i.status === 'Open').length
  const highCount = incidents.filter(i => i.severity === 'Moderate').length

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: C.bg }}>
      <div className="p-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Reports', val: incidents.length, color: '#64748b' },
            { label: 'Open',          val: openCount,        color: openCount  > 0 ? '#ef4444' : '#22c55e' },
            { label: 'High Severity', val: highCount,        color: highCount  > 0 ? '#f59e0b' : '#22c55e' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 border border-slate-200">
              <p className="text-slate-400 mb-0.5" style={{ fontSize: 11 }}>{s.label}</p>
              <p className="font-bold" style={{ fontSize: 22, color: s.color }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Incident list */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid px-4 py-2.5 border-b border-slate-100" style={{ gridTemplateColumns: '110px 1fr 1.2fr 90px 90px 32px', backgroundColor: '#f8fafc' }}>
            {['Date', 'Resident', 'Type', 'Severity', 'Status', ''].map(h => (
              <span key={h} className="font-semibold text-slate-400 uppercase tracking-wide" style={{ fontSize: 10 }}>{h}</span>
            ))}
          </div>
          {incidents.map((inc, i) => {
            const r = RESIDENTS.find(r => r.id === inc.resId)
            const isOpen = inc.status === 'Open'
            const isHigh = inc.severity === 'Moderate'
            return (
              <div key={inc.id} style={{ borderBottom: i < incidents.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div
                  className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  style={{ gridTemplateColumns: '110px 1fr 1.2fr 90px 90px 32px' }}
                  onClick={() => toggle(inc.id)}
                >
                  <span className="text-slate-500 font-medium" style={{ fontSize: 12 }}>{inc.date.replace(', 2026', '')}</span>
                  <div className="flex items-center gap-2">
                    <Avatar initials={r.initials} color={r.color} size={24} fontSize={9} />
                    <span className="font-semibold text-slate-700 truncate" style={{ fontSize: 12 }}>{r.name}</span>
                  </div>
                  <span className="text-slate-600" style={{ fontSize: 12 }}>{inc.type}</span>
                  <span className="font-medium rounded-full px-2 py-0.5 inline-block" style={{ fontSize: 11, backgroundColor: isHigh ? '#fef9c3' : '#f1f5f9', color: isHigh ? '#a16207' : '#64748b' }}>
                    {inc.severity}
                  </span>
                  <span className="font-semibold inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: 11, backgroundColor: isOpen ? '#fee2e2' : '#dcfce7', color: isOpen ? '#dc2626' : '#15803d' }}>
                    {isOpen ? '● Open' : '✓ Resolved'}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 text-slate-300 transition-transform"
                    style={{ transform: expanded === inc.id ? 'rotate(90deg)' : 'none' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
                {expanded === inc.id && (
                  <div className="px-4 py-3 border-t border-slate-50" style={{ backgroundColor: '#fafafa' }}>
                    <p className="text-slate-600 mb-3 leading-relaxed" style={{ fontSize: 12 }}>{inc.desc}</p>
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => resolve(inc.id)}
                        className="font-semibold rounded-lg px-3 py-1.5 text-white transition-all active:scale-95"
                        style={{ fontSize: 12, backgroundColor: '#22c55e' }}
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LiveDemo() {
  const [view, setView] = useState('residents')
  // Lift meds state up so ResidentsView stats stay in sync with Dispense actions
  const [meds, setMeds] = useState(INIT_MEDS)
  const toggleMed = id => setMeds(prev => prev.map(m => m.id === id ? { ...m, given: !m.given } : m))

  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)', height: 580 }}>
      {/* macOS chrome bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ backgroundColor: '#141e2d', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffbd2e' }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28c840' }} />
        </div>
        <div className="flex-1 mx-4">
          <div className="rounded-md px-3 py-1 flex items-center gap-1.5 max-w-xs mx-auto" style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{ fontSize: 11 }}>app.haven.care</span>
          </div>
        </div>
      </div>

      {/* App shell */}
      <div className="flex" style={{ height: 'calc(580px - 37px)' }}>
        <DemoSidebar active={view} onNav={setView} />
        <div className="flex flex-col flex-1 min-w-0">
          <DemoNavbar view={view} />
          {view === 'residents' && <ResidentsView meds={meds} />}
          {view === 'dispense'  && <DispenseView meds={meds} toggleMed={toggleMed} />}
          {view === 'schedule'  && <ScheduleView />}
          {view === 'incidents' && <IncidentsView />}
        </div>
      </div>
    </div>
  )
}
