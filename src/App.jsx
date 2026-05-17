import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { completeTrial } from './lib/trial'
import { FacilityProvider } from './context/FacilityContext'
import { ProfileProvider, useProfile } from './context/ProfileContext'
import { CommunityProvider, useCommunity } from './context/CommunityContext'
import RequireAdmin from './components/auth/RequireAdmin'
import RequireSuperAdmin from './components/auth/RequireSuperAdmin'
import AppLoader from './components/ui/AppLoader'
import Login from './pages/Login'
import Marketing from './pages/Marketing'
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
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Signup from './pages/Signup'
import TrialExpired from './pages/TrialExpired'
import TrialLockedFeature from './pages/TrialLockedFeature'
import ResetPassword from './pages/ResetPassword'

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

function ProtectedRoute({ children, trialLocked, featureName }) {
  const { profile, loading: profileLoading, profileError } = useProfile()
  const { memberships, communityId, community, loading: communityLoading, isSuperAdmin, loadError, reload } = useCommunity()

  if (profileLoading || communityLoading) return <AppLoader />

  // Show a recoverable error screen if context loads fail (network blips, etc.)
  if (loadError || profileError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6">We couldn't load your account data. Check your connection and try again.</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => reload()}
              className="w-full bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

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

  // Trial expired — lock everything except sign-out
  if (community?.plan === 'trial' && community?.trial_end_date) {
    const expired = new Date(community.trial_end_date) <= new Date()
    if (expired) return <TrialExpired />
  }

  // Feature locked during trial
  if (trialLocked && community?.plan === 'trial') {
    return <TrialLockedFeature featureName={featureName} />
  }

  return children
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)

      // After email confirmation, complete the trial setup if pending data exists
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        const raw = localStorage.getItem('haven_trial_pending')
        if (raw) {
          try {
            const pending = JSON.parse(raw)
            // Guard: only consume pending data if it belongs to this user
            if (pending.email && session.user.email !== pending.email) {
              // Wrong user signed in — leave pending data for the right user
              return
            }
            localStorage.removeItem('haven_trial_pending')
            await completeTrial({
              userId: session.user.id,
              email: pending.email ?? session.user.email,
              firstName: pending.firstName ?? '',
              lastName: pending.lastName ?? '',
              communityName: pending.communityName,
              residentCount: pending.residentCount ?? 6,
            })
          } catch (err) {
            console.error('Trial setup after email confirmation failed:', err)
          }
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <AppLoader />

  return (
    <BrowserRouter>
      <CommunityProvider>
        <ProfileProvider>
          <FacilityProvider>
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
              <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <Signup />} />
              <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" replace />} />
              <Route path="/community" element={session ? <CommunityPicker /> : <Navigate to="/login" replace />} />
              <Route path="/complete-profile" element={session ? <ProfileCompletion /> : <Navigate to="/login" replace />} />

              {/* Public routes — no auth required */}
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
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
                session ? <ProtectedRoute trialLocked featureName="Staff Directory"><StaffDirectory /></ProtectedRoute> : <Navigate to="/login" replace />
              } />

              <Route path="/settings" element={
                session ? <ProtectedRoute trialLocked featureName="Facility Settings"><RequireAdmin><FacilitySettings /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/schedule" element={
                session ? <ProtectedRoute trialLocked featureName="Staff Scheduling"><RequireAdmin><Schedule /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/billing" element={
                session ? <ProtectedRoute trialLocked featureName="Billing"><RequireAdmin><Billing /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/occupancy" element={
                session ? <ProtectedRoute trialLocked featureName="Occupancy & Prospects"><RequireAdmin><Occupancy /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/certifications" element={
                session ? <ProtectedRoute trialLocked featureName="Certifications"><RequireAdmin><Certifications /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />
              <Route path="/notifications" element={
                session ? <ProtectedRoute trialLocked featureName="Notification Log"><RequireAdmin><NotificationLog /></RequireAdmin></ProtectedRoute> : <Navigate to="/login" replace />
              } />

              <Route path="/superadmin" element={session ? <ProtectedRoute><RequireSuperAdmin><SuperAdmin /></RequireSuperAdmin></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to={session ? '/dashboard' : '/'} replace />} />
            </Routes>
          </FacilityProvider>
        </ProfileProvider>
      </CommunityProvider>
    </BrowserRouter>
  )
}
