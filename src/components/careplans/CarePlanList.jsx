/*
-- Run in Supabase SQL editor:
create table care_plans (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  goal text not null,
  interventions text,
  status text not null default 'active',
  review_date date,
  notes text
);
create index on care_plans(resident_id, created_at desc);
alter table care_plans enable row level security;
create policy "community members can manage care plans" on care_plans
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  'on hold': 'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-600',
}

function isPastDue(dateStr) {
  if (!dateStr) return false
  // Compare calendar dates in local time (not UTC) to avoid off-by-one at midnight
  const today = new Date().toISOString().split('T')[0]
  return dateStr < today
}

export default function CarePlanList({ residentId, resident }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ goal: '', interventions: '', review_date: '', notes: '', status: 'active' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchPlans() {
    const { data } = await supabase
      .from('care_plans')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [residentId]) // eslint-disable-line

  function openAdd() {
    setEditPlan(null)
    setForm({ goal: '', interventions: '', review_date: '', notes: '', status: 'active' })
    setShowModal(true)
  }

  function openEdit(plan) {
    setEditPlan(plan)
    setForm({
      goal: plan.goal || '',
      interventions: plan.interventions || '',
      review_date: plan.review_date || '',
      notes: plan.notes || '',
      status: plan.status || 'active',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.goal.trim()) return
    setSaving(true)
    setSaveError('')
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      created_by_name: authorName,
      goal: form.goal.trim(),
      interventions: form.interventions.trim() || null,
      review_date: form.review_date || null,
      notes: form.notes.trim() || null,
      status: form.status,
      updated_at: new Date().toISOString(),
    }
    let error
    if (editPlan) {
      ;({ error } = await supabase.from('care_plans').update(payload).eq('id', editPlan.id))
    } else {
      ;({ error } = await supabase.from('care_plans').insert(payload))
    }
    if (error) {
      console.error(error)
      setSaveError('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setShowModal(false)
    await fetchPlans()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('care_plans').delete().eq('id', id)
    if (error) {
      console.error(error)
      setSaveError('Something went wrong. Please try again.')
      return
    }
    setDeleteConfirm(null)
    await fetchPlans()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading care plans…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Care Plan Goals</h3>
        <button onClick={openAdd} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Goal
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No care plan goals yet</p>
          <p className="text-slate-400 text-xs mt-1">Add goals to build out this resident's care plan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpanded(e => ({ ...e, [plan.id]: !e[plan.id] }))}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[plan.status] || STATUS_COLORS.active}`}>
                      {plan.status}
                    </span>
                    {plan.review_date && isPastDue(plan.review_date) && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Past Due</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{plan.goal}</p>
                  {plan.review_date && (
                    <p className={`text-xs mt-0.5 ${isPastDue(plan.review_date) ? 'text-red-500' : 'text-slate-400'}`}>
                      Review: {new Date(plan.review_date + 'T00:00:00').toLocaleDateString()}
                    </p>
                  )}
                </div>
                <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expanded[plan.id] ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expanded[plan.id] && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
                  {plan.interventions && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Interventions</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{plan.interventions}</p>
                    </div>
                  )}
                  {plan.notes && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{plan.notes}</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">Added by {plan.created_by_name || 'Staff'} · {new Date(plan.created_at).toLocaleDateString()}</p>
                  {isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openEdit(plan)} className="text-[#185FA5] text-xs font-medium hover:text-[#0C447C] transition-colors">Edit</button>
                      <span className="text-slate-200">|</span>
                      <button onClick={() => setDeleteConfirm(plan)} className="text-red-400 text-xs font-medium hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editPlan ? 'Edit Goal' : 'Add Care Plan Goal'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Goal <span className="text-red-500">*</span></label>
                <textarea value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Describe the care goal…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Interventions</label>
                <textarea value={form.interventions} onChange={e => setForm(f => ({ ...f, interventions: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="List interventions…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="active">Active</option>
                    <option value="on hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Review Date</label>
                  <input type="date" value={form.review_date} onChange={e => setForm(f => ({ ...f, review_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 space-y-3">
              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!form.goal.trim() || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {saving ? 'Saving…' : editPlan ? 'Save Changes' : 'Add Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">Delete Goal</h3>
            <p className="text-sm text-slate-500 mb-5">Are you sure you want to delete this care plan goal?</p>
            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">{saveError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setSaveError('') }} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
