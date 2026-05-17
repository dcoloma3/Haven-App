/*
-- Run in Supabase SQL editor:
create table family_access (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  family_member_name text not null,
  email text,
  relationship text,
  access_token text unique not null default encode(gen_random_bytes(32), 'hex'),
  last_accessed_at timestamptz,
  is_active boolean not null default true
);
create index on family_access(resident_id);
create index on family_access(access_token);
alter table family_access enable row level security;
create policy "community admins can manage family access" on family_access
  for all using (community_id in (select community_id from community_members where user_id = auth.uid() and role = 'admin'));
-- Public read for token-based access (for the family portal page):
create policy "family can view by token" on family_access
  for select using (is_active = true);
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

export default function FamilyAccess({ residentId, resident }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  const [form, setForm] = useState({ family_member_name: '', relationship: '', email: '' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchMembers() {
    const { data } = await supabase
      .from('family_access')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [residentId]) // eslint-disable-line

  async function handleAdd() {
    if (!form.family_member_name.trim()) return
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    await supabase.from('family_access').insert({
      community_id: communityId,
      resident_id: residentId,
      created_by_name: authorName,
      family_member_name: form.family_member_name.trim(),
      relationship: form.relationship.trim() || null,
      email: form.email.trim() || null,
    })
    setSaving(false)
    setShowModal(false)
    setForm({ family_member_name: '', relationship: '', email: '' })
    await fetchMembers()
  }

  async function toggleActive(member) {
    await supabase.from('family_access').update({ is_active: !member.is_active }).eq('id', member.id)
    await fetchMembers()
  }

  function copyLink(token) {
    const link = `${window.location.origin}/family/${token}`
    navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!isAdmin) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
      <p className="text-slate-500 text-sm">Family access management is available to admins only.</p>
    </div>
  )

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Family Portal Access</h3>
        <button onClick={() => setShowModal(true)} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Family Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm font-medium">No family portal access configured</p>
          <p className="text-slate-400 text-xs mt-1">Add family members to share resident updates with them</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map(m => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{m.family_member_name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {m.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  {m.relationship && <p className="text-xs text-slate-500">{m.relationship}</p>}
                  {m.email && <p className="text-xs text-slate-500">{m.email}</p>}
                  {m.last_accessed_at && (
                    <p className="text-xs text-slate-400 mt-1">Last accessed {new Date(m.last_accessed_at).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {m.is_active && (
                    <button
                      onClick={() => copyLink(m.access_token)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied === m.access_token ? 'bg-emerald-100 text-emerald-700' : 'bg-[#E6F1FB] text-[#185FA5] hover:bg-blue-100'}`}
                    >
                      {copied === m.access_token ? 'Copied!' : 'Copy Link'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${m.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {m.is_active ? 'Revoke' : 'Re-enable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">Add Family Member</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                <input value={form.family_member_name} onChange={e => setForm(f => ({ ...f, family_member_name: e.target.value }))} className={inputCls} placeholder="Family member's full name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Relationship</label>
                <input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} className={inputCls} placeholder="e.g. Daughter, Son, Spouse" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="email@example.com" />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleAdd} disabled={!form.family_member_name.trim() || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Adding…' : 'Add & Generate Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
