import Navbar from './Navbar'
import Sidebar from './Sidebar'
import SuperAdminBar from './SuperAdminBar'
import MobileNav from './MobileNav'
import { useCommunity } from '../../context/CommunityContext'
import { useIsMobile } from '../../hooks/useIsMobile'

export default function Layout({ children }) {
  const { isSuperAdmin, communityId } = useCommunity()
  const isMobile = useIsMobile()
  const hasSuperAdminBar = isSuperAdmin && !!communityId

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main content — offset right on desktop */}
      <main className={`w-full ${!isMobile ? 'pl-52' : ''}`}>
        <div className={`max-w-5xl mx-auto px-4 py-5 sm:px-6 ${hasSuperAdminBar ? 'pb-20' : isMobile ? 'pb-28' : 'pb-8'}`}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}
      <SuperAdminBar />
    </div>
  )
}
