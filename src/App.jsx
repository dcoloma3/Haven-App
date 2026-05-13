import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { FacilityProvider } from './context/FacilityContext'
import { ProfileProvider } from './context/ProfileContext'
import RequireAdmin from './components/auth/RequireAdmin'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ResidentDetail from './pages/ResidentDetail'
import Calendar from './pages/Calendar'
import FacilitySettings from './pages/FacilitySettings'
import StaffDirectory from './pages/StaffDirectory'
import MyProfile from './pages/MyProfile'
import Schedule from './pages/Schedule'
import Dispense from './pages/Dispense'

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
      <FacilityProvider>
        <ProfileProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
            <Route path="/residents/:id" element={session ? <ResidentDetail /> : <Navigate to="/login" replace />} />
            <Route path="/calendar" element={session ? <Calendar /> : <Navigate to="/login" replace />} />
            <Route path="/settings" element={
              session
                ? <RequireAdmin><FacilitySettings /></RequireAdmin>
                : <Navigate to="/login" replace />
            } />
            <Route path="/staff" element={
              session
                ? <RequireAdmin><StaffDirectory /></RequireAdmin>
                : <Navigate to="/login" replace />
            } />
            <Route path="/profile" element={session ? <MyProfile /> : <Navigate to="/login" replace />} />
            <Route path="/schedule" element={
              session
                ? <RequireAdmin><Schedule /></RequireAdmin>
                : <Navigate to="/login" replace />
            } />
            <Route path="/dispense" element={session ? <Dispense /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to={session ? '/dashboard' : '/login'} replace />} />
          </Routes>
        </ProfileProvider>
      </FacilityProvider>
    </BrowserRouter>
  )
}
