import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import ResidentForm from '../components/residents/ResidentForm'
import { useFacility } from '../context/FacilityContext'
import { useCommunity } from '../context/CommunityContext'

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
    return (
      <img
        src={resident.avatar_url}
        alt={getResidentFullName(resident)}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover"
      />
    )
  }

  return (
    <div className="w-full h-full bg-[#E6F1FB] flex items-center justify-center">
      <span className="text-[#185FA5] font-semibold text-5xl">{initials}</span>
    </div>
  )
}

export default function Dashboard() {
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const unauthorized = location.state?.unauthorized
  const openAddResident = location.state?.openAddResident
  const { facility } = useFacility()
  const { communityId } = useCommunity()
  const facilityName = facility?.facility_name || 'Haven'

  useEffect(() => {
    if (openAddResident) setShowForm(true)
  }, [openAddResident])

  useEffect(() => {
    if (!communityId) return
    supabase
      .from('residents')
      .select('*')
      .eq('community_id', communityId)
      .order('full_name')
      .then(({ data }) => {
        setResidents(data ?? [])
        setLoading(false)
      })
  }, [communityId])

  function handleSaved(newResident) {
    setResidents(prev => [...prev, newResident].sort((a, b) => getResidentFullName(a).localeCompare(getResidentFullName(b))))
    setShowForm(false)
  }

  return (
    <Layout>
      {unauthorized && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-6 text-sm">
          <span>You don't have permission to access that page.</span>
          <button
            onClick={() => navigate('/dashboard', { replace: true, state: {} })}
            className="text-amber-600 hover:text-amber-800 font-medium ml-4 flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
      <h2 className="text-2xl font-medium text-slate-800 mb-6">Welcome to {facilityName}</h2>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Residents</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Resident
        </button>
      </div>

      {loading && (
        <p className="text-slate-400 text-sm">Loading…</p>
      )}

      {!loading && residents.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No residents yet</p>
          <p className="text-sm mt-1">Click "Add Resident" to get started.</p>
        </div>
      )}

      {!loading && residents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {residents.map(r => {
            const age = getAge(r.date_of_birth)
            return (
              <button
                key={r.id}
                onClick={() => navigate(`/residents/${r.id}`)}
                className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-[#378ADD] transition-all"
              >
                <div className="aspect-[3/4] w-full">
                  <CardPhoto resident={r} />
                </div>
                <div className="px-3 py-2.5">
                  <p className="font-semibold text-slate-800 truncate text-sm">{getResidentFullName(r)}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-400">Room {r.room_number || '—'}</p>
                    {age !== null && (
                      <p className="text-xs text-slate-500 font-medium">{age} yrs</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showForm && (
        <ResidentForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </Layout>
  )
}
