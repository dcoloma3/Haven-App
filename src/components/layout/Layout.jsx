import Navbar from './Navbar'
import SuperAdminBar from './SuperAdminBar'
import MobileNav from './MobileNav'
import { useCommunity } from '../../context/CommunityContext'

export default function Layout({ children }) {
  const { isSuperAdmin, communityId } = useCommunity()
  const hasSuperAdminBar = isSuperAdmin && !!communityId

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />
      <main className={`w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-6 ${hasSuperAdminBar ? 'pb-20' : 'pb-28 sm:pb-6'}`}>
        {children}
      </main>
      <MobileNav />
      <SuperAdminBar />
    </div>
  )
}
