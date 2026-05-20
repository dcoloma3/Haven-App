import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import TrialBanner from './TrialBanner'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useCommunity } from '../../context/CommunityContext'

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('haven_sidebar') === '1' } catch { return false }
  })
  function toggle() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('haven_sidebar', next ? '1' : '0') } catch {}
      return next
    })
  }
  return { collapsed, toggle }
}

export default function Layout({ children }) {
  const isMobile = useIsMobile()
  const location = useLocation()
  const { community, viewAsRole, setViewAsRole } = useCommunity()
  const { collapsed, toggle } = useSidebarCollapsed()

  const isTrial = community?.plan === 'trial'
  const trialActive = isTrial && community?.trial_end_date && new Date(community.trial_end_date) > new Date()
  const isStaffView = viewAsRole === 'staff'

  // Navbar 61px + optional trial banner 36px + optional staff banner 36px
  const bannerCount = (trialActive ? 1 : 0) + (isStaffView ? 1 : 0)
  const topPad = bannerCount === 2 ? 'pt-[133px]' : bannerCount === 1 ? 'pt-[97px]' : 'pt-[61px]'
  const leftPad = !isMobile ? (collapsed ? 'pl-[56px]' : 'pl-[208px]') : ''

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />
      {trialActive && <TrialBanner />}
      {isStaffView && (
        <div className="fixed top-[61px] left-0 right-0 z-40 flex items-center justify-between gap-3 bg-violet-600 px-4 py-2 text-white text-xs font-medium" style={{ marginTop: trialActive ? '36px' : '0' }}>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>Staff View — you're seeing the app as a staff member. Admin features are hidden.</span>
          </div>
          <button
            onClick={() => setViewAsRole(null)}
            className="flex-shrink-0 underline underline-offset-2 hover:text-white/80 transition-colors whitespace-nowrap"
          >
            Exit Staff View
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar collapsed={collapsed} onToggle={toggle} />}

      {/* Main content */}
      <main className={`w-full ${topPad} ${leftPad} transition-all duration-200`}>
        <div
          key={location.pathname}
          className={`max-w-5xl mx-auto px-4 py-5 sm:px-6 animate-page-in ${isMobile ? 'pb-28' : 'pb-8'}`}
        >
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      {isMobile && <MobileNav />}


    </div>
  )
}
