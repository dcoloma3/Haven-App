import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'
import CertInput from '../components/ui/CertInput'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function RoleBadge({ role }) {
  return role === 'admin'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E6F1FB] text-[#185FA5]">Manager</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Staff</span>
}

// ─── My Profile Card (shown at top for the logged-in user) ───────────────────

function MyProfileCard({ member, onEdit }) {
  const { profile, role } = member
  const name = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your Profile'

  return (
    <div className="bg-white border-2 border-[#185FA5] rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#E6F1FB] text-[#185FA5] font-bold text-lg flex items-center justify-center flex-shrink-0">
            {initials(name)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-base">{name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <RoleBadge role={role} />
              {profile?.position && (
                <span className="text-xs text-slate-500">{profile.position}</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-sm text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors flex-shrink-0"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {profile?.phone && (
          <InfoRow label="Phone" value={profile.phone} />
        )}
        {profile?.address && (
          <InfoRow label="Address" value={profile.address} />
        )}
        {profile?.date_of_birth && (
          <InfoRow label="Date of Birth" value={formatDate(profile.date_of_birth)} />
        )}
        {profile?.hire_date && (
          <InfoRow label="Hire Date" value={formatDate(profile.hire_date)} />
        )}
      </div>

      {/* Emergency Contact */}
      {profile?.emergency_contact_name && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <InfoRow label="Name" value={profile.emergency_contact_name} />
            {profile.emergency_contact_relationship && (
              <InfoRow label="Relationship" value={profile.emergency_contact_relationship} />
            )}
            {profile.emergency_contact_phone && (
              <InfoRow label="Phone" value={profile.emergency_contact_phone} />
            )}
          </div>
        </div>
      )}

      {profile?.certifications?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.certifications.map(c => (
            <span key={c} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{c}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  )
}

// ─── Staff list row (shown to all users for other staff members) ──────────────

function StaffListRow({ member, onClick }) {
  const { profile, role } = member
  const name = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        onClick ? 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center flex-shrink-0">
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <RoleBadge role={role} />
          {profile?.position && (
            <span className="text-xs text-slate-500">{profile.position}</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {profile?.phone && (
          <p className="text-sm text-slate-500">{profile.phone}</p>
        )}
        {onClick && (
          <svg className="w-4 h-4 text-slate-300 ml-auto mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </button>
  )
}

// ─── Full detail modal (manager-only for other staff) ────────────────────────

function StaffModal({ member, communityId, currentUserId, onClose, onSaved, onDeleted, onTransfer }) {
  const isEditing = !!member
  const profile = member?.profile ?? {}
  const memberId = member?.memberId

  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    first_name: profile.first_name ?? '',
    last_name: profile.last_name ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    position: profile.position ?? '',
    date_of_birth: profile.date_of_birth ?? '',
    hire_date: profile.hire_date ?? '',
    emergency_contact: profile.emergency_contact ?? '',
    emergency_contact_name: profile.emergency_contact_name ?? '',
    emergency_contact_relationship: profile.emergency_contact_relationship ?? '',
    emergency_contact_phone: profile.emergency_contact_phone ?? '',
    certifications: profile.certifications ?? [],
    role: member?.role ?? 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmTransfer, setConfirmTransfer] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    setSaving(true)
    setError('')
    const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ') || form.full_name

    if (profile.user_id) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          phone: form.phone || null,
          address: form.address || null,
          position: form.position || null,
          date_of_birth: form.date_of_birth || null,
          hire_date: form.hire_date || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_relationship: form.emergency_contact_relationship || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          certifications: form.certifications,
        })
        .eq('user_id', profile.user_id)
      if (profileErr) { setError(profileErr.message); setSaving(false); return }
    }

    if (memberId) {
      const { error: roleErr } = await supabase
        .from('community_members')
        .update({ role: form.role })
        .eq('id', memberId)
      if (roleErr) { setError(roleErr.message); setSaving(false); return }
    }

    setSaving(false)
    onSaved()
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await supabase.from('community_members').delete().eq('id', memberId)
    if (error) {
      console.error(error)
      setError(error.message || 'Something went wrong. Please try again.')
      setDeleting(false)
      return
    }
    onDeleted(memberId)
  }

  async function handleTransfer() {
    const { error: err1 } = await supabase
      .from('community_members').update({ role: 'admin' }).eq('id', memberId)
    if (err1) { setError('Transfer failed. Please try again.'); return }

    const { error: err2 } = await supabase
      .from('community_members').update({ role: 'staff' })
      .eq('community_id', communityId).eq('user_id', currentUserId)
    if (err2) { setError('Transfer partially failed. Please check roles manually.'); return }

    onTransfer()
    onClose()
  }

  const isCurrentUser = profile.user_id === currentUserId
  const isTheirAdmin = member?.role === 'admin'
  const displayName = [form.first_name, form.last_name].filter(Boolean).join(' ') || form.full_name || 'Staff Member'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{displayName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input className={inputCls} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input className={inputCls} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last" />
            </div>
          </div>

          {/* Role + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
              <input className={inputCls} value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. Caregiver" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, CA 90000" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
            <input type="date" className={inputCls} value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</p>
            <div className="space-y-3">
              <input className={inputCls} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Contact name" />
              <div className="grid grid-cols-2 gap-3">
                <select className={inputCls} value={form.emergency_contact_relationship} onChange={e => set('emergency_contact_relationship', e.target.value)}>
                  <option value="">— Relationship —</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="tel" className={inputCls} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} placeholder="Best phone" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Certifications</label>
            <CertInput value={form.certifications} onChange={certs => set('certifications', certs)} />
          </div>

          {/* Transfer Manager Role */}
          {isEditing && !isCurrentUser && !isTheirAdmin && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Transfer Manager Role</p>
              <p className="text-xs text-amber-700 mb-2">This will make {form.first_name || 'this person'} the manager and change your role to staff.</p>
              {!confirmTransfer ? (
                <button onClick={() => setConfirmTransfer(true)} className="text-xs font-medium text-amber-700 hover:text-amber-900 underline">
                  Transfer manager role
                </button>
              ) : (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-amber-800">Are you sure?</span>
                  <button onClick={handleTransfer} className="font-medium text-amber-900 hover:underline">Yes, transfer</button>
                  <button onClick={() => setConfirmTransfer(false)} className="text-amber-600 hover:underline">Cancel</button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {isEditing && !isCurrentUser && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-500 hover:text-red-700 transition-colors">
              Remove
            </button>
          )}
          {isEditing && confirmDelete && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Remove from community?</span>
              <button onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ communityId, currentUserId, inviterName, communityName, onClose, onInvited }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    // Remove any stale invite for this email first, then insert fresh
    await supabase
      .from('community_invites')
      .delete()
      .eq('community_id', communityId)
      .eq('email', normalizedEmail)
      .eq('accepted', false)

    const { error: inviteErr } = await supabase
      .from('community_invites')
      .insert([{
        community_id: communityId,
        email: normalizedEmail,
        role,
        invited_by: currentUserId,
      }])
    if (inviteErr) { setSaving(false); setError(inviteErr.message); return }

    // Send invite email
    try {
      await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
          communityName: communityName || 'your community',
          inviterName: inviterName || 'Your manager',
        }),
      })
    } catch (_err) { /* email failure is non-fatal — invite row already created */ }

    setSaving(false)
    setSuccess(true)
    onInvited()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Invite Staff Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-medium text-slate-800 mb-1">Invite sent!</p>
              <p className="text-sm text-slate-500">
                An email was sent to <strong>{email}</strong>. They'll join as <strong>{role === 'admin' ? 'Manager' : 'Staff'}</strong> when they create their account.
              </p>
              <button onClick={onClose} className="mt-5 bg-[#042C53] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#0B3D6E] transition-colors">Done</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Manager</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                We'll email them a personalized link. They'll automatically join your community when they sign up.
              </p>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleInvite} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                  {saving ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StaffDirectory() {
  const { communityId, community, isAdmin, reload: reloadCommunity } = useCommunity()
  const { profile: currentProfile } = useProfile()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState(null)
  const [pendingInvites, setPendingInvites] = useState([])
  const [resendingId, setResendingId] = useState(null)

  async function loadMembers() {
    if (!communityId) return
    // Step 1: get user_ids for this community
    const { data: cms } = await supabase
      .from('community_members')
      .select('id, role, user_id')
      .eq('community_id', communityId)
      .order('created_at')

    if (!cms?.length) { setMembers([]); setLoading(false); return }

    // Step 2: fetch profiles for those user_ids
    const userIds = cms.map(m => m.user_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds)

    const profileMap = {}
    ;(profiles ?? []).forEach(p => { profileMap[p.user_id] = p })

    setMembers(cms.map(m => ({
      memberId: m.id,
      role: m.role,
      userId: m.user_id,
      profile: profileMap[m.user_id] ?? null,
    })))
    setLoading(false)
  }

  async function loadPendingInvites() {
    if (!communityId || !isAdmin) return
    const { data } = await supabase
      .from('community_invites')
      .select('*')
      .eq('community_id', communityId)
      .eq('accepted', false)
      .order('created_at', { ascending: false })
    setPendingInvites(data ?? [])
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMembers()
    loadPendingInvites()
  }, [communityId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaved() { await loadMembers(); setEditing(null) }
  function handleDeleted(memberId) { setMembers(prev => prev.filter(m => m.memberId !== memberId)); setEditing(null) }
  async function handleTransfer() { await loadMembers(); await reloadCommunity() }

  async function handleRevoke(inviteId) {
    await supabase.from('community_invites').delete().eq('id', inviteId)
    setPendingInvites(prev => prev.filter(i => i.id !== inviteId))
  }

  async function handleResend(invite) {
    setResendingId(invite.id)
    try {
      await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: invite.email,
          role: invite.role,
          communityName: community?.name ?? 'your community',
          inviterName: currentProfile?.full_name ?? 'Your manager',
        }),
      })
    } finally {
      setResendingId(null)
    }
  }

  // Split into my card and the rest
  const [search, setSearch] = useState('')

  const myMember = members.find(m => m.userId === currentProfile?.user_id)
  const otherMembers = members
    .filter(m => m.userId !== currentProfile?.user_id)
    .filter(m => {
      if (!search.trim()) return true
      const name = (m.profile?.full_name || [m.profile?.first_name, m.profile?.last_name].filter(Boolean).join(' ') || '').toLowerCase()
      return name.includes(search.toLowerCase())
    })

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-slate-800">Staff</h1>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="bg-[#042C53] hover:bg-[#0B3D6E] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + Invite Staff
          </button>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && members.length > 1 && (
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
          />
        </div>
      )}

      {!loading && (
        <>
          {/* My Profile Card */}
          {myMember && (
            <MyProfileCard
              member={myMember}
              onEdit={() => setEditing(myMember)}
            />
          )}

          {/* Other Staff List */}
          {otherMembers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Team · {otherMembers.length} member{otherMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
              {otherMembers.map((m, i) => (
                <div key={m.memberId} className={i !== 0 ? 'border-t border-slate-100' : ''}>
                  <StaffListRow
                    member={m}
                    onClick={isAdmin ? () => setEditing(m) : undefined}
                  />
                </div>
              ))}
            </div>
          )}

          {members.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="font-medium text-slate-500">No staff members yet</p>
              {isAdmin && <p className="text-sm mt-1">Click "+ Invite Staff" to add someone.</p>}
            </div>
          )}

          {/* Pending Invites — admin only */}
          {isAdmin && pendingInvites.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-4">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Pending Invites · {pendingInvites.length}
                </p>
              </div>
              {pendingInvites.map((inv, i) => (
                <div key={inv.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium truncate">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <RoleBadge role={inv.role} />
                      <span className="text-xs text-slate-400">
                        Invited {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResend(inv)}
                      disabled={resendingId === inv.id}
                      className="text-xs font-medium text-[#185FA5] hover:text-[#0C447C] disabled:opacity-50 transition-colors"
                    >
                      {resendingId === inv.id ? 'Sending…' : 'Resend'}
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => handleRevoke(inv.id)}
                      className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showInvite && (
        <InviteModal
          communityId={communityId}
          currentUserId={currentProfile?.user_id}
          inviterName={currentProfile?.full_name ?? ''}
          communityName={community?.name ?? ''}
          onClose={() => setShowInvite(false)}
          onInvited={() => { loadMembers(); loadPendingInvites() }}
        />
      )}

      {editing && (
        <StaffModal
          member={editing}
          communityId={communityId}
          currentUserId={currentProfile?.user_id}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onTransfer={handleTransfer}
        />
      )}
    </Layout>
  )
}
