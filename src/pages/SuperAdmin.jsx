import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import HavenLogo from '../components/layout/HavenLogo'
import { localDateStr } from '../lib/dateUtils'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  )
}

// Fix 6 — Simplified Invite Admin modal with copy-to-clipboard message
function InviteAdminModal({ onClose }) {
  const [copied, setCopied] = useState(false)

  const message = `I'd like to invite you to try Haven, a senior living management platform.

Sign up at: ${window.location.origin}/signup

Once you create your account, you'll be guided through setting up your community.`

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Invite New Admin</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <p className="text-sm text-slate-500 mb-3">Share this message with your client to get them started:</p>

        <pre className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 whitespace-pre-wrap font-sans mb-4 leading-relaxed">
          {message}
        </pre>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">
            Close
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Invite Message'}
          </button>
        </div>
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
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6">
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
            <button onClick={handleAdd} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fix 3 — Plan badge helper
const PLAN_BADGE = {
  trial:      'bg-amber-100 text-amber-700',
  starter:    'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-emerald-100 text-emerald-700',
}

// Fix 4 — Delete Community Modal
function DeleteCommunityModal({ community, onClose, onDeleted, reloadAllCommunities }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirmText !== community.name) {
      setError('Community name does not match.')
      return
    }
    setDeleting(true)
    const { error: err } = await supabase
      .from('communities')
      .delete()
      .eq('id', community.id)
    setDeleting(false)
    if (err) { setError(err.message); return }
    onDeleted()
    reloadAllCommunities()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-red-700">Delete Community</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-red-700 font-medium mb-1">This action cannot be undone.</p>
          <p className="text-sm text-red-600">Deleting <strong>{community.name}</strong> will permanently remove all residents, medications, and staff records associated with this community.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type <strong>{community.name}</strong> to confirm
            </label>
            <input
              type="text"
              className={inputCls}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={community.name}
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={deleting || confirmText !== community.name}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete Community'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fix 3 & 4 — Updated CommunityRow with plan badge and delete link
function CommunityRow({ c, s, isMine, onEnter, onDelete }) {
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
          {/* Fix 3 — Plan badge on customer rows */}
          {!isMine && c.plan && PLAN_BADGE[c.plan] && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLAN_BADGE[c.plan]}`}>
              {c.plan}
            </span>
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
        {onDelete && (
          <button
            onClick={() => onDelete(c)}
            className="text-xs text-red-400 hover:text-red-600 mt-0.5 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Enter button */}
      <button
        onClick={() => onEnter(c.id)}
        className={`flex-shrink-0 text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
          isMine
            ? 'bg-amber-400 hover:bg-amber-500 text-[#042C53]'
            : 'bg-[#042C53] hover:bg-[#0B3D6E] text-white'
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

// ─── Trial Extension Modal ─────────────────────────────────────────────────────

function ExtendTrialModal({ community, onClose, onSaved }) {
  const [newDate, setNewDate] = useState(
    community.trial_end_date
      ? new Date(community.trial_end_date).toISOString().split('T')[0]
      : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!newDate) { setError('Please choose a date.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('communities')
      .update({ trial_end_date: new Date(newDate).toISOString() })
      .eq('id', community.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Extend Trial</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Set a new trial end date for <strong>{community.name}</strong>.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New trial end date</label>
            <input
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              min={localDateStr()}
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Convert to Active Modal ───────────────────────────────────────────────────

function ConvertPlanModal({ community, onClose, onSaved }) {
  const [plan, setPlan] = useState('starter')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    const { error: err } = await supabase
      .from('communities')
      .update({ plan, trial_end_date: null, trial_start_date: null })
      .eq('id', community.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved()
    onClose()
  }

  const plans = [
    { value: 'starter',    label: 'Starter',    desc: 'Up to 6 residents · $129/mo' },
    { value: 'pro',        label: 'Pro',         desc: 'Up to 18 residents · $249/mo' },
    { value: 'enterprise', label: 'Enterprise',  desc: 'Unlimited residents · $499+/mo' },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Convert to Active</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Select a plan for <strong>{community.name}</strong>. This unlocks the full app.</p>
        <div className="space-y-2 mb-4">
          {plans.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlan(p.value)}
              className={`w-full text-left border rounded-xl px-4 py-3 transition-all ${plan === p.value ? 'border-[#185FA5] bg-[#E6F1FB]' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className={`text-sm font-semibold ${plan === p.value ? 'text-[#185FA5]' : 'text-slate-800'}`}>{p.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Converting…' : 'Mark as Active'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Fix 5 — Revenue summary
const PLAN_PRICE = { starter: 129, pro: 249, enterprise: 499 }

function RevenueSummary({ communities }) {
  const counts = { trial: 0, starter: 0, pro: 0, enterprise: 0 }
  communities.forEach(c => { if (counts[c.plan] !== undefined) counts[c.plan]++ })

  const mrr = Object.entries(PLAN_PRICE).reduce((sum, [plan, price]) => sum + (counts[plan] ?? 0) * price, 0)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-6">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Plan Breakdown</p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-end">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-amber-600">{counts.trial}</span> on trial
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-blue-600">{counts.starter}</span> on starter
          <span className="text-slate-400 text-xs ml-1">($129/mo · ${counts.starter * 129} MRR)</span>
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-purple-600">{counts.pro}</span> on pro
          <span className="text-slate-400 text-xs ml-1">($249/mo · ${counts.pro * 249} MRR)</span>
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-emerald-600">{counts.enterprise}</span> on enterprise
          <span className="text-slate-400 text-xs ml-1">($499/mo · ${counts.enterprise * 499} MRR)</span>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Est. MRR</p>
          <p className="text-xl font-bold text-slate-800">${mrr.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit User Modal ───────────────────────────────────────────────────────── */

function EditUserModal({ user, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.first_name ?? '')
  const [lastName, setLastName]   = useState(user.last_name ?? '')
  const [phone, setPhone]         = useState(user.phone ?? '')
  const [position, setPosition]   = useState(user.position ?? '')
  const [roles, setRoles]         = useState(
    Object.fromEntries((user.memberships ?? []).map(m => [m.id, m.role]))
  )
  const [removing, setRemoving]   = useState({}) // membershipId → 'confirm' | 'removing'
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const originalRoles = Object.fromEntries((user.memberships ?? []).map(m => [m.id, m.role]))
      const changedRoles = Object.entries(roles)
        .filter(([id, role]) => originalRoles[id] !== role)
        .map(([id, role]) => ({ membershipId: id, role }))

      await Promise.all([
        supabase.from('profiles')
          .update({ first_name: firstName, last_name: lastName, phone, position,
                    full_name: [firstName, lastName].filter(Boolean).join(' ') || user.full_name })
          .eq('user_id', user.user_id),
        ...changedRoles.map(({ membershipId, role }) =>
          supabase.from('community_members').update({ role }).eq('id', membershipId)
        ),
      ])
      onSaved()
      onClose()
    } catch (e) {
      setError(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(membershipId, communityName) {
    if (removing[membershipId] === 'confirm') {
      setRemoving(r => ({ ...r, [membershipId]: 'removing' }))
      await supabase.from('community_members').delete().eq('id', membershipId)
      onSaved()
      onClose()
    } else {
      setRemoving(r => ({ ...r, [membershipId]: 'confirm' }))
    }
  }

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.full_name || user.email || 'User'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-800">Edit User</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {/* Profile fields */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
              <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
              <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Position / Title</label>
            <input className={inputCls} value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Lead Caregiver" />
          </div>
          <p className="text-xs text-slate-400 italic">Email and password changes must be done via the Supabase dashboard.</p>
        </div>

        {/* Community memberships */}
        {(user.memberships ?? []).length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Community Access</p>
            <div className="space-y-2">
              {user.memberships.map(m => (
                <div key={m.id} className="flex items-center gap-3 border border-slate-200 rounded-xl px-3 py-2.5">
                  <p className="text-sm text-slate-700 flex-1 min-w-0 truncate">{m.community?.name ?? '—'}</p>
                  <select
                    value={roles[m.id] ?? m.role}
                    onChange={e => setRoles(r => ({ ...r, [m.id]: e.target.value }))}
                    className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  {removing[m.id] === 'confirm' ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-red-600">Remove?</span>
                      <button onClick={() => handleRemove(m.id)} className="text-xs font-medium text-red-600 hover:text-red-800">Yes</button>
                      <button onClick={() => setRemoving(r => ({ ...r, [m.id]: undefined }))} className="text-xs text-slate-400 hover:text-slate-600">No</button>
                    </div>
                  ) : removing[m.id] === 'removing' ? (
                    <span className="text-xs text-slate-400">Removing…</span>
                  ) : (
                    <button onClick={() => handleRemove(m.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── User Row ──────────────────────────────────────────────────────────────── */

function UserRow({ user, onEdit }) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.full_name || '—'
  const initials = (
    (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
  ).toUpperCase() || (user.email?.[0] ?? '?').toUpperCase()

  const memberships = user.memberships ?? []
  const shown = memberships.slice(0, 3)
  const extra = memberships.length - shown.length

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold text-sm flex items-center justify-center flex-shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-800">{name}</p>
          {user.position && (
            <span className="text-xs text-slate-400">{user.position}</span>
          )}
        </div>
        <p className="text-xs text-slate-500">{user.email}</p>
        {memberships.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {shown.map(m => (
              <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                {m.community?.name ?? '—'} · {m.role}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">+{extra} more</span>
            )}
          </div>
        )}
      </div>

      {/* Edit */}
      <button
        onClick={() => onEdit(user)}
        className="flex-shrink-0 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
      >
        Edit
      </button>
    </div>
  )
}

/* ─── SuperAdmin Page ───────────────────────────────────────────────────────── */

export default function SuperAdmin() {
  const navigate = useNavigate()
  const { allCommunities, memberships, isSuperAdmin, setCommunityId, reloadAllCommunities } = useCommunity()
  const { profile } = useProfile()
  const [stats, setStats] = useState({})
  const [superAdmins, setSuperAdmins] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [showAddSA, setShowAddSA] = useState(false)
  const [search, setSearch] = useState('')
  const [extendTarget, setExtendTarget] = useState(null)
  const [convertTarget, setConvertTarget] = useState(null)
  // Fix 4 — delete community state
  const [deleteTarget, setDeleteTarget] = useState(null)
  // Users panel
  const [allUsers, setAllUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [editUser, setEditUser] = useState(null)

  // Communities the owner is personally a member of
  const myMembershipIds = new Set(memberships.map(m => m.communities?.id).filter(Boolean))

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/dashboard', { replace: true }); return }
    loadStats()
    loadSuperAdmins()
    loadAllUsers()
  }, [isSuperAdmin, allCommunities])

  async function loadAllUsers() {
    const { data: allMemberships } = await supabase
      .from('community_members')
      .select('id, community_id, user_id, role, created_at')

    const userIds = [...new Set((allMemberships ?? []).map(m => m.user_id))]
    if (!userIds.length) { setAllUsers([]); return }

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, first_name, last_name, email, phone, position, created_at')
      .in('user_id', userIds)

    const profileMap = {}
    ;(allProfiles ?? []).forEach(p => { profileMap[p.user_id] = p })

    const communityMap = {}
    allCommunities.forEach(c => { communityMap[c.id] = c })

    const byUser = {}
    ;(allMemberships ?? []).forEach(m => {
      if (!byUser[m.user_id]) byUser[m.user_id] = { ...(profileMap[m.user_id] ?? { user_id: m.user_id }), memberships: [] }
      byUser[m.user_id].memberships.push({ ...m, community: communityMap[m.community_id] })
    })

    // Sort by name
    const sorted = Object.values(byUser).sort((a, b) => {
      const na = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.full_name || a.email || ''
      const nb = [b.first_name, b.last_name].filter(Boolean).join(' ') || b.full_name || b.email || ''
      return na.localeCompare(nb)
    })
    setAllUsers(sorted)
  }

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
          {/* Fix 2 — Back to Dashboard button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/70 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInvite(true)}
            className="bg-[#042C53] hover:bg-[#0B3D6E] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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

        {/* Fix 5 — Revenue Summary */}
        <RevenueSummary communities={allCommunities} />

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
                <CommunityRow key={c.id} c={c} s={stats[c.id]} isMine onEnter={enterCommunity} onDelete={setDeleteTarget} />
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
                <CommunityRow
                  key={c.id}
                  c={c}
                  s={stats[c.id]}
                  isMine={false}
                  onEnter={enterCommunity}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </div>

        {/* Trials Dashboard */}
        {(() => {
          const trialCommunities = allCommunities.filter(c => c.plan === 'trial')
          const now = new Date()
          return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
                </svg>
                <h2 className="font-semibold text-slate-700 text-sm">Trials</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{trialCommunities.length} active trial{trialCommunities.length !== 1 ? 's' : ''}</span>
              </div>

              {trialCommunities.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-400">No communities on trial right now.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {trialCommunities.map(c => {
                    const trialEnd = c.trial_end_date ? new Date(c.trial_end_date) : null
                    const daysLeft = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : null
                    const isExpired = daysLeft !== null && daysLeft <= 0
                    const isUrgent  = !isExpired && daysLeft !== null && daysLeft <= 2
                    const isWarning = !isExpired && daysLeft !== null && daysLeft <= 5 && daysLeft > 2
                    const s = stats[c.id]
                    return (
                      <div key={c.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-slate-800">{c.name}</p>
                              {isExpired ? (
                                <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Expired</span>
                              ) : isUrgent ? (
                                <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">Ending in {daysLeft}d</span>
                              ) : isWarning ? (
                                <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Ending in {daysLeft}d</span>
                              ) : (
                                <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{daysLeft}d left</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                              <span className="text-xs text-slate-500">Manager: <span className="text-slate-700 font-medium">{s?.adminName ?? '—'}</span></span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-500"><span className="text-slate-700 font-medium">{s?.residentCount ?? 0}</span> resident{s?.residentCount !== 1 ? 's' : ''}</span>
                              {c.resident_count_at_signup && (
                                <>
                                  <span className="text-xs text-slate-400">·</span>
                                  <span className="text-xs text-slate-500">Reported: <span className="text-slate-700 font-medium">{c.resident_count_at_signup}</span></span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 mt-0.5">
                              {c.trial_start_date && (
                                <span className="text-xs text-slate-400">Started: {new Date(c.trial_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              )}
                              {trialEnd && (
                                <span className="text-xs text-slate-400">Ends: {trialEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setExtendTarget(c)}
                              className="text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Extend
                            </button>
                            <button
                              onClick={() => setConvertTarget(c)}
                              className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Mark Active
                            </button>
                            <button
                              onClick={() => enterCommunity(c.id)}
                              className="text-xs font-medium bg-[#042C53] hover:bg-[#0B3D6E] text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Enter
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Super admins */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
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
                {/* Fix 1 — use profile?.email instead of hardcoded email */}
                {sa.email !== profile?.email && (
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from('super_admins').delete().eq('id', sa.id)
                      if (!error) loadSuperAdmins()
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

        {/* All Users */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <h2 className="font-semibold text-slate-700 text-sm">All Users</h2>
            <span className="ml-auto text-xs text-slate-400 font-medium">{allUsers.length} user{allUsers.length !== 1 ? 's' : ''} across all communities</span>
          </div>

          {/* User search */}
          <div className="px-5 py-3 border-b border-slate-100">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent focus:bg-white"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          {allUsers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No users found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {allUsers
                .filter(u => {
                  if (!userSearch) return true
                  const q = userSearch.toLowerCase()
                  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase() || (u.full_name ?? '').toLowerCase()
                  return name.includes(q) || (u.email ?? '').toLowerCase().includes(q)
                })
                .map(u => (
                  <UserRow key={u.user_id} user={u} onEdit={setEditUser} />
                ))}
            </div>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteAdminModal
          onClose={() => setShowInvite(false)}
        />
      )}

      {showAddSA && (
        <AddSuperAdminModal
          onClose={() => setShowAddSA(false)}
          onAdded={loadSuperAdmins}
        />
      )}

      {extendTarget && (
        <ExtendTrialModal
          community={extendTarget}
          onClose={() => setExtendTarget(null)}
          onSaved={reloadAllCommunities}
        />
      )}

      {convertTarget && (
        <ConvertPlanModal
          community={convertTarget}
          onClose={() => setConvertTarget(null)}
          onSaved={reloadAllCommunities}
        />
      )}

      {/* Fix 4 — Delete Community Modal */}
      {deleteTarget && (
        <DeleteCommunityModal
          community={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => setDeleteTarget(null)}
          reloadAllCommunities={reloadAllCommunities}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); loadAllUsers() }}
        />
      )}
    </div>
  )
}
