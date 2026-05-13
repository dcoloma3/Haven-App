import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useFacility } from '../../context/FacilityContext'
import { useProfile } from '../../context/ProfileContext'
import { useCommunity } from '../../context/CommunityContext'
import HavenLogo from './HavenLogo'
import GlobalSearch from './GlobalSearch'

const navLinkCls = ({ isActive }) =>
  `text-sm font-medium transition-colors ${
    isActive ? 'text-white' : 'text-white/70 hover:text-white'
  }`

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg className="w-3 h-3 flex-shrink-0 opacity-60" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 8L1 3h10z" />
    </svg>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-700 whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

function UserMenu({ profile, isAdmin, memberships, onSwitchCommunity }) {
  const [open, setOpen] = useState(false)

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Account'
  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 hover:opacity-90 transition-opacity"
      >
        <div className="w-7 h-7 rounded-full bg-[#185FA5] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {avatarInitials}
        </div>
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 w-52 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isAdmin ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {isAdmin ? 'Admin' : 'Staff'}
              </span>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              My Profile
            </Link>
            {memberships.length > 1 && (
              <button
                onClick={() => { setOpen(false); onSwitchCommunity() }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
              >
                Switch Community
              </button>
            )}
            <button
              onClick={() => { setOpen(false); supabase.auth.signOut() }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const { facility } = useFacility()
  const { profile } = useProfile()
  const { isAdmin, memberships, setCommunityId } = useCommunity()
  const [popoverOpen, setPopoverOpen] = useState(false)

  const displayName = facility?.facility_name || 'Our Facility'
  const hasDetails = facility?.license_number || facility?.address || facility?.phone_number

  return (
    <nav
      className="px-4 py-3 flex items-center gap-4 relative z-30 border-b"
      style={{ backgroundColor: '#042C53', borderBottomColor: 'rgba(255,255,255,0.1)' }}
    >
      {/* Logo — navigates home */}
      <Link to="/dashboard" className="flex-shrink-0 hover:opacity-80 transition-opacity">
        <HavenLogo variant="white" />
      </Link>

      {/* Global search — fills center space */}
      <div className="flex-1 max-w-lg">
        <GlobalSearch />
      </div>

      {/* Right-side nav + facility info + user menu */}
      <div className="flex items-center gap-4 flex-shrink-0 ml-auto">
        <NavLink to="/dashboard" className={navLinkCls}>Residents</NavLink>
        <NavLink to="/calendar" className={navLinkCls}>Calendar</NavLink>
        <NavLink to="/dispense" className={navLinkCls}>Dispense</NavLink>
        {isAdmin && <NavLink to="/staff" className={navLinkCls}>Staff</NavLink>}
        {isAdmin && <NavLink to="/schedule" className={navLinkCls}>Schedule</NavLink>}

        <div className="w-px h-4 bg-white/20" />

        {isAdmin && (
          <Link
            to="/settings"
            className="text-white/60 hover:text-white transition-colors"
            title="Facility Settings"
          >
            <SettingsIcon />
          </Link>
        )}

        {/* Facility popover */}
        <div className="relative">
          <button
            onClick={() => setPopoverOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors max-w-[180px]"
          >
            <span className="truncate">{displayName}</span>
            <ChevronDown />
          </button>

          {popoverOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPopoverOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-72">
                <p className="font-semibold text-slate-800 mb-3">{displayName}</p>
                {hasDetails ? (
                  <dl className="space-y-2.5">
                    <InfoRow label="License" value={facility?.license_number} />
                    <InfoRow label="Address" value={facility?.address} />
                    <InfoRow label="Phone" value={facility?.phone_number} />
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400">
                    No details on file.{' '}
                    <Link
                      to="/settings"
                      className="text-[#185FA5] hover:underline"
                      onClick={() => setPopoverOpen(false)}
                    >
                      Add them in Settings.
                    </Link>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <UserMenu
          profile={profile}
          isAdmin={isAdmin}
          memberships={memberships}
          onSwitchCommunity={() => setCommunityId(null)}
        />
      </div>
    </nav>
  )
}
