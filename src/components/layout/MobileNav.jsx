import { NavLink } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'
import { useIsMobile } from '../../hooks/useIsMobile'

function HomeIcon({ active }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function DispenseIcon({ active }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  )
}

function CalendarIcon({ active }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor" fillOpacity="0.15" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function StaffIcon({ active }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ProfileIcon({ active }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

const tabCls = ({ isActive }) =>
  `flex flex-col items-center gap-1 px-3 py-1 transition-colors min-w-[56px] ${isActive ? 'text-[#185FA5]' : 'text-slate-400'}`

export default function MobileNav() {
  const { isAdmin } = useCommunity()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around"
      style={{ paddingTop: '8px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      <NavLink to="/dashboard" className={tabCls}>
        {({ isActive }) => (
          <>
            <HomeIcon active={isActive} />
            <span className="text-[10px] font-medium tracking-wide">Residents</span>
          </>
        )}
      </NavLink>

      <NavLink to="/dispense" className={tabCls}>
        {({ isActive }) => (
          <>
            <DispenseIcon active={isActive} />
            <span className="text-[10px] font-medium tracking-wide">Dispense</span>
          </>
        )}
      </NavLink>

      <NavLink to="/calendar" className={tabCls}>
        {({ isActive }) => (
          <>
            <CalendarIcon active={isActive} />
            <span className="text-[10px] font-medium tracking-wide">Calendar</span>
          </>
        )}
      </NavLink>

      {isAdmin && (
        <NavLink to="/staff" className={tabCls}>
          {({ isActive }) => (
            <>
              <StaffIcon active={isActive} />
              <span className="text-[10px] font-medium tracking-wide">Staff</span>
            </>
          )}
        </NavLink>
      )}

      <NavLink to="/profile" className={tabCls}>
        {({ isActive }) => (
          <>
            <ProfileIcon active={isActive} />
            <span className="text-[10px] font-medium tracking-wide">Profile</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}
