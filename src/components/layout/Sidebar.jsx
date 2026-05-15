import { NavLink } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

/* ─── Icons ─────────────────────────────────────────────────────────────── */

function Icon({ d, circle, polyline, rect, lines = [], paths = [], active, ...svgProps }) {
  return (
    <svg
      className="w-5 h-5 flex-shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...svgProps}
    >
      {paths.map((p, i) => <path key={i} d={p} />)}
      {d && <path d={d} />}
      {circle && <circle {...circle} />}
      {polyline && <polyline points={polyline} />}
      {rect && <rect {...rect} />}
      {lines.map((l, i) => <line key={i} {...l} />)}
    </svg>
  )
}

function ResidentsIcon({ active }) {
  return <Icon active={active}
    paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]}
    circle={{ cx: 9, cy: 7, r: 4 }} />
}
function DispenseIcon({ active }) {
  return <Icon active={active}
    paths={[]} rect={{ x: 3, y: 9, width: 18, height: 6, rx: 3 }}
    lines={[{ x1: 12, y1: 9, x2: 12, y2: 15 }]} />
}
function CalendarIcon({ active }) {
  return <Icon active={active}
    rect={{ x: 3, y: 4, width: 18, height: 18, rx: 2 }}
    lines={[{ x1: 16, y1: 2, x2: 16, y2: 6 }, { x1: 8, y1: 2, x2: 8, y2: 6 }, { x1: 3, y1: 10, x2: 21, y2: 10 }]} />
}
function StaffIcon({ active }) {
  return <Icon active={active}
    paths={["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2","M23 21v-2a4 4 0 0 0-3-3.87","M16 3.13a4 4 0 0 1 0 7.75"]}
    circle={{ cx: 9, cy: 7, r: 4 }} />
}
function ScheduleIcon({ active }) {
  return <Icon active={active}
    rect={{ x: 3, y: 4, width: 18, height: 18, rx: 2 }}
    lines={[{ x1: 3, y1: 10, x2: 21, y2: 10 }, { x1: 8, y1: 2, x2: 8, y2: 6 }, { x1: 16, y1: 2, x2: 16, y2: 6 }, { x1: 8, y1: 14, x2: 8, y2: 14, strokeWidth: 2.5 }, { x1: 12, y1: 14, x2: 12, y2: 14, strokeWidth: 2.5 }, { x1: 16, y1: 14, x2: 16, y2: 14, strokeWidth: 2.5 }, { x1: 8, y1: 18, x2: 8, y2: 18, strokeWidth: 2.5 }, { x1: 12, y1: 18, x2: 12, y2: 18, strokeWidth: 2.5 }]} />
}
function IncidentsIcon({ active }) {
  return <Icon active={active}
    paths={["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"]}
    lines={[{ x1: 12, y1: 9, x2: 12, y2: 13 }, { x1: 12, y1: 17, x2: 12.01, y2: 17 }]} />
}
function SettingsIcon({ active }) {
  return <Icon active={active}
    circle={{ cx: 12, cy: 12, r: 3 }}
    paths={["M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"]} />
}
function VitalsIcon({ active }) {
  return <Icon active={active} polyline="22 12 18 12 15 21 9 3 6 12 2 12" />
}
function ShiftLogIcon({ active }) {
  return <Icon active={active} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
}
function MaintenanceIcon({ active }) {
  return <Icon active={active} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
}
function TransportIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}
function ActivitiesIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l3 3" />
    </svg>
  )
}
function BillingIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}
function OccupancyIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function CertIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}
function NotifIcon({ active }) {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/* ─── Nav Item ───────────────────────────────────────────────────────────── */

function NavItem({ to, label, icon: IconComponent, collapsed }) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-[#E6F1FB] text-[#042C53] font-semibold'
            : 'text-slate-600 hover:bg-[#F3F8FD] hover:text-slate-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconComponent active={isActive} />
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

/* ─── Sidebar ────────────────────────────────────────────────────────────── */

export default function Sidebar({ collapsed, onToggle }) {
  const { isAdmin } = useCommunity()

  return (
    <aside
      className="fixed left-0 top-[61px] bottom-0 bg-white border-r border-slate-200 z-20 flex flex-col overflow-hidden transition-all duration-200"
      style={{ width: collapsed ? '56px' : '208px' }}
    >
      {/* Collapse toggle */}
      <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} px-2 pt-3 pb-1`}>
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 pb-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <NavItem to="/dashboard"    label="Residents"   icon={ResidentsIcon}  collapsed={collapsed} />
        <NavItem to="/dispense"     label="Dispense"    icon={DispenseIcon}   collapsed={collapsed} />
        {isAdmin && (
          <NavItem to="/calendar"   label="Calendar"    icon={CalendarIcon}   collapsed={collapsed} />
        )}
        <NavItem to="/incidents"    label="Incidents"   icon={IncidentsIcon}  collapsed={collapsed} />
        <NavItem to="/vitals"       label="Vitals"      icon={VitalsIcon}     collapsed={collapsed} />
        <NavItem to="/shift-log"    label="Shift Log"   icon={ShiftLogIcon}   collapsed={collapsed} />
        <NavItem to="/maintenance"  label="Maintenance" icon={MaintenanceIcon} collapsed={collapsed} />
        <NavItem to="/transportation" label="Transport" icon={TransportIcon}  collapsed={collapsed} />
        <NavItem to="/activities"   label="Activities"  icon={ActivitiesIcon} collapsed={collapsed} />

        {isAdmin && (
          <NavItem to="/staff"      label="Staff"       icon={StaffIcon}      collapsed={collapsed} />
        )}

        {/* Manager section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Manager</p>
              </div>
            )}
            {collapsed && <div className="pt-3 pb-1 mx-2 border-t border-slate-100" />}

            <NavItem to="/schedule"      label="Schedule"     icon={ScheduleIcon}  collapsed={collapsed} />
            <NavItem to="/billing"       label="Billing"      icon={BillingIcon}   collapsed={collapsed} />
            <NavItem to="/occupancy"     label="Prospects"    icon={OccupancyIcon} collapsed={collapsed} />
            <NavItem to="/certifications" label="Certs"       icon={CertIcon}      collapsed={collapsed} />
            <NavItem to="/notifications" label="Notifications" icon={NotifIcon}    collapsed={collapsed} />
            <NavItem to="/settings"      label="Settings"     icon={SettingsIcon}  collapsed={collapsed} />
          </>
        )}
      </nav>
    </aside>
  )
}
