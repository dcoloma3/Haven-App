import { Navigate } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

export default function RequireAdmin({ children }) {
  const { isAdmin, loading } = useCommunity()

  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace state={{ unauthorized: true }} />
  return children
}
