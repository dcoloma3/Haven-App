import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'
import CertInput from '../components/ui/CertInput'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function RoleBadge({ role }) {
  return role === 'admin'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E6F1FB] text-[#185FA5]">Admin</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Staff</span>
}

function StaffCard({ member, onClick }) {
  const { profile, role } = member
  return (
    <button
      onClick={() => onClick(member)}
      className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-[#378ADD] transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center flex-shrink-0">
          {initials(profile?.full_name)}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{profile?.full_name || <span className="italic text-slate-400">No name set</span>}</p>
          <div className="mt-0.5">
            <RoleBadge role={role} />
          </div>
        </div>
      </div>
      {profile?.phone && <p className="text-xs text-slate-500 mb-1.5">{profile.phone}</p>}
      {profile?.hire_date && <p className="text-xs text-slate-400 mb-1.5">Hired {formatDate(profile.hire_date)}</p>}
      {profile?.certifications?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {profile.certifications.slice(0, 3).map(c => (
            <span key={c} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{c}</span>
          ))}
          {profile.certifications.length > 3 && (
            <span className="text-xs text-slate-400">+{profile.certifications.length - 3} more</span>
          )}
        </div>
      )}
    </button>
  )
}

function StaffModal({ member, communityId, currentUserId, onClose, onSaved, onDeleted, onTransfer }) {
  const isEditing = !!member
  const profile = member?.profile ?? {}
  const memberId = member?.memberId

  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    emergency_contact: profile.emergency_contact ?? '',
    hire_date: profile.hire_date ?? '',
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

    // Update profile info
    if (profile.user_id) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name || null,
          phone: form.phone || null,
          emergency_contact: form.emergency_contact || null,
          hire_date: form.hire_date || null,
          certifications: form.certifications,
        })
        .eq('user_id', profile.user_id)
      if (profileErr) { setError(profileErr.message); setSaving(false); return }
    }

    // Update role in community_members
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
    await supabase.from('community_members').delete().eq('id', memberId)
    onDeleted(memberId)
  }

  async function handleTransfer() {
    // Transfer admin role: make this person admin, demote current admin to staff
    await supabase
      .from('community_members')
      .update({ role: 'admin' })
      .eq('id', memberId)
    // Demote current user to staff
    await supabase
      .from('community_members')
      .update({ role: 'staff' })
      .eq('community_id', communityId)
      .eq('user_id', currentUserId)
    onTransfer()
    onClose()
  }

  const isCurrentUser = profile.user_id === currentUserId
  const isTheirAdmin = member?.role === 'admin'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            {isEditing ? 'Edit Staff Member' : 'Staff Member'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Doe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
              <input type="date" className={inputCls} value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input className={inputCls} value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Name · phone" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Certifications</label>
            <CertInput value={form.certifications} onChange={certs => set('certifications', certs)} />
          </div>

          {/* Admin transfer */}
          {isEditing && !isCurrentUser && !isTheirAdmin && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Transfer Admin Role</p>
              <p className="text-xs text-amber-700 mb-2">This will make {form.full_name || 'this person'} the admin and change your role to staff.</p>
              {!confirmTransfer ? (
                <button onClick={() => setConfirmTransfer(true)} className="text-xs font-medium text-amber-700 hover:text-amber-900 underline">
                  Transfer admin role
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
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
            <button onClick={handleSave} disabled={saving} className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InviteModal({ communityId, currentUserId, onClose, onInvited }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    setError('')

    // Check if already a member
    const { data: existing } = await supabase
      .from('community_invites')
      .select('id')
      .eq('community_id', communityId)
      .eq('email', email.trim())
      .eq('accepted', false)
      .maybeSingle()

    if (existing) {
      setError('An invite for this email already exists.')
      setSaving(false)
      return
    }

    const { error: inviteErr } = await supabase
      .from('community_invites')
      .insert([{
        community_id: communityId,
        email: email.trim().toLowerCase(),
        role,
        invited_by: currentUserId,
      }])

    setSaving(false)
    if (inviteErr) { setError(inviteErr.message); return }
    setSuccess(true)
    onInvited()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
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
              <p className="font-medium text-slate-800 mb-1">Invite created!</p>
              <p className="text-sm text-slate-500">
                Share the app link with <strong>{email}</strong>. When they sign up with this email, they'll automatically be added to your community as <strong>{role}</strong>.
              </p>
              <button onClick={onClose} className="mt-4 bg-[#185FA5] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#0C447C] transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select className={inputCls} value={role} onChange={e => setRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                Share the app link with this person. When they sign up using this email address, they'll automatically join your community.
              </p>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleInvite} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                  {saving ? 'Creating…' : 'Create Invite'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StaffDirectory() {
  const { communityId, reload: reloadCommunity } = useCommunity()
  const { profile: currentProfile } = useProfile()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState(null)

  async function loadMembers() {
    if (!communityId) return
    const { data } = await supabase
      .from('community_members')
      .select('id, role, user_id, profiles!user_id(*)')
      .eq('community_id', communityId)
      .order('created_at')
    setMembers((data ?? []).map(m => ({
      memberId: m.id,
      role: m.role,
      userId: m.user_id,
      profile: m.profiles,
    })))
    setLoading(false)
  }

  useEffect(() => { loadMembers() }, [communityId])

  async function handleSaved() {
    await loadMembers()
    setEditing(null)
  }

  function handleDeleted(memberId) {
    setMembers(prev => prev.filter(m => m.memberId !== memberId))
    setEditing(null)
  }

  async function handleTransfer() {
    await loadMembers()
    await reloadCommunity()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Staff</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Invite Staff
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && members.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No staff members yet</p>
          <p className="text-sm mt-1">Click "Invite Staff" to add someone.</p>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map(m => (
            <StaffCard key={m.memberId} member={m} onClick={setEditing} />
          ))}
        </div>
      )}

      {showInvite && (
        <InviteModal
          communityId={communityId}
          currentUserId={currentProfile?.user_id}
          onClose={() => setShowInvite(false)}
          onInvited={loadMembers}
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
