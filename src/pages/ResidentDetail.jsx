import { useEffect, useState } from 'react'
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

const TABS = ['Profile', 'Medications', 'Contacts', 'Health & Care', 'Lease', 'Photos', 'Med History']

export default function ResidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resident, setResident] = useState(null)
  const [activeTab, setActiveTab] = useState('Profile')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setResident(data); setLoading(false) })
  }, [id])

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

  return (
    <Layout>
      <button
        onClick={() => navigate('/dashboard')}
        className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1 transition-colors"
      >
        ← Back to Residents
      </button>

      <div className="flex items-center gap-4 mb-5">
        <ResidentAvatar resident={resident} onUpdate={setResident} />
        <div>
          <h1 className="text-xl font-semibold text-slate-800 mb-0.5">
            {[resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(' ') || resident.full_name}
          </h1>
          <p className="text-sm text-slate-400">Room {resident.room_number || '—'}</p>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-[#185FA5] text-[#185FA5]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
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
