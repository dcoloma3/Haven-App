import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { adminKey, isMedDueOnDate, computeResidentStatus } from '../lib/medStatus'
import Layout from '../components/layout/Layout'
import ResidentAvatar from '../components/residents/ResidentAvatar'
import ResidentProfile from '../components/residents/ResidentProfile'
import MedicationList from '../components/medications/MedicationList'
import ContactList from '../components/contacts/ContactList'
import LeaseDetails from '../components/lease/LeaseDetails'
import HealthCare from '../components/health/HealthCare'
import PhotoGallery from '../components/photos/PhotoGallery'
import ResidentMedHistory from '../components/residents/ResidentMedHistory'
import ResidentAppointments from '../components/appointments/ResidentAppointments'
import ResidentIncidents from '../components/incidents/ResidentIncidents'
import DocumentVault from '../components/documents/DocumentVault'
import VitalsLog from '../components/vitals/VitalsLog'
import CarePlanList from '../components/careplans/CarePlanList'
import ADLTracker from '../components/adl/ADLTracker'
import DietaryProfile from '../components/dietary/DietaryProfile'
import FamilyAccess from '../components/family/FamilyAccess'
import BillingHistory from '../components/billing/BillingHistory'
import MoveChecklist from '../components/moveinout/MoveChecklist'
import ResidentTransportation from '../components/transportation/ResidentTransportation'
import { useCommunity } from '../context/CommunityContext'
import { useIsMobile } from '../hooks/useIsMobile'

const ALL_TABS = ['Profile', 'Medications', 'Contacts', 'Health & Care', 'Lease', 'Photos', 'Appointments', 'Med History', 'Incidents', 'Documents', 'Vitals', 'Care Plan', 'ADLs', 'Dietary', 'Family', 'Billing', 'Checklist', 'Transport']
const STAFF_TABS = ['Profile', 'Medications', 'Contacts', 'Health & Care', 'Photos', 'Appointments', 'Med History', 'Incidents', 'Documents', 'Vitals', 'Care Plan', 'ADLs', 'Dietary', 'Checklist', 'Transport']

const REMOVAL_REASONS = [
  'Moved Out',
  'Passed Away',
  'Transferred to Another Facility',
  'Discharged',
  'Other',
]

