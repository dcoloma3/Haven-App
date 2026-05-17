import { Navigate } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

export default function RequireSuperAdmin({ children }) {
  const { isSuperAdmin, loading } = useCommunity()

  if (loading) return null
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace state={{ unauthorized: true }} />
  return children
}
