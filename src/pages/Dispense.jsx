import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { useCommunity } from '../context/CommunityContext'
import { HelpIcon } from '../components/ui/Tooltip'
import { localDateStr } from '../lib/dateUtils'

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
  return localDateStr(d)
}

function formatDisplayDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtWeekday(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}
function fmtDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function residentName(r) {
  if (!r) return '—'
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '—')
}

function getAge(dobStr) {
  if (!dobStr) return null
  const [year, month, day] = dobStr.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--
  return age
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

// Given an ISO timestamp and a list of 'HH:MM' slot strings, return the nearest slot
function findNearestSlot(administeredAt, slots) {
  if (!slots.length) return null
  const d = new Date(administeredAt)
  const adminMin = d.getHours() * 60 + d.getMinutes()
  let best = null, bestDiff = Infinity
  slots.forEach(slot => {
    const [h, m] = slot.split(':').map(Number)
    const diff = Math.abs(adminMin - h * 60 - m)
    if (diff < bestDiff) { bestDiff = diff; best = slot }
  })
  return best
}

const RESIDENT_COLS = 'id, full_name, first_name, middle_name, last_name, room_number, avatar_url, status, date_of_birth'
const RESIDENT_COLS_SAFE = 'id, full_name, room_number, avatar_url, status, date_of_birth'

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
  if (status === 'all') return 'bg-emerald-500 border-emerald-500'
  if (status === 'partial') return 'bg-amber-500 border-amber-500'
  return 'bg-white border-slate-300'
}

// Card border color
function cardBorderCls(status) {
  if (status === 'all') return 'border-2 border-emerald-500'
  if (status === 'partial') return 'border-2 border-amber-500'
  return 'border border-slate-200'
}

// Divider color inside card
function dividerCls(status) {
  if (status === 'all') return 'border-emerald-300'
  if (status === 'partial') return 'border-amber-300'
  return 'border-slate-100'
}

/*
── Run in Supabase SQL editor to enable Not Given tracking ──────────────────

create table medication_not_given (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid references medications(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  community_id uuid references communities(id),
  scheduled_time text not null,
  administered_date date not null,
  reason text not null,
  notes text,
  recorded_by uuid,
  recorded_at timestamptz default now()
);
create index on medication_not_given(medication_id, administered_date);
alter table medication_not_given enable row level security;
create policy "community members can manage not given" on medication_not_given
  for all using (community_id in (
    select community_id from community_members where user_id = auth.uid()
  ));
*/

const NOT_GIVEN_REASONS = [
  { value: 'refused', label: 'Refused by resident' },
  { value: 'held', label: 'Held — physician order' },
  { value: 'absent', label: 'Resident absent / unavailable' },
  { value: 'out_of_stock', label: 'Medication out of stock' },
  { value: 'side_effects', label: 'Side effects / reaction concern' },
  { value: 'other', label: 'Other (see notes)' },
]