function RemovalModal({ onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [saving, setSaving] = useState(false)
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent'

  const finalReason = reason === 'Other' ? customReason.trim() : reason
  const canSubmit = reason && (reason !== 'Other' || customReason.trim())

  async function handleConfirm() {
    if (!canSubmit) return
    setSaving(true)
    await onConfirm(finalReason)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="font-bold text-slate-800 text-lg mb-1">Remove Resident</h2>
        <p className="text-sm text-slate-500 mb-5">Their profile and history will be kept on file and viewable under "Former Residents".</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason for removal</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a reason…</option>
              {REMOVAL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {reason === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Please describe</label>
              <textarea
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                rows={3}
                placeholder="Enter the reason…"
                className={inputCls + ' resize-none'}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || saving}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            {saving ? 'Removing…' : 'Remove Resident'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ResidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin, communityId } = useCommunity()
  const isMobile = useIsMobile()
  const [resident, setResident] = useState(null)
  const [activeTab, setActiveTab] = useState('Profile')
  const [loading, setLoading] = useState(true)
  const [showRemovalModal, setShowRemovalModal] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [medStatus, setMedStatus] = useState(null)
  const tabsRef = useRef(null)

  const todayStr = new Date().toISOString().split('T')[0]

  const TABS = isAdmin ? ALL_TABS : STAFF_TABS
  const isInactive = resident?.status === 'inactive'

  useEffect(() => {
    supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => { setResident(data); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (location.state?.openTab) {
      setActiveTab(location.state.openTab)
    }
  }, []) // eslint-disable-line

  // Fetch today's med status for the ring indicator
  const refreshMedStatus = useCallback(async () => {
    const [{ data: meds }, { data: admins }] = await Promise.all([
      supabase.from('medications').select('id, scheduled_times, frequency_type, frequency_days, frequency_interval, start_date, end_date').eq('resident_id', id),
      supabase.from('medication_administrations').select('medication_id, scheduled_time').eq('resident_id', id).eq('administered_date', todayStr),
    ])
    const administeredSet = new Set((admins ?? []).map(a => adminKey(a.medication_id, a.scheduled_time)))
    setMedStatus(computeResidentStatus(meds ?? [], administeredSet, todayStr))
  }, [id, todayStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshMedStatus() }, [refreshMedStatus])

  function handleTabClick(tab) {
    setActiveTab(tab)
    if (tabsRef.current) {
      const btn = tabsRef.current.querySelector(`[data-tab="${tab}"]`)
      if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  }

  async function handleRemove(reason) {
    const { data } = await supabase
      .from('residents')
      .update({ status: 'inactive', removal_reason: reason })
      .eq('id', id)
      .select()
      .single()
    if (data) setResident(data)
    setShowRemovalModal(false)
  }

  async function handleReactivate() {
    setReactivating(true)
    const { data } = await supabase
      .from('residents')
      .update({ status: 'active', removal_reason: null })
      .eq('id', id)
      .select()
      .single()
    if (data) setResident(data)
    setReactivating(false)
  }

  if (loading) {
    return <Layout><p className="text-slate-400 text-sm">Loading…</p></Layout>
  }

  if (!resident) {
    return <Layout><p className="text-slate-500 text-sm">Resident not found.</p></Layout>
  }

  const fullName = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean).join(' ') || resident.full_name

  return (
    <Layout>
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-sm text-[#185FA5] font-medium mb-4 -ml-1 px-1 py-1 rounded-lg active:bg-slate-100 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Residents
      </button>

      {/* Inactive banner */}
      {isInactive && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">Former Resident</p>
            {resident.removal_reason && (
              <p className="text-xs text-red-500 mt-0.5">{resident.removal_reason}</p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              {reactivating ? 'Reactivating…' : 'Reactivate'}
            </button>
          )}
        </div>
      )}

      {/* Resident header */}
      <div className="flex items-center gap-4 mb-5">
        <ResidentAvatar resident={resident} onUpdate={setResident} medStatus={medStatus} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{fullName}</h1>
          <p className="text-sm text-slate-400 mt-0.5">Room {resident.room_number || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-5 -mx-4 px-4">
        <div ref={tabsRef} className="flex gap-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              data-tab={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab ? 'border-[#185FA5] text-[#185FA5]' : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Profile' && <ResidentProfile resident={resident} onUpdate={setResident} />}
      {activeTab === 'Medications' && <MedicationList residentId={id} onMedStatusChange={refreshMedStatus} />}
      {activeTab === 'Contacts' && <ContactList residentId={id} />}
      {activeTab === 'Lease' && <LeaseDetails residentId={id} />}
      {activeTab === 'Health & Care' && <HealthCare residentId={id} />}
      {activeTab === 'Photos' && <PhotoGallery residentId={id} />}
      {activeTab === 'Appointments' && <ResidentAppointments residentId={id} communityId={communityId} />}
      {activeTab === 'Med History' && <ResidentMedHistory residentId={id} resident={resident} />}
      {activeTab === 'Incidents' && <ResidentIncidents residentId={id} resident={resident} />}
      {activeTab === 'Documents' && <DocumentVault residentId={id} resident={resident} />}
      {activeTab === 'Vitals' && <VitalsLog residentId={id} resident={resident} />}
      {activeTab === 'Care Plan' && <CarePlanList residentId={id} resident={resident} />}
      {activeTab === 'ADLs' && <ADLTracker residentId={id} resident={resident} />}
      {activeTab === 'Dietary' && <DietaryProfile residentId={id} resident={resident} />}
      {activeTab === 'Family' && <FamilyAccess residentId={id} resident={resident} />}
      {activeTab === 'Billing' && <BillingHistory residentId={id} resident={resident} />}
      {activeTab === 'Checklist' && <MoveChecklist residentId={id} resident={resident} />}
      {activeTab === 'Transport' && <ResidentTransportation residentId={id} resident={resident} />}

      {/* Remove Resident — admin only, active residents only */}
      {isAdmin && !isInactive && (
        <div className="mt-10 pt-6 border-t border-slate-100">
          <button
            onClick={() => setShowRemovalModal(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Remove Resident
          </button>
        </div>
      )}

      {showRemovalModal && (
        <RemovalModal
          onClose={() => setShowRemovalModal(false)}
          onConfirm={handleRemove}
        />
      )}
    </Layout>
  )
}
