import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { FacilityProvider } from './context/FacilityContext'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { CommunityProvider, useCommunity } from './context/CommunityContext'
import RequireAdmin from './components/auth/RequireAdmin'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import CommunityPicker from './pages/CommunityPicker'
import Dashboard from './pages/Dashboard'
import ResidentDetail from './pages/ResidentDetail'
import Calendar from './pages/Calendar'
import FacilitySettings from './pages/FacilitySettings'
import StaffDirectory from './pages/StaffDirectory'
import MyProfile from './pages/MyProfile'
import Schedule from './pages/Schedule'
import Dispense from './pages/Dispense'
import Incidents from './pages/Incidents'
import SuperAdmin from './pages/SuperAdmin'
import ProfileCompletion from './pages/ProfileCompletion'
import VitalSigns from './pages/VitalSigns'
import ShiftLog from './pages/ShiftLog'
import Billing from './pages/Billing'
import Occupancy from './pages/Occupancy'
import Certifications from './pages/Certifications'
import NotificationLog from './pages/NotificationLog'
import Maintenance from './pages/Maintenance'
import Transportation from './pages/Transportation'
import Activities from './pages/Activities'
import FamilyView from './pages/FamilyView'
import MedicationHistory from './pages/MedicationHistory'

function NoMembershipScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Community Access</h2>
        <p className="text-sm text-slate-500 mb-6">
          Your account isn't linked to a community yet. Please contact your facility administrator to be added to your community.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { profile, loading: profileLoading } = useProfile()
  const { memberships, communityId, loading: communityLoading, isSuperAdmin } = useCommunity()

  if (profileLoading || communityLoading) return null

  // Needs onboarding
  if (profile !== null && profile?.onboarding_complete === false) {
    return <Navigate to="/onboarding" replace />
  }
  if (profile !== null && profile?.onboarding_complete == null) {
    return <Navigate to="/onboarding" replace />
  }

  // Needs profile completion (new users only — existing users have null, not false)
  if (profile !== null && profile?.profile_completed === false) {
    return <Navigate to="/complete-profile" replace />
  }

  // No community memberships — show helpful screen (super admins are exempt)
  if (!isSuperAdmin && memberships.length === 0) {
    return <NoMembershipScreen />
  }

  // Multiple communities, none selected yet
  if (memberships.length > 1 && !communityId) {
    return <Navigate to="/community" replace />
  }

  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <CommunityProvider>
        <ProfileProvider>
          <FacilityProvider>
            <Routes>
              <Route path="/" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
              <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
              <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" replace />} />
              <Route path="/community" element={session ? <CommunityPicker /> : <Navigate to="/login" replace />} />
              <Route path="/complete-profile" element={session ? <ProfileCompletion /> : <Navigate to="/login" replace />} />

              {/* Public route — no auth required */}
              <Route path="/family/:token" element={<FamilyView />} />

              <Route path="/dashboard" element={session ? <ProtectedRoute><Dashboard /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/residents/:id" element={session ? <ProtectedRoute><ResidentDetail /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/calendar" element={session ? <ProtectedRoute><Calendar /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/dispense" element={session ? <ProtectedRoute><Dispense /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/incidents" element={session ? <ProtectedRoute><Incidents /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/profile" element={session ? <ProtectedRoute><MyProfile /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/vitals" element={session ? <ProtectedRoute><VitalSigns /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/shift-log" element={session ? <ProtectedRoute><ShiftLog /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/maintenance" element={session ? <ProtectedRoute><Maintenance /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/transportation" element={session ? <ProtectedRoute><Transportation /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/activities" element={session ? <ProtectedRoute><Activities /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/medication-history" element={session ? <ProtectedRoute><MedicationHistory /></ProtectedRoute> : <Navigate to="/login" replace />} />

              <Route path="/staff" element={
                session ? <ProtectedRoute><StaffDirectory /></ProtectedRoute> : <Navigate to="/login" replace />
              } />

              <Route path="/settings" element={
                session ? <ProtectedRoute><RequireAdmin><FacilitySettings /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/schedule" element={
                session ? <ProtectedRoute><RequireAdmin><Schedule /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/billing" element={
                session ? <ProtectedRoute><RequireAdmin><Billing /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/occupancy" element={
                session ? <ProtectedRoute><RequireAdmin><Occupancy /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/certifications" element={
                session ? <ProtectedRoute><RequireAdmin><Certifications /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/notifications" element={
                session ? <ProtectedRoute><RequireAdmin><NotificationLog /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />

              <Route path="/superadmin" element={session ? <SuperAdmin /> : <Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
            </Routes>
          </FacilityProvider>
        </ProfileProvider>
      </CommunityProvider>
    </BrowserRouter>
  )
}
