import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'

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

function ResidentPhoto({ resident }) {
  const [imgError, setImgError] = useState(false)
  const name = residentName(resident)
  const initials = (
    (resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')
  ).toUpperCase() || name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  if (resident.avatar_url && !imgError) {
    return (
      <img
        src={resident.avatar_url}
        alt={name}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold text-sm flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const RESIDENT_COLS = 'id, full_name, first_name, middle_name, last_name, room_number, avatar_url'
const RESIDENT_COLS_SAFE = 'id, full_name, room_number, avatar_url'

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

export default function Dispense() {
  const today = useMemo(() => new Date(), [])
  const [date, setDate] = useState(today)
  const [medications, setMedications] = useState([])
  const [administered, setAdministered] = useState(new Map())
  const [staffMap, setStaffMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(new Set())

  const dateStr = toDateStr(date)
  const isToday = toDateStr(today) === dateStr

  useEffect(() => {
    supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(p => { map[p.user_id] = p.full_name || p.email || 'Staff' })
        setStaffMap(map)
      })
  }, [])

  useEffect(() => {
    supabase
      .from('medications')
      .select(`*, residents!resident_id(${RESIDENT_COLS})`)
      .then(({ data, error }) => {
        if (error) {
          supabase
            .from('medications')
            .select(`*, residents!resident_id(${RESIDENT_COLS_SAFE})`)
            .then(({ data: fallback }) => {
              setMedications((fallback ?? []).filter(m => m.scheduled_times?.length > 0))
              setLoading(false)
            })
          return
        }
        setMedications((data ?? []).filter(m => m.scheduled_times?.length > 0))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    supabase
      .from('medication_administrations')
      .select('*')
      .eq('administered_date', dateStr)
      .then(({ data }) => {
        const map = new Map()
        ;(data ?? []).forEach(r => map.set(adminKey(r.medication_id, r.scheduled_time), r))
        setAdministered(map)
      })
  }, [dateStr])

  const timeSlots = useMemo(() => {
    const slots = {}
    medications
      .filter(med => isMedDueOnDate(med, dateStr))
      .forEach(med => {
        med.scheduled_times.forEach(time => {
          if (!slots[time]) slots[time] = []
          slots[time].push(med)
        })
      })
    return slots
  }, [medications, dateStr])

  const sortedTimes = useMemo(() => Object.keys(timeSlots).sort(), [timeSlots])

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
      const { data } = await supabase
        .from('medication_administrations')
        .insert([payload])
        .select()
        .single()
      if (data) setAdministered(prev => { const n = new Map(prev); n.set(key, data); return n })
    }

    setToggling(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  function prevDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n }) }
  function nextDay() { setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n }) }

  const totalMeds = Object.values(timeSlots).reduce((sum, meds) => sum + meds.length, 0)
  const administeredCount = administered.size

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-slate-800">Dispense</h1>
        <div className="flex items-center gap-4">
          {!loading && totalMeds > 0 && (
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-[#185FA5]">{administeredCount}</span> / {totalMeds} administered
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-7">
        <div className="flex items-center gap-1">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Previous day">
            <ChevronLeft />
          </button>
          <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" aria-label="Next day">
            <ChevronRight />
          </button>
        </div>
        <span className="text-sm font-medium text-slate-700">{formatDisplayDate(date)}</span>
        {!isToday && (
          <button onClick={() => setDate(new Date())} className="text-xs text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors">
            Back to today
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && sortedTimes.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No scheduled medications</p>
          <p className="text-sm mt-1">Add schedule times to medications in each resident's profile.</p>
        </div>
      )}

      {!loading && sortedTimes.length > 0 && (
        <div className="space-y-5">
          {sortedTimes.map(time => {
            const meds = timeSlots[time]
            const doneCount = meds.filter(m => administered.has(adminKey(m.id, time))).length
            const allDone = doneCount === meds.length

            return (
              <div key={time} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className={`flex items-center justify-between px-5 py-3 border-b ${allDone ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`font-semibold text-base ${allDone ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {fmt12(time)}
                  </span>
                  <span className={`text-xs font-medium ${allDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {doneCount} / {meds.length} given
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {meds.map(med => {
                    const key = adminKey(med.id, time)
                    const isDone = administered.has(key)
                    const isToggling = toggling.has(key)
                    const resident = med.residents

                    return (
                      <div
                        key={med.id}
                        className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isDone ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggle(med, time)}
                          disabled={isToggling}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-[#185FA5]'
                          } ${isToggling ? 'opacity-50' : ''}`}
                          aria-label={isDone ? 'Mark as not given' : 'Mark as given'}
                        >
                          {isDone && <CheckIcon />}
                        </button>

                        {/* Resident photo */}
                        {resident && (
                          <ResidentPhoto resident={resident} />
                        )}

                        {/* Resident + medication info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {resident ? residentName(resident) : '—'}
                            </span>
                            {resident?.room_number && (
                              <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Rm {resident.room_number}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                            {med.medication_name}{med.dose ? ` · ${med.dose}` : ''}
                          </p>
                        </div>

                        {/* Administered info */}
                        {isDone && (
                          <div className="text-right flex-shrink-0">
                            {administered.get(key)?.administered_at && (
                              <p className="text-xs text-emerald-600">
                                ✓ {new Date(administered.get(key).administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            )}
                            {administered.get(key)?.administered_by && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                by {staffMap[administered.get(key).administered_by] ?? 'Staff'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
