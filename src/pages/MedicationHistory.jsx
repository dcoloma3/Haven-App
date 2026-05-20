import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
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

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
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

function ResidentPhoto({ resident }) {
  const [imgError, setImgError] = useState(false)
  if (!resident) return null
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

const inputCls = 'border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent bg-white'

export default function MedicationHistory() {
  const { communityId } = useCommunity()
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [fromDate, setFromDate] = useState(toDateStr(sevenDaysAgo))
  const [toDate, setToDate] = useState(toDateStr(today))
  const [residentFilter, setResidentFilter] = useState('')
  const [residents, setResidents] = useState([])
  const [staffMap, setStaffMap] = useState({}) // userId -> display name
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  // Load residents and staff profiles once (re-run when communityId changes)
  useEffect(() => {
    if (!communityId) return
    supabase
      .from('residents')
      .select('id, full_name, first_name, last_name')
      .eq('community_id', communityId)
      .order('full_name')
      .then(({ data }) => setResidents(data ?? []))

    // Scope staff profiles to this community only — never expose cross-community user data
    supabase
      .from('community_members')
      .select('user_id, profiles(user_id, full_name, email)')
      .eq('community_id', communityId)
      .then(({ data }) => {
        const map = {}
        ;(data ?? []).forEach(m => {
          const p = m.profiles
          if (p) map[p.user_id] = p.full_name || p.email || 'Staff'
        })
        setStaffMap(map)
      })
  }, [communityId])

  // Reload records whenever filters, communityId, or residents change.
  // medication_administrations has no community_id column — scope via resident IDs instead.
  useEffect(() => {
    if (!communityId) return
    const residentIds = residents.map(r => r.id)
    // If residents haven't loaded yet, wait — avoids a cross-community data leak
    if (!residentIds.length) { setRecords([]); setLoading(false); return }
    setLoading(true)
    let query = supabase
      .from('medication_administrations')
      .select(`
        id,
        scheduled_time,
        administered_date,
        administered_at,
        administered_by,
        medications!medication_id(medication_name, dose),
        residents!resident_id(full_name, first_name, middle_name, last_name, room_number, avatar_url, date_of_birth)
      `)
      .gte('administered_date', fromDate)
      .lte('administered_date', toDate)
      .order('administered_date', { ascending: false })
      .order('scheduled_time', { ascending: true })

    if (residentFilter) {
      query = query.eq('resident_id', residentFilter)
    } else {
      query = query.in('resident_id', residentIds)
    }

    query.then(({ data }) => {
      setRecords(data ?? [])
      setLoading(false)
    })
  }, [communityId, fromDate, toDate, residentFilter, residents])

  // Group records by date
  const grouped = useMemo(() => {
    const map = {}
    records.forEach(r => {
      if (!map[r.administered_date]) map[r.administered_date] = []
      map[r.administered_date].push(r)
    })
    // Dates already sorted desc from DB; just return sorted keys
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [records])

  function residentDisplayName(r) {
    if (!r) return '—'
    const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
    return parts.length ? parts.join(' ') : (r.full_name || '—')
  }

  function clearFilters() {
    setFromDate(toDateStr(sevenDaysAgo))
    setToDate(toDateStr(today))
    setResidentFilter('')
  }

  const isFiltered = residentFilter !== ''

  return (
    <Layout>
      <div className="mb-6">
        <Link to="/dispense" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
          ← Back to Dispense
        </Link>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Medication History</h1>
        {!loading && (
          <span className="text-sm text-slate-400">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={e => setFromDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={toDateStr(today)}
              onChange={e => setToDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Resident</label>
            <select
              value={residentFilter}
              onChange={e => setResidentFilter(e.target.value)}
              className={inputCls}
            >
              <option value="">All residents</option>
              {residents.map(r => {
                const parts = [r.first_name, r.last_name].filter(Boolean)
                const name = parts.length ? parts.join(' ') : r.full_name
                return <option key={r.id} value={r.id}>{name}</option>
              })}
            </select>
          </div>
          {isFiltered && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors pb-0.5"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && records.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No records found</p>
          <p className="text-sm mt-1">Try adjusting the date range or filters.</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-[#185FA5] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(([dateStr, dayRecords]) => (
            <div key={dateStr}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-slate-600">{formatDisplayDate(dateStr)}</h2>
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-xs text-slate-400">{dayRecords.length} dose{dayRecords.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Records for this day */}
              <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                {dayRecords.map(record => {
                  const resident = record.residents
                  const med = record.medications
                  return (
                    <div key={record.id} className="flex items-center gap-3 px-5 py-3.5">
                      <ResidentPhoto resident={resident} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/residents/${record.resident_id}`}
                            className="text-sm font-medium text-[#185FA5] hover:text-[#0B3D6E] hover:underline underline-offset-2 transition-colors"
                          >
                            {residentDisplayName(resident)}
                          </Link>
                          {resident?.room_number && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Rm {resident.room_number}
                            </span>
                          )}
                          {getAge(resident?.date_of_birth) !== null && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {getAge(resident.date_of_birth)}y
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {med?.medication_name ?? '—'}{med?.dose ? ` · ${med.dose}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-slate-700">
                          {fmt12(record.scheduled_time)}
                        </p>
                        {record.administered_at && (
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Given {new Date(record.administered_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                        {record.administered_by && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            by {staffMap[record.administered_by] ?? 'Staff'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
