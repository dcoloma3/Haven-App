import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useFacility } from '../../context/FacilityContext'
import { useProfile } from '../../context/ProfileContext'
import { useCommunity } from '../../context/CommunityContext'
import { useIsMobile } from '../../hooks/useIsMobile'
import HavenLogo from './HavenLogo'
import GlobalSearch from './GlobalSearch'

const navLinkCls = ({ isActive }) =>
  `text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`

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

function CreateCommunityModal({ onClose, onCreated }) {
  const { reload } = useCommunity()
  const [form, setForm] = useState({ name: '', address: '', phone: '', license_number: '', email: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Community name is required.'); return }
    setSaving(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const { data: community, error: err } = await supabase
      .from('communities')
      .insert([{ name: form.name.trim(), address: form.address || null, phone: form.phone || null, license_number: form.license_number || null, email: form.email || null, website: form.website || null }])
      .select().single()
    if (err) { setError(err.message); setSaving(false); return }
    await supabase.from('community_members').insert([{ community_id: community.id, user_id: session.user.id, role: 'admin' }])
    await reload()
    setSaving(false)
    onCreated(community.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">New Community</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Community Name <span className="text-red-500">*</span></label>
            <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sunrise Senior Living" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
            <input className={inputCls} value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="e.g. CA-123456" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, CA 90000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@facility.com" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Creating…' : 'Create Community'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommunityDropdown({ community, memberships, isAdmin, isSuperAdmin, onSwitch, onNew }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors max-w-[180px]"
      >
        <span className="truncate">{community?.name ?? 'Select Community'}</span>
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 w-56 sm:w-64 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Your Communities</p>
            </div>
            {memberships.map(m => (
              <button
                key={m.communities.id}
                onClick={() => { onSwitch(m.communities.id); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                  m.communities.id === community?.id ? 'bg-[#E6F1FB] text-[#185FA5]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{m.communities.name}</span>
                {m.communities.id === community?.id && (
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {isAdmin && !isSuperAdmin && (
              <>
                <div className="border-t border-slate-100" />
                <button
                  onClick={() => { onNew(); setOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-[#185FA5] hover:bg-slate-50 transition-colors font-medium"
                >
                  + New Community
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

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Account'
  const avatarInitials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 hover:opacity-90 transition-opacity">
        <div className="w-7 h-7 rounded-full bg-[#185FA5] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {avatarInitials}
        </div>
        <ChevronDown />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 w-48 sm:w-52 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isSuperAdmin ? 'bg-amber-100 text-amber-700' : isAdmin ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Manager' : 'Staff'}
              </span>
            </div>

            {isSuperAdmin && (
              <button
                onClick={() => { setOpen(false); navigate('/superadmin') }}
                className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors font-medium"
              >
                Super Admin Panel
              </button>
            )}

            <Link to="/profile" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              My Profile
            </Link>

            <a
              href="mailto:domcoloma@gmail.com?subject=Haven App Support"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
            >
              Contact Support
            </a>

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
  const { profile } = useProfile()
  const { isAdmin, isSuperAdmin, community, memberships, setCommunityId } = useCommunity()
  const [showNewCommunity, setShowNewCommunity] = useState(false)
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  function handleCreated(newId) {
    setCommunityId(newId)
    setShowNewCommunity(false)
    navigate('/dashboard')
  }

  return (
    <>
      <nav
        className="flex items-center gap-2 sticky top-0 z-30 border-b w-full"
        style={{
          backgroundColor: '#042C53',
          borderBottomColor: 'rgba(255,255,255,0.1)',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
          paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top))' : '12px',
          paddingBottom: '12px',
        }}
      >
        {/* Logo — slightly bigger */}
        <Link to="/dashboard" className="flex-shrink-0 hover:opacity-80 transition-opacity">
          <HavenLogo variant="white" markHeight={32} textSize={24} />
        </Link>

        {/* Desktop: search bar — absolutely centered */}
        {!isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-md px-4">
            <GlobalSearch />
          </div>
        )}

        {/* Desktop: community switcher + user menu only (nav moved to sidebar) */}
        {!isMobile && (
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <CommunityDropdown community={community} memberships={memberships} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onSwitch={setCommunityId} onNew={() => setShowNewCommunity(true)} />
            <div className="w-px h-4 bg-white/20" />
            <UserMenu profile={profile} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          </div>
        )}

        {/* Mobile: community + user on right */}
        {isMobile && (
          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            <CommunityDropdown community={community} memberships={memberships} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onSwitch={setCommunityId} onNew={() => setShowNewCommunity(true)} />
            <UserMenu profile={profile} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
          </div>
        )}
      </nav>

      {showNewCommunity && (
        <CreateCommunityModal
          onClose={() => setShowNewCommunity(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
