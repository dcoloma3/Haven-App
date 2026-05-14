import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { useCommunity } from '../context/CommunityContext'
import { RING_COLOR } from '../lib/medStatus'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt12(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`

}

function fmtShort(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'am' : 'pm'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hour}${ampm}` : `${hour}:${m.toString().padStart(2, '0')}${ampm}`
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function formatDisplayDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function residentName(r) {
  if (!r) return '—'
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '—')
}

function adminKey(medicationId, time) {
  return `${medicationId}::${time}`
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
    const startMs = new Date(sy, sm - 1, sd).getTime()
    const dateMs = new Date(dy, dm - 1, dd).getTime()
    const diffDays = Math.round((dateMs - startMs) / 86400000)
    return diffDays >= 0 && diffDays % med.frequency_interval === 0
  }
  return true
}

const RESIDENT_COLS = 'id, full_name, first_name, middle_name, last_name, room_number, avatar_url, status'
const RESIDENT_COLS_SAFE = 'id, full_name, room_number, avatar_url, status'

// ─── Status helpers ───────────────────────────────────────────────────────────

function calcStatus(meds, time, administered) {
  const total = meds.length
  if (total === 0) return 'none'
  const done = meds.filter(m => administered.has(adminKey(m.id, time))).length
  if (done === 0) return 'none'
  if (done === total) return 'all'
  return 'partial'
}

// Timeline dot color
function timelineDotCls(status) {
  if (status === 'all') return 'bg-emerald-400 border-emerald-400'
  if (status === 'partial') return 'bg-amber-400 border-amber-400'
  return 'bg-white border-slate-300'
}

// Resident photo dot color
function residentDotCls(status) {
  if (status === 'all') return 'bg-emerald-400'
  if (status === 'partial') return 'bg-amber-400'
  return 'bg-white border-2 border-slate-300'
}

// Card border color
function cardBorderCls(status) {
  if (status === 'all') return 'border-emerald-200'
  if (status === 'partial') return 'border-amber-200'
  return 'border-slate-200'
}

