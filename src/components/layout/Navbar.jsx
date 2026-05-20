import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../context/ProfileContext'
import { useCommunity } from '../../context/CommunityContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import HavenLogo from './HavenLogo'
import GlobalSearch from './GlobalSearch'
import CreateCommunityModal from '../community/CreateCommunityModal'

function ChevronDown() {
  return (
    <svg className="w-3 h-3 flex-shrink-0 text-slate-400" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 8L1 3h10z" />
    </svg>
  )
}

function CommunityDropdown({ community, memberships, isAdmin, isSuperAdmin, onSwitch, onNew }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { setCommunityId } = useCommunity()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 hover:border-white/40 bg-white/10 text-sm font-medium text-white hover:text-white transition-colors min-w-0"
      >
        {/* Small navy square mark */}
        <span className="flex items-center justify-center w-5 h-5 rounded-[4px] bg-[#042C53] flex-shrink-0">
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        {isSuperAdmin && (
          <svg className="w-3 h-3 text-amber-500 flex-shrink-0 -ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )}
        <span className="truncate">{community?.name ?? 'Select community'}</span>
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 w-56 sm:w-64 overflow-hidden" style={{ boxShadow: 'var(--haven-shadow-md)' }}>
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Your communities</p>
            </div>
            {memberships.map(m => (
              <button
                key={m.communities.id}
                onClick={() => { onSwitch(m.communities.id); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  m.communities.id === community?.id
                    ? 'bg-[#E6F1FB] text-[#042C53] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{m.communities.name}</span>
                {m.communities.id === community?.id && (
                  <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {isAdmin && (
              <>
                <div className="border-t border-slate-100" />
                <button onClick={() => { onNew(); setOpen(false) }} className="w-full text-left px-4 py-2.5 text-sm text-[#185FA5] hover:bg-slate-50 transition-colors font-medium">
                  + New community
                </button>
              </>
            )}
            {isSuperAdmin && (
              <>
                <div className="border-t border-slate-100" />
                <button
                  onClick={() => { navigate('/superadmin'); setTimeout(() => setCommunityId(null), 50); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors font-medium flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Owner panel
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function UserMenu({ profile, isAdmin, isSuperAdmin }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { communityId, allCommunities, setCommunityId } = useCommunity()

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Account'
  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile?.email?.[0] ?? '?').toUpperCase()

  function switchCommunity(id) {
    setCommunityId(id)
    setOpen(false)
    navigate('/dashboard')
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-full bg-[#042C53] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {avatarInitials}
        </div>
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl border border-slate-200 w-56 sm:w-60 overflow-hidden" style={{ boxShadow: 'var(--haven-shadow-md)' }}>
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isSuperAdmin ? 'bg-amber-100 text-amber-700' : isAdmin ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {isSuperAdmin ? 'Owner' : isAdmin ? 'Manager' : 'Staff'}
              </span>
            </div>

            {isSuperAdmin && allCommunities?.length > 0 && (
              <>
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Switch community</p>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {allCommunities.map(c => (
                    <button key={c.id} onClick={() => switchCommunity(c.id)}
                      className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                        c.id === communityId ? 'bg-[#E6F1FB] text-[#042C53] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      {c.id === communityId && (
                        <svg className="w-3.5 h-3.5 flex-shrink-0 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100" />
              </>
            )}

            <Link to="/profile" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              My profile
            </Link>
            <a href="mailto:support@havencare.app?subject=Haven App Support" onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100">
              Contact support
            </a>
            <button onClick={() => { setOpen(false); supabase.auth.signOut() }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StaffViewToggle() {
  const { viewAsRole, setViewAsRole, isSuperAdmin, role } = useCommunity()
  // Only real admins/super admins can toggle this
  const canToggle = isSuperAdmin || role === 'admin'
  if (!canToggle) return null
  const isStaffView = viewAsRole === 'staff'
  return (
    <button
      onClick={() => setViewAsRole(isStaffView ? null : 'staff')}
      title={isStaffView ? 'Exit Staff View — back to your admin view' : 'Preview app as a staff member'}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        isStaffView
          ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700'
          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      {isStaffView ? 'Exit Staff View' : 'Staff View'}
    </button>
  )
}

export default function Navbar() {
  const { profile } = useProfile()
  const { isAdmin, isSuperAdmin, community, memberships, setCommunityId } = useCommunity()
  const [showNewCommunity, setShowNewCommunity] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  function handleCreated(newId) {
    setCommunityId(newId)
    setShowNewCommunity(false)
    navigate('/dashboard', { state: { newCommunity: true } })
  }

  return (
    <>
      <nav
        className="flex items-center gap-3 fixed top-0 left-0 right-0 z-30 bg-[#042C53] border-b border-white/10 w-full"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top))' : '0',
          paddingBottom: isMobile ? '12px' : '0',
          height: isMobile ? 'auto' : '61px',
          boxShadow: 'var(--haven-shadow-xs)',
        }}
      >
        {/* Logo — mark only on mobile to preserve space */}
        <Link to="/dashboard" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <HavenLogo variant="white" markHeight={28} textSize={isMobile ? 0 : 20} />
        </Link>

        {/* Desktop: search bar — absolutely centered */}
        {!isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-4">
            <GlobalSearch />
          </div>
        )}

        {/* Desktop: community dropdown + staff view toggle + user menu */}
        {!isMobile && (
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <CommunityDropdown community={community} memberships={memberships} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onSwitch={setCommunityId} onNew={() => setShowNewCommunity(true)} />
            <div className="w-px h-5 bg-white/20" />
            <StaffViewToggle />
            <div className="w-px h-5 bg-white/20" />
            <UserMenu profile={profile} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          </div>
        )}

        {/* Mobile: community name — centered flex-1 */}
        {isMobile && (
          <div className="flex-1 flex items-center justify-center min-w-0 px-2">
            <CommunityDropdown community={community} memberships={memberships} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onSwitch={setCommunityId} onNew={() => setShowNewCommunity(true)} />
          </div>
        )}

        {/* Mobile: right actions */}
        {isMobile && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMobileSearch(s => !s)}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/10 text-white/70 hover:text-white flex-shrink-0"
              aria-label="Search"
            >
              {showMobileSearch ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
            <UserMenu profile={profile} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          </div>
        )}

        {/* Mobile search overlay */}
        {isMobile && showMobileSearch && (
          <div className="absolute left-0 right-0 top-full z-50 px-3 py-2 bg-[#042C53] border-t border-b border-white/10" style={{ boxShadow: 'var(--haven-shadow-md)' }}>
            <GlobalSearch />
          </div>
        )}
      </nav>

      {showNewCommunity && (
        <CreateCommunityModal onClose={() => setShowNewCommunity(false)} onCreated={handleCreated} />
      )}
    </>
  )
}
