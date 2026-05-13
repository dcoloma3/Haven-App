import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import { useCommunity } from '../context/CommunityContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt12(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function toDateStr(d) {
  return d.toISOString().split('T')[0]
}

function formatDisplayDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function residentName(r) {
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '')
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

const RESIDENT_COLS = 'id, full_name, first_name, middle_name, last_name, room_number, avatar_url'
const RESIDENT_COLS_SAFE = 'id, full_name, room_number, avatar_url'

// ─── Small components ────────────────────────────────────────────────────────

function ResidentAvatar({ resident }) {
  const [err, setErr] = useState(false)
  const name = residentName(resident)
  const initials = ((resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')).toUpperCase()
    || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (resident.avatar_url && !err) {
    return <img src={resident.avatar_url} alt={name} onError={() => setErr(true)}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

function CheckCircle({ done, toggling, onToggle }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle() }}
      disabled={toggling}
      className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 ${
        done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
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
    <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function StatusDot({ status }) {
  if (status === 'all') return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
  if (status === 'partial') return <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
  return <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
}

function GivenByLine({ record, staffMap }) {
  if (!record) return null
  const time = record.administered_at
    ? new Date(record.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null
  const by = record.administered_by ? staffMap[record.administered_by] ?? 'Staff' : null
  if (!time && !by) return null
  return (
    <p className="text-xs text-slate-400 mt-0.5">
      {time ? `Given at ${time}` : ''}{time && by ? ' · ' : ''}{by ? `by ${by}` : ''}
    </p>
  )
}

// ─── Time slot status helpers ─────────────────────────────────────────────────

function getTimeStatus(residentGroups, time, administered) {
  const allMeds = Object.values(residentGroups).flatMap(rg => rg.meds)
  const total = allMeds.length
  const done = allMeds.filter(m => administered.has(adminKey(m.id, time))).length
  if (total === 0) return 'none'
  if (done === 0) return 'none'
  if (done === total) return 'all'
  return 'partial'
}

function getResidentStatus(meds, time, administered) {
  const total = meds.length
  const done = meds.filter(m => administered.has(adminKey(m.id, time))).length
  if (done === 0) return 'none'
  if (done === total) return 'all'
  return 'partial'
}

function countForTime(residentGroups, time, administered) {
  const allMeds = Object.values(residentGroups).flatMap(rg => rg.meds)
  const total = allMeds.length
  const done = allMeds.filter(m => administered.has(adminKey(m.id, time))).length
  return { done, total }
}

// Time slot header colors
function timeSlotStyles(status) {
  if (status === 'all') return {
    wrapper: 'bg-emerald-50 border-emerald-200',
    header: 'bg-emerald-50',
    label: 'text-emerald-800',
    count: 'text-emerald-600',
  }
  if (status === 'partial') return {
    wrapper: 'bg-amber-50 border-amber-200',
    header: 'bg-amber-50',
    label: 'text-amber-800',
    count: 'text-amber-600',
  }
  return {
    wrapper: 'bg-white border-slate-200',
    header: 'bg-white',
    label: 'text-slate-800',
    count: 'text-slate-400',
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  // Load staff names
  useEffect(() => {
    supabase.from('profiles').select('user_id, full_name, email').then(({ data }) => {
      const map = {}
      ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
      setStaffMap(map)
    })
  }, [])

  // Load medications
  useEffect(() => {
    if (!communityId) return
    supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS})`).eq('community_id', communityId)
      .then(({ data, error }) => {
        if (error) {
          supabase.from('medications').select(`*, residents!resident_id(${RESIDENT_COLS_SAFE})`).eq('community_id', communityId)
            .then(({ data: fallback }) => {
              setMedications((fallback ?? []).filter(m => m.scheduled_times?.length > 0))
              setLoading(false)
            })
          return
        }
        setMedications((data ?? []).filter(m => m.scheduled_times?.length > 0))
        setLoading(false)
      })
  }, [communityId])

  // Load administrations for the selected date
  useEffect(() => {
    supabase.from('medication_administrations').select('*').eq('administered_date', dateStr)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
      })
  }, [dateStr])

  // Group medications: time → residentId → { resident, meds[] }
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

  // Overall count
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
      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-800">Dispense</h1>
        {!loading && totalMeds > 0 && (
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-[#185FA5]">{totalDone}</span>
            <span> / {totalMeds} given</span>
          </span>
        )}
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 active:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button onClick={nextDay} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 active:bg-slate-50 transition-colors">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <span className="text-sm font-medium text-slate-700 flex-1">{formatDisplayDate(date)}</span>
        {!isToday && (
          <button onClick={() => setDate(new Date())} className="text-xs text-[#185FA5] font-medium">
            Today
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-10">Loading…</p>}

      {!loading && sortedTimes.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
            </svg>
          </div>
          <p className="font-medium text-slate-500">No medications scheduled</p>
          <p className="text-sm mt-1 text-slate-400">Add schedule times inside each resident's profile.</p>
        </div>
      )}

      {/* Time slot list */}
      {!loading && sortedTimes.length > 0 && (
        <div className="space-y-3">
          {sortedTimes.map(time => {
            const residentGroups = timeGroups[time]
            const status = getTimeStatus(residentGroups, time, administered)
            const { done, total } = countForTime(residentGroups, time, administered)
            const styles = timeSlotStyles(status)
            const isOpen = expandedTimes.has(time)
            const residentList = Object.entries(residentGroups)
              .sort(([, a], [, b]) => residentName(a.resident ?? {}).localeCompare(residentName(b.resident ?? {})))

            return (
              <div key={time} className={`border rounded-2xl overflow-hidden ${styles.wrapper}`}>

                {/* ── Time slot header (tap to expand) ── */}
                <button
                  onClick={() => toggleTime(time)}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left ${styles.header}`}
                >
                  {/* Color pill */}
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    status === 'all' ? 'bg-emerald-400' :
                    status === 'partial' ? 'bg-amber-400' :
                    'border-2 border-slate-300 bg-white'
                  }`} />

                  <span className={`text-base font-bold flex-1 ${styles.label}`}>{fmt12(time)}</span>

                  <span className={`text-sm font-medium mr-1 ${styles.count}`}>
                    {done}/{total} given
                  </span>

                  <ChevronIcon open={isOpen} />
                </button>

                {/* ── Expanded: resident rows ── */}
                {isOpen && (
                  <div className={`border-t ${status === 'all' ? 'border-emerald-100' : status === 'partial' ? 'border-amber-100' : 'border-slate-100'}`}>
                    {residentList.map(([rid, { resident, meds }], idx) => {
                      if (!resident) return null
                      const resStatus = getResidentStatus(meds, time, administered)
                      const resKey = `${time}::${rid}`
                      const isResOpen = expandedResidents.has(resKey)
                      const hasMultiple = meds.length > 1
                      const singleMed = !hasMultiple ? meds[0] : null
                      const singleKey = singleMed ? adminKey(singleMed.id, time) : null
                      const singleDone = singleKey ? administered.has(singleKey) : false
                      const singleToggling = singleKey ? toggling.has(singleKey) : false

                      return (
                        <div key={rid} className={idx !== 0 ? 'border-t border-slate-100' : ''}>

                          {/* Resident row */}
                          <button
                            onClick={() => hasMultiple ? toggleResident(time, rid) : null}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                              hasMultiple ? 'active:bg-slate-50' : 'cursor-default'
                            } ${singleDone && !hasMultiple ? 'bg-emerald-50/60' : ''}`}
                          >
                            <ResidentAvatar resident={resident} />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800 text-sm truncate">{residentName(resident)}</p>
                                {resident.room_number && (
                                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    Rm {resident.room_number}
                                  </span>
                                )}
                              </div>

                              {/* Single med: show name inline */}
                              {singleMed && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">
                                  {singleMed.medication_name}{singleMed.dose ? ` · ${singleMed.dose}` : ''}
                                </p>
                              )}
                              {/* Multiple meds: show count */}
                              {hasMultiple && (
                                <p className="text-xs text-slate-400 mt-0.5">{meds.length} medications</p>
                              )}

                              {/* Given-by line for single med */}
                              {singleMed && singleDone && (
                                <GivenByLine record={administered.get(singleKey)} staffMap={staffMap} />
                              )}
                            </div>

                            {/* Right side */}
                            {hasMultiple ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusDot status={resStatus} />
                                <ChevronIcon open={isResOpen} />
                              </div>
                            ) : (
                              <CheckCircle
                                done={singleDone}
                                toggling={singleToggling}
                                onToggle={() => handleToggle(singleMed, time)}
                              />
                            )}
                          </button>

                          {/* Expanded med list for this resident */}
                          {hasMultiple && isResOpen && (
                            <div className="bg-slate-50 border-t border-slate-100">
                              {meds.map((med, mIdx) => {
                                const mKey = adminKey(med.id, time)
                                const isDone = administered.has(mKey)
                                const isTogg = toggling.has(mKey)
                                return (
                                  <div
                                    key={med.id}
                                    className={`flex items-center gap-3 pl-16 pr-4 py-3 ${
                                      mIdx !== 0 ? 'border-t border-slate-100' : ''
                                    } ${isDone ? 'bg-emerald-50/60' : ''}`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {med.medication_name}
                                      </p>
                                      {med.dose && (
                                        <p className="text-xs text-slate-400 mt-0.5">{med.dose}</p>
                                      )}
                                      {isDone && (
                                        <GivenByLine record={administered.get(mKey)} staffMap={staffMap} />
                                      )}
                                    </div>
                                    <CheckCircle
                                      done={isDone}
                                      toggling={isTogg}
                                      onToggle={() => handleToggle(med, time)}
                                    />
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
            )
          })}
        </div>
      )}
    </Layout>
  )
}
