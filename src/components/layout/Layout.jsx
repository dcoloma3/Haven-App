import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import QuickAdd from './QuickAdd'
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
  const { community } = useCommunity()
  const { collapsed, toggle } = useSidebarCollapsed()

  const isTrial = community?.plan === 'trial'
  const trialActive = isTrial && community?.trial_end_date && new Date(community.trial_end_date) > new Date()

  // Navbar is 61px. Trial banner adds 36px. Sidebar is 208px expanded / 56px collapsed.
  const topPad = trialActive ? 'pt-[97px]' : 'pt-[61px]'
  const leftPad = !isMobile ? (collapsed ? 'pl-[56px]' : 'pl-[208px]') : ''

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />
      {trialActive && <TrialBanner />}

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

      {/* Mobile floating quick-add FAB */}
      {isMobile && <QuickAdd />}
    </div>
  )
}
