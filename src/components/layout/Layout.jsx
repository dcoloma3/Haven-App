import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import QuickAdd from './QuickAdd'
import { useIsMobile } from '../../hooks/useIsMobile'

export default function Layout({ children }) {
  const isMobile = useIsMobile()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-50 w-full overflow-x-hidden">
      <Navbar />

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main content — offset right on desktop */}
      <main className={`w-full ${!isMobile ? 'pl-52' : ''}`}>
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
