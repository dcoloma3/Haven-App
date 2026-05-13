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

export default function SuperAdmin() {
  const navigate = useNavigate()
  const { allCommunities, isSuperAdmin, setCommunityId, reloadAllCommunities } = useCommunity()
  const { profile } = useProfile()
  const [stats, setStats] = useState({}) // communityId → { residentCount, adminName }
  const [superAdmins, setSuperAdmins] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [showAddSA, setShowAddSA] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return }
    loadStats()
    loadSuperAdmins()
  }, [isSuperAdmin, allCommunities])

  async function loadStats() {
    if (!allCommunities.length) return
    const ids = allCommunities.map(c => c.id)

    // Resident counts
    const { data: residents } = await supabase
      .from('residents')
      .select('community_id')
      .in('community_id', ids)

    // Admin names per community
    const { data: members } = await supabase
      .from('community_members')
      .select('community_id, role, profiles!user_id(full_name, email)')
      .in('community_id', ids)
      .eq('role', 'admin')

    const newStats = {}
    ids.forEach(id => {
      const count = (residents ?? []).filter(r => r.community_id === id).length
      const admin = (members ?? []).find(m => m.community_id === id)
      const adminProfile = admin?.profiles
      newStats[id] = {
        residentCount: count,
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

  const filtered = allCommunities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (stats[c.id]?.adminName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div style={{ backgroundColor: '#042C53' }} className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <HavenLogo variant="white" />
          <div className="w-px h-5 bg-white/20" />
          <span className="bg-amber-400 text-[#042C53] text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            Super Admin
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Communities" value={allCommunities.length} />
          <StatCard label="Total Residents" value={Object.values(stats).reduce((s, v) => s + v.residentCount, 0)} />
          <StatCard label="Super Admins" value={superAdmins.length} />
        </div>

        {/* Communities */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">All Communities</h2>
            <input
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent w-48"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">No communities yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Manager: {stats[c.id]?.adminName ?? '—'} · {stats[c.id]?.residentCount ?? 0} resident{stats[c.id]?.residentCount !== 1 ? 's' : ''}
                      {c.address ? ` · ${c.address}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => enterCommunity(c.id)}
                    className="flex-shrink-0 text-sm bg-[#185FA5] hover:bg-[#0C447C] text-white font-medium px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Enter →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Super admins */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Super Admins</h2>
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
