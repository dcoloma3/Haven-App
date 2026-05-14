import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import HavenLogo from '../components/layout/HavenLogo'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function InviteAdminModal({ currentUserId, onClose }) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('admin_invites')
      .upsert([{ email: email.trim().toLowerCase(), invited_by: currentUserId }], { onConflict: 'email' })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Invite New Admin</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="font-medium text-slate-800 mb-1">Invite created!</p>
            <p className="text-sm text-slate-500 mb-1">Share the app link with <strong>{email}</strong>.</p>
            <p className="text-sm text-slate-500 mb-4">When they sign up, they'll go through admin onboarding and set up their community.</p>
            <p className="text-xs bg-slate-100 rounded-lg px-3 py-2 text-slate-600 font-mono break-all">{window.location.origin}</p>
            <button onClick={onClose} className="mt-4 bg-[#185FA5] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#0C447C] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email Address</label>
              <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="client@example.com" />
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              Share the app URL with this person. When they sign up using this email, they'll be guided through creating their community as an admin.
            </p>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleInvite} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Creating…' : 'Create Invite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AddSuperAdminModal({ onClose, onAdded }) {
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('super_admins')
      .insert([{ email: email.trim().toLowerCase() }])
    setSaving(false)
    if (err) { setError(err.message); return }
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Add Super Admin</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommunityRow({ c, s, isMine, onEnter }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${isMine ? 'bg-amber-50/40' : ''}`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-amber-100' : 'bg-[#E6F1FB]'}`}>
        {isMine ? (
          <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800">{c.name}</p>
          {isMine && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">My Community</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          {!isMine && (
            <span className="text-xs text-slate-500">Manager: <span className="text-slate-700 font-medium">{s?.adminName ?? '—'}</span></span>
          )}
          {!isMine && <span className="text-xs text-slate-400">·</span>}
          <span className="text-xs text-slate-500"><span className="text-slate-700 font-medium">{s?.residentCount ?? 0}</span> resident{s?.residentCount !== 1 ? 's' : ''}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500"><span className="text-slate-700 font-medium">{s?.staffCount ?? 0}</span> staff</span>
          {c.license_number && (
            <>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">Lic: {c.license_number}</span>
            </>
          )}
        </div>
        {c.address && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.address}</p>}
      </div>

      {/* Enter button */}
      <button
        onClick={() => onEnter(c.id)}
        className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
          isMine
            ? 'bg-amber-400 hover:bg-amber-500 text-[#042C53]'
            : 'bg-[#185FA5] hover:bg-[#0C447C] text-white'
        }`}
      >
        Enter
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}

export default function SuperAdmin() {
  const navigate = useNavigate()
  const { allCommunities, memberships, isSuperAdmin, setCommunityId, reloadAllCommunities } = useCommunity()
  const { profile } = useProfile()
  const [stats, setStats] = useState({})
  const [superAdmins, setSuperAdmins] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [showAddSA, setShowAddSA] = useState(false)
  const [search, setSearch] = useState('')

  // Communities the owner is personally a member of
  const myMembershipIds = new Set(memberships.map(m => m.communities?.id).filter(Boolean))

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return }
    loadStats()
    loadSuperAdmins()
  }, [isSuperAdmin, allCommunities])

  async function loadStats() {
    if (!allCommunities.length) return
    const ids = allCommunities.map(c => c.id)

    const [{ data: residents }, { data: members }, { data: profiles }] = await Promise.all([
      supabase.from('residents').select('community_id').in('community_id', ids).eq('status', 'active'),
      supabase.from('community_members').select('community_id, role, user_id').in('community_id', ids),
      supabase.from('profiles').select('user_id, full_name, email'),
    ])

    const profileMap = {}
    ;(profiles ?? []).forEach(p => { profileMap[p.user_id] = p })

    const newStats = {}
    ids.forEach(id => {
      const residentCount = (residents ?? []).filter(r => r.community_id === id).length
      const communityMembers = (members ?? []).filter(m => m.community_id === id)
      const adminMember = communityMembers.find(m => m.role === 'admin')
      const adminProfile = adminMember ? profileMap[adminMember.user_id] : null
      const staffCount = communityMembers.length
      newStats[id] = {
        residentCount,
        staffCount,
        adminName: adminProfile?.full_name || adminProfile?.email || '—',
      }
    })
    setStats(newStats)
  }

  async function loadSuperAdmins() {
    const { data } = await supabase.from('super_admins').select('*').order('created_at')
    setSuperAdmins(data ?? [])
  }

  function enterCommunity(id) {
    setCommunityId(id)
    navigate('/dashboard')
  }

  const searchLower = search.toLowerCase()
  const filteredAll = allCommunities.filter(c =>
    c.name.toLowerCase().includes(searchLower) ||
    (stats[c.id]?.adminName ?? '').toLowerCase().includes(searchLower)
  )

  const myCommunities = filteredAll.filter(c => myMembershipIds.has(c.id))
  const customerCommunities = filteredAll.filter(c => !myMembershipIds.has(c.id))

  const totalResidents = Object.values(stats).reduce((s, v) => s + v.residentCount, 0)

  return (
    <div className="min-h-screen bg-slate-50 pb-8 animate-page-in">
      {/* Header */}
      <div style={{ backgroundColor: '#042C53' }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HavenLogo variant="white" />
          <div className="w-px h-5 bg-white/20" />
          <span className="bg-amber-400 text-[#042C53] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Owner Panel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvite(true)}
            className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Invite Admin
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="My Communities" value={myMembershipIds.size} />
          <StatCard label="Customer Communities" value={allCommunities.length - myMembershipIds.size} />
          <StatCard label="Total Residents" value={totalResidents} />
          <StatCard label="Owner Accounts" value={superAdmins.length} />
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            placeholder="Search communities or manager name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* My Communities */}
        {myCommunities.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-100 bg-amber-50">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <h2 className="font-semibold text-amber-800 text-sm">My Communities</h2>
              <span className="ml-auto text-xs text-amber-600 font-medium">{myCommunities.length} communit{myCommunities.length !== 1 ? 'ies' : 'y'} you own &amp; manage</span>
            </div>
            <div className="divide-y divide-amber-100/60">
              {myCommunities.map(c => (
                <CommunityRow key={c.id} c={c} s={stats[c.id]} isMine onEnter={enterCommunity} />
              ))}
            </div>
          </div>
        )}

        {/* Customer Communities */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h2 className="font-semibold text-slate-700 text-sm">Customer Communities</h2>
            <span className="ml-auto text-xs text-slate-400 font-medium">{customerCommunities.length} communit{customerCommunities.length !== 1 ? 'ies' : 'y'} signed up</span>
          </div>

          {customerCommunities.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No customer communities yet.</p>
              <p className="text-xs text-slate-400 mt-1">Use <strong>Invite Admin</strong> to onboard your first client.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customerCommunities.map(c => (
                <CommunityRow key={c.id} c={c} s={stats[c.id]} isMine={false} onEnter={enterCommunity} />
              ))}
            </div>
          )}
        </div>

        {/* Super admins */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Owner Accounts</h2>
            <button
              onClick={() => setShowAddSA(true)}
              className="text-sm text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors"
            >
              + Add
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {superAdmins.map(sa => (
              <div key={sa.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm text-slate-700">{sa.email}</p>
                {sa.email !== 'domcoloma@gmail.com' && (
                  <button
                    onClick={async () => {
                      await supabase.from('super_admins').delete().eq('id', sa.id)
                      loadSuperAdmins()
                    }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showInvite && (
        <InviteAdminModal
          currentUserId={profile?.user_id}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showAddSA && (
        <AddSuperAdminModal
          onClose={() => setShowAddSA(false)}
          onAdded={loadSuperAdmins}
        />
      )}
    </div>
  )
}
