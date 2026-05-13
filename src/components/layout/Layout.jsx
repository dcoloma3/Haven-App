import Navbar from './Navbar'
import SuperAdminBar from './SuperAdminBar'
import { useCommunity } from '../../context/CommunityContext'

export default function Layout({ children }) {
  const { isSuperAdmin, communityId } = useCommunity()
  const hasBar = isSuperAdmin && !!communityId

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className={`max-w-5xl mx-auto px-4 py-6 ${hasBar ? 'pb-16' : ''}`}>
        {children}
      </main>
      <SuperAdminBar />
    </div>
  )
}
