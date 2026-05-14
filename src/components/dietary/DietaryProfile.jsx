/*
-- Run in Supabase SQL editor:
create table dietary_profiles (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade unique,
  updated_at timestamptz default now(),
  texture_modification text default 'Regular',
  diet_type text default 'Regular',
  allergies text,
  preferences text,
  dislikes text,
  fluid_restriction text,
  supplement text,
  notes text
);
alter table dietary_profiles enable row level security;
create policy "community members can manage dietary profiles" on dietary_profiles
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'

const TEXTURES = ['Regular', 'Minced & Moist', 'Pureed', 'Mechanical Soft', 'Liquidized']
const DIET_TYPES = ['Regular', 'Diabetic', 'Low-Sodium', 'Low-Fat', 'Renal', 'Cardiac', 'Vegetarian', 'Vegan']

export default function DietaryProfile({ residentId, resident }) {
  const { communityId } = useCommunity()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    texture_modification: 'Regular',
    diet_type: 'Regular',
    allergies: '',
    preferences: '',
    dislikes: '',
    fluid_restriction: '',
    supplement: '',
    notes: '',
  })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchProfile() {
    const { data } = await supabase
      .from('dietary_profiles')
      .select('*')
      .eq('resident_id', residentId)
      .single()
    setProfile(data || null)
    if (data) {
      setForm({
        texture_modification: data.texture_modification || 'Regular',
        diet_type: data.diet_type || 'Regular',
        allergies: data.allergies || '',
        preferences: data.preferences || '',
        dislikes: data.dislikes || '',
        fluid_restriction: data.fluid_restriction || '',
        supplement: data.supplement || '',
        notes: data.notes || '',
      })
    }
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [residentId]) // eslint-disable-line

  async function handleSave() {
    setSaving(true)
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      texture_modification: form.texture_modification,
      diet_type: form.diet_type,
      allergies: form.allergies.trim() || null,
      preferences: form.preferences.trim() || null,
      dislikes: form.dislikes.trim() || null,
      fluid_restriction: form.fluid_restriction.trim() || null,
      supplement: form.supplement.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    if (profile) {
      const { data } = await supabase.from('dietary_profiles').update(payload).eq('id', profile.id).select().single()
      setProfile(data)
    } else {
      const { data } = await supabase.from('dietary_profiles').insert(payload).select().single()
      setProfile(data)
    }
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading dietary profile…</p>

  if (!profile && !editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 2l1.5 5h15L21 2" /><path d="M3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
            <line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm font-medium">No dietary profile set</p>
        <p className="text-slate-400 text-xs mt-1 mb-4">Set dietary needs, restrictions, and preferences</p>
        <button onClick={() => setEditing(true)} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
          Set Dietary Profile
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 text-sm">Edit Dietary Profile</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Texture Modification</label>
            <select value={form.texture_modification} onChange={e => setForm(f => ({ ...f, texture_modification: e.target.value }))} className={inputCls}>
              {TEXTURES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Diet Type</label>
            <select value={form.diet_type} onChange={e => setForm(f => ({ ...f, diet_type: e.target.value }))} className={inputCls}>
              {DIET_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Allergies</label>
          <input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} className={inputCls} placeholder="e.g. Peanuts, Shellfish" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Food Preferences</label>
          <textarea value={form.preferences} onChange={e => setForm(f => ({ ...f, preferences: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Likes and preferences…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Dislikes</label>
          <textarea value={form.dislikes} onChange={e => setForm(f => ({ ...f, dislikes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Foods to avoid…" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fluid Restriction</label>
            <input value={form.fluid_restriction} onChange={e => setForm(f => ({ ...f, fluid_restriction: e.target.value }))} className={inputCls} placeholder="e.g. 1500mL/day" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplement</label>
            <input value={form.supplement} onChange={e => setForm(f => ({ ...f, supplement: e.target.value }))} className={inputCls} placeholder="e.g. Ensure 2x daily" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Additional notes…" />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => setEditing(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Dietary Profile</h3>
        <button onClick={() => setEditing(true)} className="border border-slate-300 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors">Edit</button>
      </div>

      {profile.allergies && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">⚠ Allergies</p>
          <p className="text-sm text-red-700">{profile.allergies}</p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {[
          { label: 'Texture Modification', value: profile.texture_modification },
          { label: 'Diet Type', value: profile.diet_type },
          { label: 'Preferences', value: profile.preferences },
          { label: 'Dislikes', value: profile.dislikes },
          { label: 'Fluid Restriction', value: profile.fluid_restriction },
          { label: 'Supplement', value: profile.supplement },
          { label: 'Notes', value: profile.notes },
        ].map(({ label, value }) => value ? (
          <div key={label} className="flex gap-4 px-4 py-3">
            <span className="text-xs font-semibold text-slate-500 w-36 flex-shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-slate-700">{value}</span>
          </div>
        ) : null)}
      </div>

      {profile.updated_at && (
        <p className="text-xs text-slate-400">Last updated {new Date(profile.updated_at).toLocaleDateString()}</p>
      )}
    </div>
  )
}
