import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import ResidentAvatar from '../components/residents/ResidentAvatar'
import ResidentProfile from '../components/residents/ResidentProfile'
import MedicationList from '../components/medications/MedicationList'
import ContactList from '../components/contacts/ContactList'
import LeaseDetails from '../components/lease/LeaseDetails'
import HealthCare from '../components/health/HealthCare'
import PhotoGallery from '../components/photos/PhotoGallery'
import ResidentMedHistory from '../components/residents/ResidentMedHistory'
import { useCommunity } from '../context/CommunityContext'
import { useIsMobile } from '../hooks/useIsMobile'

const ALL_TABS = ['Profile', 'Medications', 'Contacts', 'Health & Care', 'Lease', 'Photos', 'Med History']
const STAFF_TABS = ['Profile', 'Medications', 'Contacts', 'Health & Care', 'Photos', 'Med History']

export default function ResidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useCommunity()
  const isMobile = useIsMobile()
  const [resident, setResident] = useState(null)
  const [activeTab, setActiveTab] = useState('Profile')
  const [loading, setLoading] = useState(true)
  const tabsRef = useRef(null)

  const TABS = isAdmin ? ALL_TABS : STAFF_TABS

  useEffect(() => {
    supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setResident(data); setLoading(false) })
  }, [id])

  function handleTabClick(tab) {
    setActiveTab(tab)
    // Scroll the active tab into view on mobile
    if (tabsRef.current) {
      const btn = tabsRef.current.querySelector(`[data-tab="${tab}"]`)
      if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-slate-400 text-sm">Loading…</p>
      </Layout>
    )
  }

  if (!resident) {
    return (
      <Layout>
        <p className="text-slate-500 text-sm">Resident not found.</p>
      </Layout>
    )
  }

  const fullName = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(' ') || resident.full_name

  return (
    <Layout>
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-[#185FA5] font-medium mb-4 -ml-1 px-1 py-1 rounded-lg active:bg-slate-100 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Residents
      </button>

      {/* Resident header */}
      <div className="flex items-center gap-4 mb-5">
        <ResidentAvatar resident={resident} onUpdate={setResident} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{fullName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Room {resident.room_number || '—'}</p>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="border-b border-slate-200 mb-5 -mx-4 px-4">
        <div ref={tabsRef} className="flex gap-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              data-tab={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab
                  ? 'border-[#185FA5] text-[#185FA5]'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Profile' && <ResidentProfile resident={resident} onUpdate={setResident} />}
      {activeTab === 'Medications' && <MedicationList residentId={id} />}
      {activeTab === 'Contacts' && <ContactList residentId={id} />}
      {activeTab === 'Lease' && <LeaseDetails residentId={id} />}
      {activeTab === 'Health & Care' && <HealthCare residentId={id} />}
      {activeTab === 'Photos' && <PhotoGallery residentId={id} />}
      {activeTab === 'Med History' && <ResidentMedHistory residentId={id} resident={resident} />}
    </Layout>
  )
}
