import { Navigate } from 'react-router-dom'
import { useProfile } from '../../context/ProfileContext'

export default function RequireAdmin({ children }) {
  const { isAdmin, loading } = useProfile()

  // Wait for profile to resolve so admins don't get a flash redirect
  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace state={{ unauthorized: true }} />
  return children
}