function NotGivenModal({ med, time, onClose, onSave, saving }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent'
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Dose Not Given</p>
            <p className="text-xs text-slate-400">{med.medication_name}{med.dose ? ` · ${med.dose}` : ''} · {fmt12(time)}</p>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason <span className="text-red-500">*</span></label>
            <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
              <option value="">Select a reason…</option>
              {NOT_GIVEN_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional context…"
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button
            onClick={() => onSave(reason, notes.trim())}
            disabled={!reason || saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResidentAvatar({ resident, size = 'md' }) {
  const [err, setErr] = useState(false)
  const name = residentName(resident)
  const initials = ((resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')).toUpperCase()
    || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'sm' ? 'w-14 h-14 text-sm' : 'w-16 h-16 text-base'

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

// ─── PRN Tab ──────────────────────────────────────────────────────────────────

function PRNResidentRow({ resident, communityId, staffMap }) {
  const [open, setOpen] = useState(false)
  const [prnMeds, setPrnMeds] = useState([])
  const [loadingMeds, setLoadingMeds] = useState(false)
  const [todayDoses, setTodayDoses] = useState([]) // today's prn_administrations for this resident
  const [givingId, setGivingId] = useState(null) // med.id that has "Administer" form open
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const todayStr = toDateStr(new Date())
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function load() {
    setLoadingMeds(true)
    const [medsRes, dosesRes] = await Promise.all([
      supabase
        .from('medications')
        .select('id, medication_name, dose, indication, min_interval_hours, community_id, notes')
        .eq('resident_id', resident.id)
        .eq('community_id', communityId)
        .eq('frequency_type', 'prn')
        .order('medication_name'),
      supabase
        .from('prn_administrations')
        .select('*')
        .eq('resident_id', resident.id)
        .gte('administered_at', `${todayStr}T00:00:00`)
        .lte('administered_at', `${todayStr}T23:59:59`)
        .order('administered_at', { ascending: false }),
    ])
    setPrnMeds(medsRes.data ?? [])
    setTodayDoses(dosesRes.data ?? [])
    setLoadingMeds(false)
  }

  function handleToggle() {
    if (!open && prnMeds.length === 0 && !loadingMeds) load()
    setOpen(o => !o)
  }

  async function handleAdminister(med) {
    if (!reason.trim()) { setSaveError('Please enter a reason.'); return }
    setSaving(true)
    setSaveError('')
    const { data: { session } } = await supabase.auth.getSession()
    const now = new Date()
    const { data, error } = await supabase
      .from('prn_administrations')
      .insert([{
        medication_name: med.medication_name,
        dose: med.dose ?? null,
        resident_id: resident.id,
        community_id: communityId,
        administered_at: now.toISOString(),
        administered_by: session?.user?.id ?? null,
        reason: reason.trim(),
        notes: null,
      }])
      .select()
      .single()
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setTodayDoses(prev => [data, ...prev])
    setGivingId(null)
    setReason('')
  }

  const initials = ((resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')).toUpperCase()
    || residentName(resident).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // Count how many of this resident's PRN meds have been given today (from already-loaded doses)
  const givenTodayCount = [...new Set(todayDoses.map(d => d.medication_name))].length

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-3">
      {/* Resident row header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <ResidentAvatar resident={resident} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800">{residentName(resident)}</p>
            {getAge(resident.date_of_birth) !== null && (
              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{getAge(resident.date_of_birth)}y</span>
            )}
          </div>
          {resident.room_number && <p className="text-xs text-slate-400">Room {resident.room_number}</p>}
        </div>
        {open && givenTodayCount > 0 && (
          <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">{givenTodayCount} given today</span>
        )}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {loadingMeds && <p className="text-sm text-slate-400 px-4 py-4">Loading…</p>}

          {!loadingMeds && prnMeds.length === 0 && (
            <p className="text-sm text-slate-400 px-4 py-4">No PRN medications on file.</p>
          )}

          {!loadingMeds && prnMeds.map(med => {
            const medDoses = todayDoses.filter(d => d.medication_name === med.medication_name)
            const lastDose = medDoses[0] ?? null
            const isGiving = givingId === med.id

            // Min interval check
            let intervalWarning = null
            if (lastDose && med.min_interval_hours) {
              const hoursAgo = (Date.now() - new Date(lastDose.administered_at).getTime()) / 3600000
              if (hoursAgo < med.min_interval_hours) {
                intervalWarning = `${Math.ceil(med.min_interval_hours - hoursAgo)}h until next dose`
              }
            }

            return (
              <div key={med.id} className="px-4 py-3.5 border-b border-slate-100 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{med.medication_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      {med.dose && <span className="text-xs text-slate-500">{med.dose}</span>}
                      {med.indication && (
                        <>
                          {med.dose && <span className="text-xs text-slate-300">·</span>}
                          <span className="text-xs text-slate-400 italic">{med.indication}</span>
                        </>
                      )}
                    </div>
                    {med.notes && (
                      <div className="flex items-start gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">{med.notes}</p>
                      </div>
                    )}
                    {intervalWarning && (
                      <p className="text-xs text-amber-600 font-medium mt-1">⚠ {intervalWarning}</p>
                    )}
                    {medDoses.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {medDoses.map(dose => (
                          <div key={dose.id} className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <p className="text-xs text-emerald-700">
                              Given {new Date(dose.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              {dose.reason && <span className="text-slate-400"> · {dose.reason}</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isGiving && (
                    <button
                      onClick={() => { setGivingId(med.id); setReason(''); setSaveError('') }}
                      className="flex-shrink-0 bg-[#042C53] hover:bg-[#0B3D6E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Administer
                    </button>
                  )}
                </div>

                {/* Inline administer form */}
                {isGiving && (
                  <div className="mt-3 bg-slate-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2">Reason <span className="text-red-500">*</span></p>
                    <input
                      autoFocus
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdminister(med) }}
                      placeholder={med.indication ? `e.g. ${med.indication} — describe severity` : 'e.g. Reported pain 6/10'}
                      className={inputCls + ' mb-2'}
                    />
                    {saveError && <p className="text-xs text-red-600 mb-2">{saveError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setGivingId(null); setReason(''); setSaveError('') }}
                        className="flex-1 border border-slate-300 text-slate-600 text-xs font-medium py-1.5 rounded-lg hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAdminister(med)}
                        disabled={saving || !reason.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                      >
                        {saving ? 'Recording…' : 'Record Administration'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PRNTab({ communityId }) {
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffMap, setStaffMap] = useState({})

  useEffect(() => {
    if (!communityId) return
    // Load active residents who have at least one PRN medication
    supabase
      .from('medications')
      .select('resident_id, residents!resident_id(id, first_name, middle_name, last_name, full_name, room_number, avatar_url, status)')
      .eq('community_id', communityId)
      .eq('frequency_type', 'prn')
      .then(({ data }) => {
        // Deduplicate by resident id
        const seen = new Set()
        const list = []
        ;(data ?? []).forEach(row => {
          const r = row.residents
          if (r && r.status !== 'inactive' && !seen.has(r.id)) {
            seen.add(r.id)
            list.push(r)
          }
        })
        // Sort by name
        list.sort((a, b) => residentName(a).localeCompare(residentName(b)))
        setResidents(list)
        setLoading(false)
      })
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
            setStaffMap(map)
          })
      })
  }, [communityId])

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-12">Loading…</p>
  }

  if (residents.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12h6m-3-3v6M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          </svg>
        </div>
        <p className="font-semibold text-slate-500">No PRN medications on file</p>
        <p className="text-sm mt-1 text-slate-400">Add PRN medications to residents from their profile page.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-slate-400 mb-3">{residents.length} resident{residents.length !== 1 ? 's' : ''} with PRN medications — tap to expand</p>
      {residents.map(r => (
        <PRNResidentRow key={r.id} resident={r} communityId={communityId} staffMap={staffMap} />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dispense() {
  const today = useMemo(() => new Date(), [])
  const [date, setDate] = useState(today)
  const dateInputRef = useRef(null)
  const [medications, setMedications] = useState([])
  const [administered, setAdministered] = useState(new Map())
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(new Set())
  const [confirmUndo, setConfirmUndo] = useState(null) // { med, time, record }
  const [notGiven, setNotGiven] = useState(new Map())   // adminKey → not_given record
  const [notGivenModal, setNotGivenModal] = useState(null) // { med, time }
  const [savingNotGiven, setSavingNotGiven] = useState(false)
  const [refusedForm, setRefusedForm] = useState(null) // { key, med, time, notes }
  const [savingRefused, setSavingRefused] = useState(false)
  const [expandedTimes, setExpandedTimes] = useState(new Set())
  const [expandedResidents, setExpandedResidents] = useState(new Set()) // 'time::residentId'
  const { communityId } = useCommunity()
  const [dispenseTab, setDispenseTab] = useState('routine')
  // Medication IDs scoped to this community (for scoping administration queries)
  const [communityMedIds, setCommunityMedIds] = useState([])
  // PRN administrations for the selected date (shown read-only in routine slots)
  const [prnAdmins, setPrnAdmins] = useState([])

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
    if (!communityMedIds.length) { setAdministered(new Map()); setNotGiven(new Map()); return }
    // Load given records
    supabase.from('medication_administrations').select('*')
      .eq('administered_date', dateStr)
      .in('medication_id', communityMedIds)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
      })
    // Load not-given records
    supabase.from('medication_not_given').select('*')
      .eq('administered_date', dateStr)
      .in('medication_id', communityMedIds)
      .then(({ data }) => {
        if (!data) return
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setNotGiven(map)
      })
  }, [dateStr, communityMedIds])

  // Fetch PRN administrations for the selected date (to overlay in routine time slots)
  useEffect(() => {
    if (!communityId) return
    supabase
      .from('prn_administrations')
      .select(`*, residents!resident_id(id, full_name, first_name, middle_name, last_name, room_number, avatar_url, date_of_birth)`)
      .eq('community_id', communityId)
      .gte('administered_at', `${dateStr}T00:00:00`)
      .lte('administered_at', `${dateStr}T23:59:59`)
      .order('administered_at')
      .then(({ data }) => setPrnAdmins(data ?? []))
  }, [communityId, dateStr])

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

  // Map each PRN administration to its nearest routine time slot
  // Result: { [slotTime]: { [residentId]: { resident, admins[] } } }
  const prnBySlot = useMemo(() => {
    if (!sortedTimes.length || !prnAdmins.length) return {}
    const result = {}
    prnAdmins.forEach(admin => {
      const slot = findNearestSlot(admin.administered_at, sortedTimes)
      if (!slot) return
      if (!result[slot]) result[slot] = {}
      const rid = admin.resident_id
      if (!result[slot][rid]) result[slot][rid] = { resident: admin.residents, admins: [] }
      result[slot][rid].admins.push(admin)
    })
    return result
  }, [prnAdmins, sortedTimes])

  // First incomplete time slot — used for "Due up next" indicator
  // A slot is complete when every med is either administered OR recorded as refused/withheld
  const nextDueTime = useMemo(() => {
    return sortedTimes.find(time => {
      const allMedsAtTime = Object.values(timeGroups[time]).flatMap(rg => rg.meds)
      return allMedsAtTime.some(m => {
        const key = adminKey(m.id, time)
        return !administered.has(key) && !notGiven.has(key)
      })
    }) ?? null
  }, [sortedTimes, timeGroups, administered, notGiven])

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

  function toggleResident(time, residentId) {
    const key = `${time}::${residentId}`
    setExpandedResidents(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  // Time slots start collapsed — user taps to expand each one

  async function quickNotGiven(med, time, reason) {
    const key = adminKey(med.id, time)
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase.from('medication_not_given').insert([{
      medication_id: med.id,
      resident_id: med.resident_id,
      community_id: communityId,
      scheduled_time: time,
      administered_date: dateStr,
      reason,
      recorded_by: session?.user?.id ?? null,
    }]).select().single()
    if (data) setNotGiven(prev => { const n = new Map(prev); n.set(key, data); return n })
  }

  async function handleRefusedSubmit() {
    if (!refusedForm || !refusedForm.notes.trim()) return
    const { key, med, time, notes } = refusedForm
    setSavingRefused(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase.from('medication_not_given').insert([{
      medication_id: med.id,
      resident_id: med.resident_id,
      community_id: communityId,
      scheduled_time: time,
      administered_date: dateStr,
      reason: 'refused',
      notes: notes.trim(),
      recorded_by: session?.user?.id ?? null,
    }]).select().single()
    if (data) setNotGiven(prev => { const n = new Map(prev); n.set(key, data); return n })
    setSavingRefused(false)
    setRefusedForm(null)
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

  async function handleNotGiven(reason, notes) {
    if (!notGivenModal || !reason) return
    const { med, time } = notGivenModal
    const key = adminKey(med.id, time)
    setSavingNotGiven(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data } = await supabase.from('medication_not_given').insert([{
      medication_id: med.id,
      resident_id: med.resident_id,
      community_id: communityId,
      scheduled_time: time,
      administered_date: dateStr,
      reason,
      notes: notes || null,
      recorded_by: session?.user?.id ?? null,
    }]).select().single()
    if (data) setNotGiven(prev => { const n = new Map(prev); n.set(key, data); return n })
    setSavingNotGiven(false)
    setNotGivenModal(null)
  }

  async function handleUndoNotGiven(med, time) {
    const key = adminKey(med.id, time)
    const record = notGiven.get(key)
    if (!record) return
    await supabase.from('medication_not_given').delete().eq('id', record.id)
    setNotGiven(prev => { const n = new Map(prev); n.delete(key); return n })
  }

  function prevDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  return (
    <Layout>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-800">Dispense</h1>
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
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${dispenseTab === 'prn' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          PRN / As Needed
          <HelpIcon tip='PRN (pro re nata) means "as needed." These medications are given only when a resident requests them or shows specific symptoms.' placement="top" />
        </button>
      </div>

      {dispenseTab === 'prn' && <PRNTab communityId={communityId} />}

      {dispenseTab === 'routine' && (<>

      {/* ── Pass progress bar ── */}
      {!loading && totalMeds > 0 && (() => {
        const pct = Math.round(totalDone / totalMeds * 100)
        const allDone = totalDone === totalMeds
        const pending = totalMeds - totalDone
        return (
          <div className="mb-5 bg-white border border-slate-200 rounded-2xl px-4 py-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">
                  {totalDone} <span className="font-normal text-slate-400">of</span> {totalMeds} doses given
                </span>
                {pending > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    {pending} pending
                  </span>
                )}
              </div>
              <span className={`text-sm font-bold ${allDone ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pct}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {nextDueTime && !allDone && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#185FA5] flex-shrink-0" style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                  <span className="text-xs font-semibold text-slate-600">Due up next</span>
                </div>
                <span className="text-xs font-bold text-[#185FA5]">{fmt12(nextDueTime)}</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={prevDay} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100 flex-shrink-0 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        {/* Date card — tap to open native calendar picker */}
        <button
          onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center hover:border-[#185FA5] active:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{fmtWeekday(date)}</p>
            {isToday && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Today</span>}
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p className="text-base font-bold text-slate-800 mt-0.5">{fmtDateShort(date)}</p>
          {!isToday && (
            <span
              onClick={e => { e.stopPropagation(); setDate(new Date()) }}
              className="text-[11px] text-[#185FA5] font-semibold mt-0.5 block"
            >
              ← Back to today
            </span>
          )}
        </button>

        {/* Hidden date input — triggered programmatically by the button above */}
        <input
          ref={dateInputRef}
          type="date"
          value={toDateStr(date)}
          onChange={e => {
            if (!e.target.value) return
            const [y, m, d] = e.target.value.split('-').map(Number)
            setDate(new Date(y, m - 1, d))
          }}
          className="sr-only"
        />

        <button onClick={nextDay} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 active:bg-slate-100 flex-shrink-0 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
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

              // Merge routine residents with PRN-only residents for this slot
              const slotPrns = prnBySlot[time] ?? {}
              const allRids = new Set([...Object.keys(residentGroups), ...Object.keys(slotPrns)])
              const residentList = [...allRids].map(rid => [rid, {
                resident: residentGroups[rid]?.resident ?? slotPrns[rid]?.resident,
                meds: residentGroups[rid]?.meds ?? [],
                prnAdmins: slotPrns[rid]?.admins ?? [],
              }]).sort(([, a], [, b]) => residentName(a.resident ?? {}).localeCompare(residentName(b.resident ?? {})))

              const totalResidents = Object.keys(residentGroups).length
              const totalMedsAtTime = allMedsAtTime.length

              return (
                <div key={time} className="relative flex items-start gap-3">

                  {/* ── Timeline dot ── */}
                  <div className="flex-shrink-0 w-9 flex justify-center pt-5 z-10">
                    <span className={`w-3.5 h-3.5 rounded-full border-2 ${timelineDotCls(timeStatus)}`} />
                  </div>

                  {/* ── Card ── */}
                  <div className={`flex-1 min-w-0 rounded-2xl overflow-hidden bg-white ${cardBorderCls(timeStatus)}`}>

                    {/* Clickable header */}
                    <button
                      onClick={() => toggleTime(time)}
                      className={`w-full text-left px-4 pt-4 pb-3 ${
                        timeStatus === 'all' ? 'bg-emerald-200' :
                        timeStatus === 'partial' ? 'bg-amber-200' :
                        'bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-2xl font-bold text-slate-800 tracking-tight">{fmt12(time)}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {time === nextDueTime && (
                            <span className="text-[10px] font-bold bg-[#185FA5] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                              Next
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            timeStatus === 'all' ? 'bg-emerald-500 text-white' :
                            timeStatus === 'partial' ? 'bg-amber-500 text-white' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {doneAtTime}/{totalAtTime} given
                          </span>
                          <ChevronIcon open={isOpen} />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {totalResidents} {totalResidents === 1 ? 'resident' : 'residents'} · {totalMedsAtTime} {totalMedsAtTime === 1 ? 'medication' : 'medications'}
                      </p>
                    </button>

                    {/* ── Resident rows — two-level accordion ── */}
                    {isOpen && (
                      <div className={`border-t ${dividerCls(timeStatus)}`}>
                        {residentList.map(([rid, { resident, meds, prnAdmins: residentPrns }], rIdx) => {
                          if (!resident) return null
                          const resKey = `${time}::${rid}`
                          const isResOpen = expandedResidents.has(resKey)
                          const resDone = meds.filter(m => administered.has(adminKey(m.id, time))).length
                          const resNotGiven = meds.filter(m => notGiven.has(adminKey(m.id, time))).length
                          const resTotal = meds.length
                          const isPrnOnly = resTotal === 0 && residentPrns.length > 0
                          const resAllDone = !isPrnOnly && resDone === resTotal
                          const resAllRecorded = !isPrnOnly && resDone + resNotGiven === resTotal

                          return (
                            <div key={rid} className={`${rIdx !== 0 ? `border-t ${dividerCls(timeStatus)}` : ''}`}>

                              {/* ── Resident header row (tap to expand) ── */}
                              <button
                                onClick={() => toggleResident(time, rid)}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                                  isPrnOnly ? 'bg-violet-50/40 hover:bg-violet-50/70' :
                                  resAllDone ? 'bg-emerald-50/50' : resAllRecorded ? 'bg-rose-50/30' : 'hover:bg-slate-50'
                                }`}
                              >
                                <ResidentAvatar resident={resident} size="sm" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-800 text-sm truncate">
                                      {residentName(resident)}
                                    </span>
                                    {resident.room_number && (
                                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">Rm {resident.room_number}</span>
                                    )}
                                    {getAge(resident.date_of_birth) !== null && (
                                      <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{getAge(resident.date_of_birth)}y</span>
                                    )}
                                  </div>
                                  {isPrnOnly ? (
                                    <p className="text-xs text-violet-600 font-medium mt-0.5">
                                      {residentPrns.length} PRN {residentPrns.length === 1 ? 'dose' : 'doses'} given
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      {resTotal} {resTotal === 1 ? 'med' : 'meds'} · {resDone}/{resTotal} given
                                      {resAllDone && <span className="ml-1.5 text-emerald-600 font-semibold">✓ Complete</span>}
                                      {residentPrns.length > 0 && (
                                        <span className="ml-1.5 text-violet-500 font-medium">· {residentPrns.length} PRN</span>
                                      )}
                                    </p>
                                  )}
                                </div>
                                <ChevronIcon open={isResOpen} />
                              </button>

                              {/* ── Medication rows for this resident ── */}
                              {isResOpen && (
                                <div className={`border-t ${dividerCls(timeStatus)} bg-slate-50/40`}>
                                  {meds.map((med, mIdx) => {
                                    const mKey = adminKey(med.id, time)
                                    const isDone = administered.has(mKey)
                                    const isTogg = toggling.has(mKey)
                                    const isNotGiven = notGiven.has(mKey)
                                    const ngRecord = isNotGiven ? notGiven.get(mKey) : null
                                    const isRefused = isNotGiven && ngRecord?.reason === 'refused'
                                    const isRefusedFormOpen = refusedForm?.key === mKey

                                    return (
                                      <div
                                        key={mKey}
                                        className={`px-4 py-3.5 ${mIdx !== 0 ? `border-t ${dividerCls(timeStatus)}` : ''} ${isDone ? 'bg-emerald-50/40' : isNotGiven ? 'bg-rose-50/30' : ''}`}
                                      >
                                        {/* Med info */}
                                        <div className="flex items-start gap-3 ml-1">
                                          <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                              {med.medication_name}{med.dose ? ` · ${med.dose}` : ''}
                                            </p>
                                            {med.notes && (
                                              <p className="text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 leading-relaxed">
                                                {med.notes}
                                              </p>
                                            )}
                                            {isDone && <GivenByLine record={administered.get(mKey)} staffMap={staffMap} />}
                                            {isRefused && ngRecord?.notes && (
                                              <p className="text-xs text-rose-600 mt-0.5 italic">Refused: {ngRecord.notes}</p>
                                            )}
                                          </div>
                                          <Link
                                            to={`/residents/${rid}`}
                                            onClick={e => e.stopPropagation()}
                                            className="text-xs text-slate-400 hover:text-[#185FA5] transition-colors flex-shrink-0 mt-0.5"
                                            title="View profile"
                                          >
                                            Profile →
                                          </Link>
                                        </div>

                                        {/* Status buttons */}
                                        <div className="flex gap-2 mt-3 ml-1">
                                          {/* Given */}
                                          <button
                                            onClick={e => { e.stopPropagation(); isDone ? setConfirmUndo({ med, time, record: administered.get(mKey) }) : (!isNotGiven && !isRefusedFormOpen && handleToggle(med, time)) }}
                                            disabled={isTogg || isNotGiven || isRefusedFormOpen}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                              isDone
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : isNotGiven || isRefusedFormOpen
                                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 active:scale-95'
                                            }`}
                                          >
                                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Given
                                          </button>

                                          {/* Refused */}
                                          <button
                                            onClick={e => {
                                              e.stopPropagation()
                                              if (isRefused) { handleUndoNotGiven(med, time); return }
                                              if (isDone || isNotGiven) return
                                              if (isRefusedFormOpen) { setRefusedForm(null); return }
                                              setRefusedForm({ key: mKey, med, time, notes: '' })
                                            }}
                                            disabled={isDone || (isNotGiven && !isRefused)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                              isRefused
                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                : isRefusedFormOpen
                                                ? 'bg-rose-50 border-rose-300 text-rose-700'
                                                : isDone || (isNotGiven && !isRefused)
                                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 active:scale-95'
                                            }`}
                                          >
                                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            Refused
                                          </button>
                                        </div>

                                        {/* Inline refused reason form */}
                                        {isRefusedFormOpen && (
                                          <div className="mt-3 ml-1 bg-rose-50 border border-rose-200 rounded-xl p-3">
                                            <p className="text-xs font-semibold text-rose-700 mb-2">Why did the resident refuse? <span className="text-rose-500">*</span></p>
                                            <input
                                              autoFocus
                                              type="text"
                                              value={refusedForm.notes}
                                              onChange={e => setRefusedForm(f => ({ ...f, notes: e.target.value }))}
                                              onKeyDown={e => { if (e.key === 'Enter' && refusedForm.notes.trim()) handleRefusedSubmit(); if (e.key === 'Escape') setRefusedForm(null) }}
                                              placeholder="e.g. Said medication makes them feel nauseous"
                                              className="w-full border border-rose-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent mb-2"
                                            />
                                            <div className="flex gap-2">
                                              <button
                                                onClick={e => { e.stopPropagation(); setRefusedForm(null) }}
                                                className="flex-1 border border-slate-300 bg-white text-slate-600 text-xs font-medium py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={e => { e.stopPropagation(); handleRefusedSubmit() }}
                                                disabled={savingRefused || !refusedForm.notes.trim()}
                                                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                                              >
                                                {savingRefused ? 'Saving…' : 'Record Refusal'}
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}

                                  {/* ── PRN administrations (read-only) ── */}
                                  {residentPrns.map((admin, aIdx) => (
                                    <div
                                      key={admin.id}
                                      className={`px-4 py-3 bg-violet-50/50 border-t border-violet-100 flex items-start gap-3`}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="text-[10px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">PRN</span>
                                          <p className="text-sm font-semibold text-slate-700 truncate">
                                            {admin.medication_name}{admin.dose ? ` · ${admin.dose}` : ''}
                                          </p>
                                        </div>
                                        <p className="text-xs text-violet-600 mt-0.5">
                                          Given at {new Date(admin.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                          {admin.reason ? ` · ${admin.reason}` : ''}
                                        </p>
                                      </div>
                                      <Link
                                        to={`/residents/${rid}`}
                                        onClick={e => e.stopPropagation()}
                                        className="text-xs text-slate-400 hover:text-[#185FA5] transition-colors flex-shrink-0 mt-0.5"
                                        title="View profile"
                                      >
                                        Profile →
                                      </Link>
                                    </div>
                                  ))}
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

      {/* Not Given modal */}
      {notGivenModal && (
        <NotGivenModal
          med={notGivenModal.med}
          time={notGivenModal.time}
          onClose={() => setNotGivenModal(null)}
          onSave={handleNotGiven}
          saving={savingNotGiven}
        />
      )}

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
