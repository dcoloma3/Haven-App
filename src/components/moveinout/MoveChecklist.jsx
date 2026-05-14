/*
-- Run in Supabase SQL editor:
create table move_checklists (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  type text not null,
  created_at timestamptz default now(),
  completed_at timestamptz,
  created_by_name text,
  items jsonb not null default '[]'
);
create index on move_checklists(resident_id, type);
alter table move_checklists enable row level security;
create policy "community members can manage checklists" on move_checklists
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const DEFAULT_MOVEIN_ITEMS = [
  'Welcome packet given',
  'Room inspected & documented',
  'Keys/access provided',
  'Medications reviewed with physician orders',
  'Emergency contacts collected',
  'Insurance & financial documents verified',
  'Resident photo taken',
  'Care plan initiated',
  'Family portal access set up',
  'Financial agreement signed',
]

const DEFAULT_MOVEOUT_ITEMS = [
  'Room inspected & documented',
  'Keys returned',
  'Medications disposed or returned to pharmacy',
  'Final billing generated',
  'Records prepared for archive',
  'Family notified of departure',
  'Forwarding address collected',
  'Discharge summary completed',
  'Personal belongings confirmed removed',
  'Room cleared for next resident',
]

export default function MoveChecklist({ residentId, resident }) {
  const { communityId } = useCommunity()
  const { profile } = useProfile()
  const [activeType, setActiveType] = useState('move-in')
  const [checklists, setChecklists] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [marking, setMarking] = useState(false)

  async function fetchChecklists() {
    const { data } = await supabase
      .from('move_checklists')
      .select('*')
      .eq('resident_id', residentId)
    const map = {}
    for (const c of (data || [])) map[c.type] = c
    setChecklists(map)
    setLoading(false)
  }

  useEffect(() => { fetchChecklists() }, [residentId]) // eslint-disable-line

  async function startChecklist(type) {
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const defaults = type === 'move-in' ? DEFAULT_MOVEIN_ITEMS : DEFAULT_MOVEOUT_ITEMS
    const items = defaults.map(label => ({ label, checked: false, checked_by: null, checked_at: null }))
    const { data, error } = await supabase.from('move_checklists').insert({
      community_id: communityId,
      resident_id: residentId,
      type,
      created_by_name: authorName,
      items,
    }).select().single()
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setChecklists(c => ({ ...c, [type]: data }))
    setSaving(false)
  }

  async function toggleItem(checklist, index) {
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const items = [...checklist.items]
    const item = { ...items[index] }
    item.checked = !item.checked
    item.checked_by = item.checked ? authorName : null
    item.checked_at = item.checked ? new Date().toISOString() : null
    items[index] = item
    const { data, error } = await supabase.from('move_checklists').update({ items }).eq('id', checklist.id).select().single()
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      return
    }
    setChecklists(c => ({ ...c, [checklist.type]: data }))
  }

  async function markComplete(checklist) {
    setMarking(true)
    const { data, error } = await supabase.from('move_checklists').update({ completed_at: new Date().toISOString() }).eq('id', checklist.id).select().single()
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setMarking(false)
      return
    }
    setChecklists(c => ({ ...c, [checklist.type]: data }))
    setMarking(false)
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading checklists…</p>

  const checklist = checklists[activeType]
  const completedCount = checklist ? checklist.items.filter(i => i.checked).length : 0
  const totalCount = checklist ? checklist.items.length : 0
  const allDone = checklist && completedCount === totalCount && totalCount > 0

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {['move-in', 'move-out'].map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${activeType === type ? 'bg-[#185FA5] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {type === 'move-in' ? 'Move-In Checklist' : 'Move-Out Checklist'}
          </button>
        ))}
      </div>

      {!checklist ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm font-medium mb-1">No {activeType} checklist yet</p>
          <p className="text-slate-400 text-xs mb-5">Start a checklist with default items</p>
          <button
            onClick={() => startChecklist(activeType)}
            disabled={saving}
            className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? 'Starting…' : 'Start Checklist'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">{completedCount} of {totalCount} complete</p>
              {checklist.completed_at ? (
                <span className="text-xs text-emerald-600 font-semibold">Completed {new Date(checklist.completed_at).toLocaleDateString()}</span>
              ) : allDone && (
                <button
                  onClick={() => markComplete(checklist)}
                  disabled={marking}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {marking ? 'Marking…' : 'Mark Complete'}
                </button>
              )}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-[#185FA5] h-2 rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {checklist.items.map((item, idx) => (
              <label key={idx} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(checklist, idx)}
                  className="mt-0.5 rounded accent-[#185FA5]"
                />
                <div className="flex-1">
                  <p className={`text-sm ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</p>
                  {item.checked && item.checked_by && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.checked_by} · {item.checked_at ? new Date(item.checked_at).toLocaleString() : ''}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <p className="text-xs text-slate-400">Created by {checklist.created_by_name || 'Staff'} · {new Date(checklist.created_at).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  )
}
