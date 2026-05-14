import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import ResidentForm from '../components/residents/ResidentForm'
import { useFacility } from '../context/FacilityContext'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { adminKey, computeResidentStatus, ringBoxShadow, RING_COLOR } from '../lib/medStatus'
import { StatCardSkeleton, ResidentCardSkeleton, ResidentRowSkeleton } from '../components/ui/Skeleton'
import WelcomeModal from '../components/onboarding/WelcomeModal'
import GettingStartedChecklist from '../components/onboarding/GettingStartedChecklist'

function fmtUpdated(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Updated today'
  if (diffDays === 1) return 'Updated yesterday'
  if (diffDays < 7) return `Updated ${diffDays}d ago`
  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function getResidentFullName(r) {
  const parts = [r.first_name, r.middle_name, r.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (r.full_name || '')
}

function getResidentInitials(r) {
  if (r.first_name || r.last_name) {
    return ((r.first_name?.[0] ?? '') + (r.last_name?.[0] ?? '')).toUpperCase()
  }
  return (r.full_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getAge(dobStr) {
  if (!dobStr) return null
  const [year, month, day] = dobStr.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--
  return age
}

function CardPhoto({ resident }) {
  const [imgError, setImgError] = useState(false)
  const initials = getResidentInitials(resident)
  if (resident.avatar_url && !imgError) {
    return <img src={resident.avatar_url} alt={getResidentFullName(resident)} onError={() => setImgError(true)} className="w-full h-full object-cover" />
  }
  return (
    <div className="w-full h-full bg-[#E6F1FB] flex items-center justify-center">
      <span className="text-[#185FA5] font-semibold text-5xl">{initials}</span>
    </div>
  )
}

function ListAvatar({ resident, medStatus }) {
  const [imgError, setImgError] = useState(false)
  const initials = getResidentInitials(resident)
  const shadow = medStatus ? ringBoxShadow(medStatus) : undefined
  if (resident.avatar_url && !imgError) {
    return (
      <img
        src={resident.avatar_url}
        alt={getResidentFullName(resident)}
        onError={() => setImgError(true)}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        style={shadow ? { boxShadow: shadow } : undefined}
      />
    )
  }
  return (
    <div
      className="w-12 h-12 rounded-full bg-[#E6F1FB] flex items-center justify-center flex-shrink-0"
      style={shadow ? { boxShadow: shadow } : undefined}
    >
      <span className="text-[#185FA5] font-semibold text-lg">{initials}</span>
    </div>
  )
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function StatusBadge({ reason }) {
  const label = reason || 'No longer a resident'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600 flex-shrink-0">
      {label}
    </span>
  )
}

const CARE_LEVEL_COLORS = {
  AL:      'bg-blue-100 text-blue-700',
  IL:      'bg-emerald-100 text-emerald-700',
  MC:      'bg-purple-100 text-purple-700',
  SNF:     'bg-amber-100 text-amber-700',
  Hospice: 'bg-slate-100 text-slate-600',
  Respite: 'bg-orange-100 text-orange-700',
}

export default function Dashboard() {
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showFormer, setShowFormer] = useState(false)
  const [search, setSearch] = useState('')
  const [careFilter, setCareFilter] = useState('All')
  const [medStatusMap, setMedStatusMap] = useState({})
  const [todayStr, setTodayStr] = useState(() => new Date().toISOString().split('T')[0])
  const [openIncidentCount, setOpenIncidentCount] = useState(0)
  const [highSeverityCount, setHighSeverityCount] = useState(0)
  const [apptCount, setApptCount] = useState(0)
  const [prospectCount, setProspectCount] = useState(0)
  const [expiringCertCount, setExpiringCertCount] = useState(0)
  const [showWelcome, setShowWelcome] = useState(false)
  const [welcomeChecked, setWelcomeChecked] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const unauthorized = location.state?.unauthorized
  const openAddResident = location.state?.openAddResident || new URLSearchParams(location.search).get('openAddResident')
  const { facility } = useFacility()
  const { communityId, community, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!profile?.user_id || welcomeChecked) return
    setWelcomeChecked(true)
    const key = `haven_welcome_done_${profile.user_id}`
    if (!localStorage.getItem(key)) {
      setShowWelcome(true)
    }
  }, [profile?.user_id, welcomeChecked])

  useEffect(() => {
    if (openAddResident) setShowForm(true)
  }, [openAddResident])

  // Keep todayStr in sync — updates when the clock rolls past midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toISOString().split('T')[0]
      setTodayStr(prev => prev !== newDate ? newDate : prev)
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch open incidents and today's appointments
  useEffect(() => {
    if (!communityId || showFormer) return
    async function fetchSummaryStats() {
      const in30Days = new Date()
      in30Days.setDate(in30Days.getDate() + 30)
      const in30Str = in30Days.toISOString().split('T')[0]

      const [{ data: incidents }, { data: appts }, { data: prospects }, { data: certs }] = await Promise.all([
        supabase.from('incidents').select('id, severity').eq('community_id', communityId).eq('status', 'open'),
        supabase.from('calendar_events').select('id').eq('community_id', communityId).eq('start_date', todayStr),
        supabase.from('waitlist').select('id, status').eq('community_id', communityId),
        supabase.from('staff_certifications').select('id, expiry_date').eq('community_id', communityId).lte('expiry_date', in30Str).gte('expiry_date', todayStr),
      ])
      setOpenIncidentCount((incidents ?? []).length)
      setHighSeverityCount((incidents ?? []).filter(i => i.severity === 'high').length)
      setApptCount((appts ?? []).length)
      setProspectCount((prospects ?? []).filter(p => p.status !== 'declined' && p.status !== 'accepted').length)
      setExpiringCertCount((certs ?? []).length)
    }
    fetchSummaryStats()
  }, [communityId, showFormer, todayStr])

  const fetchResidents = useCallback(() => {
    if (!communityId) return
    setLoading(true)
    supabase
      .from('residents')
      .select('*')
      .eq('community_id', communityId)
      .eq('status', showFormer ? 'inactive' : 'active')
      .order('full_name')
      .then(({ data }) => {
        setResidents(data ?? [])
        setLoading(false)
      })
  }, [communityId, showFormer])

  useEffect(() => { fetchResidents() }, [fetchResidents])

  // Fetch today's med status for all residents (for ring indicators)
  useEffect(() => {
    if (!communityId || showFormer) return
    async function fetchMedStatuses() {
      const [{ data: meds }, { data: admins }] = await Promise.all([
        supabase.from('medications').select('id, resident_id, scheduled_times, frequency_type, frequency_days, frequency_interval, start_date, end_date').eq('community_id', communityId),
        supabase.from('medication_administrations').select('medication_id, scheduled_time, resident_id').eq('administered_date', todayStr),
      ])
      if (!meds) return
      const statusMap = {}
      const medsByResident = {}
      meds.forEach(m => {
        if (!medsByResident[m.resident_id]) medsByResident[m.resident_id] = []
        medsByResident[m.resident_id].push(m)
      })
      const adminsByResident = {}
      ;(admins ?? []).forEach(a => {
        if (!adminsByResident[a.resident_id]) adminsByResident[a.resident_id] = new Set()
        adminsByResident[a.resident_id].add(adminKey(a.medication_id, a.scheduled_time))
      })
      Object.entries(medsByResident).forEach(([rid, rMeds]) => {
        statusMap[rid] = computeResidentStatus(rMeds, adminsByResident[rid] ?? new Set(), todayStr)
      })
      setMedStatusMap(statusMap)
    }
    fetchMedStatuses()
  }, [communityId, showFormer, todayStr])

  function handleSaved(newResident) {
    setResidents(prev => [...prev, newResident].sort((a, b) => getResidentFullName(a).localeCompare(getResidentFullName(b))))
    setShowForm(false)
  }

  const careOptions = ['All', 'AL', 'IL', 'MC', 'SNF', 'Hospice', 'Respite']

  const filtered = residents.filter(r => {
    if (careFilter !== 'All' && r.care_level !== careFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return getResidentFullName(r).toLowerCase().includes(q) ||
      (r.room_number ?? '').toString().toLowerCase().includes(q)
  })

  return (
    <Layout>
      {unauthorized && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4 text-sm">
          <span>You don't have permission to access that page.</span>
          <button onClick={() => navigate('/dashboard', { replace: true, state: {} })} className="text-amber-600 hover:text-amber-800 font-medium ml-4 flex-shrink-0">Dismiss</button>
        </div>
      )}

      {showWelcome && profile?.user_id && (
        <WelcomeModal
          userId={profile.user_id}
          onDone={() => setShowWelcome(false)}
        />
      )}

      {/* Welcome */}
      {community?.name && !showFormer && (
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">Welcome to</p>
          <h1 className="text-3xl font-bold text-slate-800 leading-tight">{community.name}</h1>
        </div>
      )}

      {!showFormer && communityId && (
        <GettingStartedChecklist communityId={communityId} />
      )}

      {/* Summary stats bar — active residents only */}
      {!showFormer && !loading && residents.length > 0 && (
        <div className="mb-5 space-y-3">
          {/* High-severity alert banner */}
          {highSeverityCount > 0 && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span>⚠ {highSeverityCount} high-severity incident{highSeverityCount !== 1 ? 's' : ''} require attention</span>
              <Link to="/incidents" className="text-red-600 hover:text-red-800 font-semibold ml-4 flex-shrink-0 underline">View</Link>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Active Residents */}
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800 leading-none">{residents.length}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Active Residents</p>
                </div>
              </div>
            </div>

            {/* Meds Incomplete */}
            {(() => {
              const medsIncomplete = residents.filter(r => {
                const s = medStatusMap[r.id]
                return s === 'none' || s === 'partial'
              }).length
              const isAmber = medsIncomplete > 0
              return (
                <div onClick={() => navigate('/dispense')} className={`rounded-2xl px-4 py-4 border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${isAmber ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isAmber ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                      <svg className={`w-4 h-4 ${isAmber ? 'text-amber-600' : 'text-emerald-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 1-2-2V9m6 5h4m0 0v-3m0 3v3"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold leading-none ${isAmber ? 'text-amber-700' : 'text-emerald-700'}`}>{medsIncomplete}</p>
                      <p className={`text-xs mt-0.5 ${isAmber ? 'text-amber-600' : 'text-emerald-600'}`}>Meds Incomplete</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Open Incidents */}
            {(() => {
              const isRed = openIncidentCount > 0
              return (
                <div onClick={() => navigate('/incidents')} className={`rounded-2xl px-4 py-4 border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${isRed ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isRed ? 'bg-red-100' : 'bg-slate-100'}`}>
                      <svg className={`w-4 h-4 ${isRed ? 'text-red-500' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold leading-none ${isRed ? 'text-red-700' : 'text-slate-800'}`}>{openIncidentCount}</p>
                      <p className={`text-xs mt-0.5 ${isRed ? 'text-red-600' : 'text-slate-500'}`}>Open Incidents</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Appointments Today */}
            {(() => {
              const hasAppts = apptCount > 0
              return (
                <div onClick={() => navigate('/calendar')} className={`rounded-2xl px-4 py-4 border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${hasAppts ? 'border-[#185FA5] bg-[#E6F1FB]' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasAppts ? 'bg-[#185FA5]/20' : 'bg-slate-100'}`}>
                      <svg className={`w-4 h-4 ${hasAppts ? 'text-[#185FA5]' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold leading-none ${hasAppts ? 'text-[#185FA5]' : 'text-slate-800'}`}>{apptCount}</p>
                      <p className={`text-xs mt-0.5 ${hasAppts ? 'text-[#185FA5]' : 'text-slate-500'}`}>Appts Today</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Prospects in Pipeline */}
            {(() => {
              const hasProspects = prospectCount > 0
              return (
                <div onClick={() => navigate('/occupancy')} className={`rounded-2xl px-4 py-4 border hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer ${hasProspects ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasProspects ? 'bg-purple-100' : 'bg-slate-100'}`}>
                      <svg className={`w-4 h-4 ${hasProspects ? 'text-purple-600' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold leading-none ${hasProspects ? 'text-purple-700' : 'text-slate-800'}`}>{prospectCount}</p>
                      <p className={`text-xs mt-0.5 ${hasProspects ? 'text-purple-600' : 'text-slate-500'}`}>Prospects</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── Needs Attention panel ── */}
          {(() => {
            const medsIncomplete = residents.filter(r => {
              const s = medStatusMap[r.id]
              return s === 'none' || s === 'partial'
            }).length
            const items = []
            if (medsIncomplete > 0) items.push({
              key: 'meds',
              icon: (
                <svg className="w-4 h-4 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 1-2-2V9m6 5h4m0 0v-3m0 3v3"/>
                </svg>
              ),
              iconBg: 'bg-amber-100',
              label: `${medsIncomplete} resident${medsIncomplete !== 1 ? 's' : ''} with incomplete medications today`,
              link: '/dispense',
            })
            if (highSeverityCount > 0) items.push({
              key: 'incidents',
              icon: (
                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              ),
              iconBg: 'bg-red-100',
              label: `${highSeverityCount} high-severity incident${highSeverityCount !== 1 ? 's' : ''} open — review required`,
              link: '/incidents',
            })
            if (expiringCertCount > 0) items.push({
              key: 'certs',
              icon: (
                <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
              ),
              iconBg: 'bg-orange-100',
              label: `${expiringCertCount} staff certification${expiringCertCount !== 1 ? 's' : ''} expiring within 30 days`,
              link: '/certifications',
            })
            if (items.length === 0) return null
            return (
              <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden mt-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p className="text-sm font-semibold text-amber-800">Needs Attention</p>
                  <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map(item => (
                    <button key={item.key} onClick={() => navigate(item.link)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                        {item.icon}
                      </div>
                      <p className="flex-1 text-sm text-slate-700">{item.label}</p>
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold text-slate-800">
          {showFormer ? 'Former Residents' : 'Residents'}
        </h1>
        <div className="flex items-center gap-2">
          {/* Toggle: Active / Former */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => { setShowFormer(false); setSearch('') }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${!showFormer ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active
            </button>
            <button
              onClick={() => { setShowFormer(true); setSearch('') }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${showFormer ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Former
            </button>
          </div>

          {/* Add button — only on active tab */}
          {!showFormer && (
            <button
              onClick={() => setShowForm(true)}
              className="text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)', boxShadow: '0 2px 12px rgba(24,95,165,0.4)' }}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={showFormer ? 'Search former residents…' : 'Search residents or room…'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
        />
      </div>

      {/* Care level filter — active residents only */}
      {!showFormer && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-4 pb-0.5">
          {careOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setCareFilter(opt)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                careFilter === opt
                  ? 'bg-[#185FA5] text-white'
                  : opt !== 'All' && CARE_LEVEL_COLORS[opt]
                    ? `${CARE_LEVEL_COLORS[opt]} opacity-80 hover:opacity-100`
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
          </div>
          <div className="h-6 w-24 bg-slate-200 rounded-lg mb-4" style={{ animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
          {isMobile ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <ResidentRowSkeleton /><ResidentRowSkeleton /><ResidentRowSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <ResidentCardSkeleton /><ResidentCardSkeleton /><ResidentCardSkeleton /><ResidentCardSkeleton />
            </div>
          )}
        </div>
      )}

      {!loading && residents.length === 0 && showFormer && (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium text-slate-500">No former residents on file</p>
        </div>
      )}

      {!loading && residents.length === 0 && !showFormer && (
        <div className="space-y-4 py-4">
          {/* Welcome banner */}
          <div className="bg-gradient-to-br from-[#042C53] to-[#185FA5] rounded-2xl px-6 py-6 text-white">
            <h2 className="text-lg font-bold mb-1">You're all set! 🎉</h2>
            <p className="text-sm text-white/80">Your community is ready. Here's how to get started:</p>
          </div>

          {/* Getting Started steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Step 1 — Add resident */}
            <button
              onClick={() => setShowForm(true)}
              className="text-left bg-white border-2 border-[#185FA5] rounded-2xl p-4 hover:bg-[#E6F1FB] transition-colors group"
            >
              <div className="w-10 h-10 bg-[#E6F1FB] rounded-xl flex items-center justify-center mb-3 group-hover:bg-white transition-colors">
                <svg className="w-5 h-5 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800 text-sm">Add your first resident</p>
              <p className="text-xs text-slate-500 mt-0.5">Create a resident profile to get started</p>
              <span className="inline-block mt-2 text-xs font-semibold text-[#185FA5]">Start here →</span>
            </button>

            {/* Step 2 — Invite staff */}
            <button
              onClick={() => navigate('/staff')}
              className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="font-semibold text-slate-800 text-sm">Invite your staff</p>
              <p className="text-xs text-slate-500 mt-0.5">Add caregivers and team members</p>
              <span className="inline-block mt-2 text-xs font-semibold text-slate-400">Go to Staff →</span>
            </button>

            {/* Step 3 — Settings (admin only) */}
            {isAdmin && (
              <button
                onClick={() => navigate('/settings')}
                className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-800 text-sm">Configure settings</p>
                <p className="text-xs text-slate-500 mt-0.5">Set capacity, rates, and facility info</p>
                <span className="inline-block mt-2 text-xs font-semibold text-slate-400">Go to Settings →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && residents.length > 0 && filtered.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">No residents match "{search}"</p>
      )}

      {/* Mobile: list view */}
      {isMobile && !loading && filtered.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {filtered.map((r, i) => {
            const age = getAge(r.date_of_birth)
            const name = getResidentFullName(r)
            const status = !showFormer ? (medStatusMap[r.id] ?? 'no_meds') : undefined
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/residents/${r.id}`)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}
              >
                <ListAvatar resident={r} medStatus={status} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="text-sm text-slate-400">Room {r.room_number || '—'}{age !== null ? ` · ${age} yrs` : ''}</p>
                    {r.care_level && !showFormer && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${CARE_LEVEL_COLORS[r.care_level] || 'bg-slate-100 text-slate-600'}`}>{r.care_level}</span>
                    )}
                    {showFormer && <StatusBadge reason={r.removal_reason} />}
                  </div>
                  {!showFormer && r.updated_at && (
                    <p className="text-[10px] text-slate-300 mt-0.5">{fmtUpdated(r.updated_at)}</p>
                  )}
                </div>
                <ChevronRight />
              </button>
            )
          })}
        </div>
      )}

      {/* Desktop: grid view */}
      {!isMobile && !loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(r => {
            const age = getAge(r.date_of_birth)
            const status = !showFormer ? (medStatusMap[r.id] ?? 'no_meds') : undefined
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/residents/${r.id}`)}
                className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#378ADD] hover:-translate-y-1 transition-all duration-200"
              >
                <div className="aspect-[3/4] w-full relative">
                  <CardPhoto resident={r} />
                  {/* Med status dot — bottom-right corner of photo */}
                  {status && (
                    <span
                      className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white"
                      style={{ background: RING_COLOR[status] }}
                      title={status === 'all' ? 'All meds given' : status === 'partial' ? 'Partially given' : status === 'none' ? 'No meds given yet' : 'No medications'}
                    />
                  )}
                  {showFormer && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <StatusBadge reason={r.removal_reason} />
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-semibold text-slate-800 truncate text-sm">{getResidentFullName(r)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-400">Room {r.room_number || '—'}</p>
                    {r.care_level && !showFormer
                      ? <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${CARE_LEVEL_COLORS[r.care_level] || 'bg-slate-100 text-slate-600'}`}>{r.care_level}</span>
                      : age !== null && <p className="text-xs text-slate-500 font-medium">{age} yrs</p>
                    }
                  </div>
                  {!showFormer && r.updated_at && (
                    <p className="text-[10px] text-slate-300 mt-1">{fmtUpdated(r.updated_at)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showForm && (
        <ResidentForm onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </Layout>
  )
}
