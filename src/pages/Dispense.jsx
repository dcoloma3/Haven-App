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
  const { communityId } = useCommunity()

  const dateStr = toDateStr(date)
  const isToday = toDateStr(today) === dateStr

  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name, email').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
      setStaffMap(map)
    })
  }, [])

  useEffect(() => {
    if (!communityId) return
    supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS})`).eq('community_id', communityId)
      .then(({ data, error }) => {
        if (error) {
          supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS_SAFE})`).eq('community_id', communityId)
            .then(({ data: fallback }) => {
              setMedications((fallback ?? []).filter(m => m.scheduled_times?.length > 0 && m.residents?.status !== 'inactive'))
              setLoading(false)
            })
          return
        }
        setMedications((data ?? []).filter(m => m.scheduled_times?.length > 0 && m.residents?.status !== 'inactive'))
        setLoading(false)
      })
  }, [communityId])

  useEffect(() => {
    supabase.from('medication_administrations').select('*').eq('administered_date', dateStr)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
      })
  }, [dateStr])

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

  async function handleToggle(med, time) {
    const key = adminKey(med.id, time)
    if (toggling.has(key)) return
    setToggling(prev => new Set(prev).add(key))
    if (administered.has(key)) {
      const record = administered.get(key)
      setAdministered(prev => { const n = new Map(prev); n.delete(key); return n })
      await supabase.from('medication_administrations').delete().eq('id', record.id)
    } else {
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
    }
    setToggling(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  function prevDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  return (
    <Layout>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-800">Dispense</h1>
        {!loading && totalMeds > 0 && (
          <span className="text-sm text-slate-500">
            <span className="font-bold text-[#185FA5]">{totalDone}</span> / {totalMeds} given
          </span>
        )}
      </div>

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
    </Layout>
  )
}