// Divider color inside card
function dividerCls(status) {
  if (status === 'all') return 'border-emerald-100'
  if (status === 'partial') return 'border-amber-100'
  return 'border-slate-100'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResidentAvatar({ resident, size = 'md' }) {
  const [err, setErr] = useState(false)
  const name = residentName(resident)
  const initials = ((resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')).toUpperCase()
    || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'

  if (resident.avatar_url && !err) {
    return (
      <img src={resident.avatar_url} alt={name} onError={() => setErr(true)}
        className={`${sz} rounded-full object-cover flex-shrink-0 border-2 border-white`} />
    )
  }
  return (
    <div className={`${sz} rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold flex items-center justify-center flex-shrink-0 border-2 border-white`}>
      {initials}
    </div>
  )
}

function Checkbox({ done, toggling, onToggle }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle() }}
      disabled={toggling}
      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 ${
        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white hover:border-[#185FA5]'
      } ${toggling ? 'opacity-40' : ''}`}
    >
      {done && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function GivenByLine({ record, staffMap }) {
  if (!record) return null
  const t = record.administered_at
    ? new Date(record.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null
  const by = record.administered_by ? (staffMap[record.administered_by] ?? 'Staff') : null
  if (!t && !by) return null
  return (
    <p className="text-xs text-emerald-600 mt-0.5">
      {t ? `Given at ${t}` : ''}{t && by ? ' · ' : ''}{by || ''}
    </p>
  )
}

// Row of resident photos shown inside collapsed card — with status ring
function ResidentPhotoRow({ residentList, time, administered }) {
  const MAX_SHOW = 6
  const shown = residentList.slice(0, MAX_SHOW)
  const extra = residentList.length - MAX_SHOW

  return (
    <div className="flex items-center gap-2 mt-3 flex-wrap">
      {shown.map(([rid, { resident, meds }]) => {
        const status = calcStatus(meds, time, administered)
        // Map Dispense status ('none'/'partial'/'all') to RING_COLOR keys
        const ringKey = status === 'all' ? 'all' : status === 'partial' ? 'partial' : 'none'
        return (
          <div
            key={rid}
            className="rounded-full"
            style={{ boxShadow: `0 0 0 2.5px ${RING_COLOR[ringKey]}` }}
          >
            <ResidentAvatar resident={resident} size="sm" />
          </div>
        )
      })}
      {extra > 0 && (
        <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-slate-500">
          +{extra}
        </div>
      )}
    </div>
  )
}

// ─── PRN Tab ──────────────────────────────────────────────────────────────────

function PRNTab({ communityId }) {
  const [search, setSearch] = useState('')
  const [residents, setResidents] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [selectedResident, setSelectedResident] = useState(null)
  const [prnHistory, setPrnHistory] = useState([])
  const [prnStaffMap, setPrnStaffMap] = useState({})
  const [form, setForm] = useState({ medication_name: '', dose: '', reason: '', notes: '', time: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const todayStr = toDateStr(new Date())
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  useEffect(() => {
    if (!communityId) return
    supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, full_name, room_number')
      .eq('community_id', communityId)
      .eq('status', 'active')
      .order('full_name')
      .then(({ data }) => setResidents(data ?? []))
  }, [communityId])

  useEffect(() => {
    if (!communityId) return
    supabase.from('community_members').select('user_id').eq('community_id', communityId)
      .then(({ data: members }) => {
        const userIds = (members ?? []).map(m => m.user_id)
        if (!userIds.length) return
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
          .then(({ data }) => {
            const map = {}
            ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
            setPrnStaffMap(map)
          })
      })
  }, [communityId])

  async function loadPrnHistory(resident) {
    const { data } = await supabase
      .from('prn_administrations')
      .select('*')
      .eq('resident_id', resident.id)
      .gte('administered_at', todayStr + 'T00:00:00')
      .lte('administered_at', todayStr + 'T23:59:59')
      .order('administered_at', { ascending: false })
    setPrnHistory(data ?? [])
  }

  const filtered = search.trim()
    ? residents.filter(r => residentName(r).toLowerCase().includes(search.trim().toLowerCase()))
    : []

  function selectResident(r) {
    setSelectedResident(r)
    setSearch(residentName(r))
    setShowResults(false)
    setError('')
    loadPrnHistory(r)
  }

  function clearResident() {
    setSelectedResident(null)
    setSearch('')
    setPrnHistory([])
    setError('')
    setForm({ medication_name: '', dose: '', reason: '', notes: '', time: '' })
  }

  async function handleLog() {
    if (!form.medication_name.trim()) { setError('Medication name is required.'); return }
    if (!form.reason.trim()) { setError('Reason for administering is required.'); return }
    setSaving(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    let administeredAt
    if (form.time) {
      const [h, m] = form.time.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)
      administeredAt = d.toISOString()
    } else {
      administeredAt = new Date().toISOString()
    }

    const { error: err } = await supabase.from('prn_administrations').insert([{
      resident_id: selectedResident.id,
      community_id: communityId,
      medication_name: form.medication_name.trim(),
      dose: form.dose.trim() || null,
      reason: form.reason.trim(),
      notes: form.notes.trim() || null,
      administered_at: administeredAt,
      administered_by: session?.user?.id ?? null,
    }])

    setSaving(false)
    if (err) { setError(err.message); return }
    setForm({ medication_name: '', dose: '', reason: '', notes: '', time: '' })
    loadPrnHistory(selectedResident)
  }

  const initials = r => ((r.first_name?.[0] ?? '') + (r.last_name?.[0] ?? '')).toUpperCase() || (r.full_name ?? '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div>
      {/* Resident search */}
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search resident name…"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setShowResults(true)
            if (selectedResident && e.target.value !== residentName(selectedResident)) clearResident()
          }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
        />
        {showResults && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden max-h-60 overflow-y-auto">
            {filtered.slice(0, 8).map(r => (
              <button
                key={r.id}
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectResident(r)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold text-xs flex items-center justify-center flex-shrink-0">
                  {initials(r)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{residentName(r)}</p>
                  {r.room_number && <p className="text-xs text-slate-400">Room {r.room_number}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!selectedResident && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="font-semibold text-slate-500">Search for a resident above</p>
          <p className="text-sm mt-1 text-slate-400">Select a resident to log a PRN medication.</p>
        </div>
      )}

      {selectedResident && (
        <>
          {/* Selected resident pill */}
          <div className="flex items-center gap-3 bg-[#E6F1FB] rounded-xl px-4 py-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#185FA5] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
              {initials(selectedResident)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#185FA5] text-sm">{residentName(selectedResident)}</p>
              {selectedResident.room_number && <p className="text-xs text-[#185FA5]/70">Room {selectedResident.room_number}</p>}
            </div>
            <button onClick={clearResident} className="text-[#185FA5]/50 hover:text-[#185FA5] text-xl leading-none transition-colors">&times;</button>
          </div>

          {/* Log form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Log PRN Medication</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Medication Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} placeholder="e.g. Tylenol" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dose</label>
                  <input type="text" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} placeholder="e.g. 500mg" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Time Given</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reason for Administering <span className="text-red-500">*</span></label>
                <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="e.g. Complaint of headache" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional additional notes" className={inputCls} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleLog}
                disabled={saving}
                className="w-full bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
              >
                {saving ? 'Logging…' : 'Log PRN Medication'}
              </button>
            </div>
          </div>

          {/* Today's PRN history for this resident */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Today's PRN Log</h3>
              <p className="text-xs text-slate-400 mt-0.5">{residentName(selectedResident)}</p>
            </div>
            {prnHistory.length === 0 ? (
              <p className="text-sm text-slate-400 px-5 py-4">No PRN medications logged today.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {prnHistory.map(record => (
                  <div key={record.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {record.medication_name}{record.dose ? ` · ${record.dose}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5"><span className="font-medium">Reason:</span> {record.reason}</p>
                        {record.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{record.notes}</p>}
                        {record.administered_by && prnStaffMap[record.administered_by] && (
                          <p className="text-xs text-slate-400 mt-0.5">Given by {prnStaffMap[record.administered_by]}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 flex-shrink-0 mt-0.5">
                        {new Date(record.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dispense() {
  const today = useMemo(() => new Date(), [])
  const [date, setDate] = useState(today)
  const [medications, setMedications] = useState([])
  const [administered, setAdministered] = useState(new Map())
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(new Set())
  const [expandedTimes, setExpandedTimes] = useState(new Set())
  const [expandedResidents, setExpandedResidents] = useState(new Set())
  const [confirmUndo, setConfirmUndo] = useState(null) // { med, time, record }
  const { communityId } = useCommunity()
  const [dispenseTab, setDispenseTab] = useState('routine')
  // Medication IDs scoped to this community (for scoping administration queries)
  const [communityMedIds, setCommunityMedIds] = useState([])

  const dateStr = toDateStr(date)
  const isToday = toDateStr(today) === dateStr

  // Load staff map scoped to this community's members only
  useEffect(() => {
    if (!communityId) return
    supabase.from('community_members').select('user_id').eq('community_id', communityId)
      .then(({ data: members }) => {
        const userIds = (members ?? []).map(m => m.user_id)
        if (!userIds.length) return
        supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
          .then(({ data }) => {
            const map = {}
            ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
            setStaffMap(map)
          })
      })
  }, [communityId])

  useEffect(() => {
    if (!communityId) return
    supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS})`).eq('community_id', communityId)
      .then(({ data, error }) => {
        if (error) {
          supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS_SAFE})`).eq('community_id', communityId)
            .then(({ data: fallback }) => {
              const filtered = (fallback ?? []).filter(m => m.scheduled_times?.length > 0 && m.residents?.status !== 'inactive')
              setMedications(filtered)
              setCommunityMedIds(filtered.map(m => m.id))
              setLoading(false)
            })
          return
        }
        const filtered = (data ?? []).filter(m => m.scheduled_times?.length > 0 && m.residents?.status !== 'inactive')
        setMedications(filtered)
        setCommunityMedIds(filtered.map(m => m.id))
        setLoading(false)
      })
  }, [communityId])

  // Scope administration query to this community's medication IDs only
  useEffect(() => {
    if (!communityMedIds.length) { setAdministered(new Map()); return }
    supabase.from('medication_administrations').select('*')
      .eq('administered_date', dateStr)
      .in('medication_id', communityMedIds)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
      })
  }, [dateStr, communityMedIds])

  // Group: time → residentId → { resident, meds[] }
  const timeGroups = useMemo(() => {
    const groups = {}
    medications.filter(med => isMedDueOnDate(med, dateStr)).forEach(med => {
      med.scheduled_times.forEach(time => {
        if (!groups[time]) groups[time] = {}
        const rid = med.resident_id
        if (!groups[time][rid]) groups[time][rid] = { resident: med.residents, meds: [] }
        groups[time][rid].meds.push(med)
      })
    })
    return groups
  }, [medications, dateStr])

  const sortedTimes = useMemo(() => Object.keys(timeGroups).sort(), [timeGroups])

  const { totalMeds, totalDone } = useMemo(() => {
    let totalMeds = 0, totalDone = 0
    sortedTimes.forEach(time => {
      const allMeds = Object.values(timeGroups[time]).flatMap(rg => rg.meds)
      totalMeds += allMeds.length
      totalDone += allMeds.filter(m => administered.has(adminKey(m.id, time))).length
    })
    return { totalMeds, totalDone }
  }, [timeGroups, sortedTimes, administered])

  function toggleTime(time) {
    setExpandedTimes(prev => {
      const n = new Set(prev)
      n.has(time) ? n.delete(time) : n.add(time)
      return n
    })
  }

  function toggleResident(time, rid) {
    const key = `${time}::${rid}`
    setExpandedResidents(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  // Called after the user confirms undoing a dose
  async function confirmUndoDose() {
    if (!confirmUndo) return
    const { med, time, record } = confirmUndo
    const key = adminKey(med.id, time)
    setConfirmUndo(null)
    setToggling(prev => new Set(prev).add(key))
    setAdministered(prev => { const n = new Map(prev); n.delete(key); return n })
    await supabase.from('medication_administrations').delete().eq('id', record.id)
    setToggling(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  async function handleToggle(med, time) {
    const key = adminKey(med.id, time)
    if (toggling.has(key)) return
    if (administered.has(key)) {
      // Require confirmation before removing a documented dose
      const record = administered.get(key)
      setConfirmUndo({ med, time, record })
      return
    } else {
      setToggling(prev => new Set(prev).add(key))
      const { data: { session } } = await supabase.auth.getSession()
      const payload = {
        medication_id: med.id,
        resident_id: med.resident_id,
        scheduled_time: time,
        administered_date: dateStr,
        administered_by: session?.user?.id ?? null,
      }
      setAdministered(prev => { const n = new Map(prev); n.set(key, { ...payload, id: 'temp' }); return n })
      const { data } = await supabase.from('medication_administrations').insert([payload]).select().single()
      if (data) setAdministered(prev => { const n = new Map(prev); n.set(key, data); return n })
      setToggling(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }

  function prevDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  return (
    <Layout>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-800">Dispense</h1>
        {dispenseTab === 'routine' && !loading && totalMeds > 0 && (
          <span className="text-sm text-slate-500">
            <span className="font-bold text-[#185FA5]">{totalDone}</span> / {totalMeds} given
          </span>
        )}
      </div>

      {/* ── Routine / PRN tabs ── */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-5">
        <button
          onClick={() => setDispenseTab('routine')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${dispenseTab === 'routine' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Routine
        </button>
        <button
          onClick={() => setDispenseTab('prn')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${dispenseTab === 'prn' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          PRN / As Needed
        </button>
      </div>

      {dispenseTab === 'prn' && <PRNTab communityId={communityId} />}

      {dispenseTab === 'routine' && (<>

      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 active:bg-slate-100">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button onClick={nextDay} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 active:bg-slate-100">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <span className="text-sm font-medium text-slate-600 flex-1 truncate">{formatDisplayDate(date)}</span>
        {!isToday && (
          <button onClick={() => setDate(new Date())} className="text-xs font-semibold text-[#185FA5]">Today</button>
        )}
      </div>

      {/* ── All-done completion banner ── */}
      {!loading && isToday && totalMeds > 0 && totalDone === totalMeds && (
        <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-5">
          <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-emerald-800">All medications given!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              All {totalMeds} scheduled medication{totalMeds !== 1 ? 's' : ''} have been administered for today.
            </p>
          </div>
        </div>
      )}

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}

      {!loading && sortedTimes.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
            </svg>
          </div>
          <p className="font-semibold text-slate-500">No medications scheduled</p>
          <p className="text-sm mt-1 text-slate-400">Add scheduled times inside each resident's profile.</p>
        </div>
      )}

      {/* ── Timeline ── */}
      {!loading && sortedTimes.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-slate-200 z-0" />

          <div className="space-y-4">
            {sortedTimes.map(time => {
              const residentGroups = timeGroups[time]
              const allMedsAtTime = Object.values(residentGroups).flatMap(rg => rg.meds)
              const doneAtTime = allMedsAtTime.filter(m => administered.has(adminKey(m.id, time))).length
              const totalAtTime = allMedsAtTime.length
              const timeStatus = calcStatus(allMedsAtTime, time, administered)
              const isOpen = expandedTimes.has(time)

              const residentList = Object.entries(residentGroups)
                .sort(([, a], [, b]) => residentName(a.resident ?? {}).localeCompare(residentName(b.resident ?? {})))

              const totalResidents = residentList.length
              const totalMedsAtTime = allMedsAtTime.length

              return (
                <div key={time} className="relative flex items-start gap-3">

                  {/* ── Timeline dot ── */}
                  <div className="flex-shrink-0 w-9 flex justify-center pt-5 z-10">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${timelineDotCls(timeStatus)}`} />
                  </div>

                  {/* ── Card ── */}
                  <div className={`flex-1 min-w-0 border rounded-2xl overflow-hidden bg-white ${cardBorderCls(timeStatus)}`}>

                    {/* Collapsed header — always visible */}
                    <button
                      onClick={() => toggleTime(time)}
                      className="w-full text-left px-4 pt-4 pb-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Status label */}
                          <p className={`font-bold text-sm ${
                            timeStatus === 'all' ? 'text-emerald-700' :
                            timeStatus === 'partial' ? 'text-amber-700' :
                            'text-slate-800'
                          }`}>
                            {timeStatus === 'all' ? 'All medications given' : 'Medication to dispense'}
                          </p>
                          {/* Sub-label */}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {totalResidents} {totalResidents === 1 ? 'resident' : 'residents'} · {totalMedsAtTime} {totalMedsAtTime === 1 ? 'medication' : 'medications'}
                          </p>
                        </div>

                        {/* Time + chevron */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          <span className="text-sm font-semibold text-slate-400">{fmtShort(time)}</span>
                          <ChevronIcon open={isOpen} />
                        </div>
                      </div>

                      {/* Resident photo row */}
                      <ResidentPhotoRow
                        residentList={residentList}
                        time={time}
                        administered={administered}
                      />
                    </button>

                    {/* ── Expanded: resident rows ── */}
                    {isOpen && (
                      <div className={`border-t ${dividerCls(timeStatus)}`}>
                        {residentList.map(([rid, { resident, meds }], idx) => {
                          if (!resident) return null
                          const resStatus = calcStatus(meds, time, administered)
                          const resKey = `${time}::${rid}`
                          const isResOpen = expandedResidents.has(resKey)
                          const hasMultiple = meds.length > 1
                          const singleMed = hasMultiple ? null : meds[0]
                          const singleKey = singleMed ? adminKey(singleMed.id, time) : null
                          const singleDone = singleKey ? administered.has(singleKey) : false
                          const singleToggling = singleKey ? toggling.has(singleKey) : false

                          return (
                            <div key={rid} className={idx !== 0 ? `border-t ${dividerCls(timeStatus)}` : ''}>

                              {/* Resident row */}
                              <div
                                onClick={() => hasMultiple && toggleResident(time, rid)}
                                className={`flex items-center gap-3 px-4 py-3.5 ${hasMultiple ? 'cursor-pointer active:bg-slate-50' : ''} ${singleDone && !hasMultiple ? 'bg-emerald-50/40' : ''}`}
                              >
                                <ResidentAvatar resident={resident} />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Link
                                      to={`/residents/${rid}`}
                                      onClick={e => e.stopPropagation()}
                                      className="font-semibold text-slate-800 text-sm truncate hover:text-[#185FA5] hover:underline transition-colors"
                                    >
                                      {residentName(resident)}
                                    </Link>
                                    {resident.room_number && (
                                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">Rm {resident.room_number}</span>
                                    )}
                                  </div>
                                  {singleMed && (
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                                      {singleMed.medication_name}{singleMed.dose ? ` · ${singleMed.dose}` : ''}
                                    </p>
                                  )}
                                  {hasMultiple && (
                                    <p className="text-xs text-slate-400 mt-0.5">{meds.length} medications</p>
                                  )}
                                  {singleMed && singleDone && (
                                    <GivenByLine record={administered.get(singleKey)} staffMap={staffMap} />
                                  )}
                                </div>

                                {hasMultiple ? (
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`w-2.5 h-2.5 rounded-full ${residentDotCls(resStatus)}`} />
                                    <ChevronIcon open={isResOpen} />
                                  </div>
                                ) : (
                                  <Checkbox done={singleDone} toggling={singleToggling} onToggle={() => handleToggle(singleMed, time)} />
                                )}
                              </div>

                              {/* Expanded med list */}
                              {hasMultiple && isResOpen && (
                                <div className={`border-t ${dividerCls(timeStatus)} bg-slate-50/70`}>
                                  {meds.map((med, mIdx) => {
                                    const mKey = adminKey(med.id, time)
                                    const isDone = administered.has(mKey)
                                    const isTogg = toggling.has(mKey)
                                    return (
                                      <div key={med.id} className={`flex items-center gap-3 pl-16 pr-4 py-3 ${mIdx !== 0 ? 'border-t border-slate-100' : ''} ${isDone ? 'bg-emerald-50/50' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {med.medication_name}
                                          </p>
                                          {med.dose && <p className="text-xs text-slate-400 mt-0.5">{med.dose}</p>}
                                          {isDone && <GivenByLine record={administered.get(mKey)} staffMap={staffMap} />}
                                        </div>
                                        <Checkbox done={isDone} toggling={isTogg} onToggle={() => handleToggle(med, time)} />
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      </>)}

      {/* Undo dose confirmation — protects against accidental uncheck */}
      {confirmUndo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Remove dose record?</p>
                <p className="text-sm text-slate-500">{confirmUndo.med.medication_name} · {fmt12(confirmUndo.time)}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will permanently delete the administration record. Only remove it if this dose was logged in error.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUndo(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmUndoDose} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                Remove Record
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
