import { NavLink } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

function ResidentsIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function DispenseIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="9" width="18" height="6" rx="3" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </svg>
  )
}

function CalendarIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function StaffIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function ScheduleIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function SettingsIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const linkCls = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[#E6F1FB] text-[#185FA5]'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
  }`

export default function Sidebar() {
  const { isAdmin } = useCommunity()

  return (
    <aside className="fixed left-0 top-[61px] bottom-0 w-52 bg-white border-r border-slate-200 z-20 flex flex-col overflow-y-auto">
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/dashboard" className={linkCls}>
          {({ isActive }) => (<><ResidentsIcon active={isActive} /><span>Residents</span></>)}
        </NavLink>

        <NavLink to="/dispense" className={linkCls}>
          {({ isActive }) => (<><DispenseIcon active={isActive} /><span>Dispense</span></>)}
        </NavLink>

        <NavLink to="/calendar" className={linkCls}>
          {({ isActive }) => (<><CalendarIcon active={isActive} /><span>Calendar</span></>)}
        </NavLink>

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Admin</p>
            </div>

            <NavLink to="/staff" className={linkCls}>
              {({ isActive }) => (<><StaffIcon active={isActive} /><span>Staff</span></>)}
            </NavLink>

            <NavLink to="/schedule" className={linkCls}>
              {({ isActive }) => (<><ScheduleIcon active={isActive} /><span>Schedule</span></>)}
            </NavLink>

            <NavLink to="/settings" className={linkCls}>
              {({ isActive }) => (<><SettingsIcon active={isActive} /><span>Settings</span></>)}
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  )
}
