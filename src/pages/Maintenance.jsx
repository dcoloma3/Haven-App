/*
-- Run in Supabase SQL editor:
create table work_orders (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  reported_by_name text,
  created_at timestamptz default now(),
  location text not null,
  category text not null,
  description text not null,
  priority text not null default 'medium',
  status text not null default 'open',
  assigned_to text,
  resolved_at timestamptz,
  resolution_notes text
);
create index on work_orders(community_id, created_at desc);
alter table work_orders enable row level security;
create policy "community members can manage work orders" on work_orders
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'

const PRIORITY_BORDERS = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-400',
  low: 'border-l-slate-300',
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  'in progress': 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}

const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Carpentry', 'Cleaning', 'Other']

export default function Maintenance() {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const location = useLocation()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => { if (location.state?.quickAdd) setShowModal(true) }, [])
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [assignedTo, setAssignedTo] = useState({})
  const [staffNames, setStaffNames] = useState([])
  const [form, setForm] = useState({ location: '', category: 'Plumbing', description: '', priority: 'medium' })
  const [maintError, setMaintError] = useState('')

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchOrders() {
    const { data } = await supabase
      .from('work_orders')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    supabase
      .from('community_members')
      .select('profiles(full_name, first_name, last_name)')
      .eq('community_id', communityId)
      .then(({ data }) => {
        const names = (data ?? [])
          .map(m => {
            const p = m.profiles
            if (!p) return null
            return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null
          })
          .filter(Boolean)
          .sort()
        setStaffNames(names)
      })
  }, [communityId]) // eslint-disable-line

  const thisMonth = new Date().toISOString().slice(0, 7)
  const stats = {
    open: orders.filter(o => o.status === 'open').length,
    inProgress: orders.filter(o => o.status === 'in progress').length,
    resolved: orders.filter(o => o.status === 'resolved' && o.resolved_at?.startsWith(thisMonth)).length,
  }

  async function handleCreate() {
    if (!form.location.trim() || !form.description.trim()) return
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const { error } = await supabase.from('work_orders').insert({
      community_id: communityId,
      reported_by_name: authorName,
      location: form.location.trim(),
      category: form.category,
      description: form.description.trim(),
      priority: form.priority,
    })
    setSaving(false)
    if (error) { setMaintError(error.message); return }
    setShowModal(false)
    setForm({ location: '', category: 'Plumbing', description: '', priority: 'medium' })
    await fetchOrders()
  }

  async function updateStatus(id, status) {
    const updates = { status }
    if (status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
      if (resolutionNotes[id]) updates.resolution_notes = resolutionNotes[id]
    }
    const { error } = await supabase.from('work_orders').update(updates).eq('id', id).eq('community_id', communityId)
    if (!error) await fetchOrders()
  }

  async function updateAssignee(id) {
    const { error } = await supabase.from('work_orders').update({ assigned_to: assignedTo[id] || null }).eq('id', id).eq('community_id', communityId)
    if (!error) await fetchOrders()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('work_orders').delete().eq('id', id).eq('community_id', communityId)
    if (!error) await fetchOrders()
  }

  const filtered = orders.filter(o => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false
    if (filterPriority !== 'all' && o.priority !== filterPriority) return false
    if (filterCategory !== 'all' && o.category !== filterCategory) return false
    return true
  })

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Maintenance</h1>
          <p className="text-sm text-slate-500 mt-1">Work orders and maintenance requests</p>
        </div>
        <button onClick={() => setShowModal(true)} className="self-start sm:self-auto whitespace-nowrap bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Open', value: stats.open, color: 'text-blue-600' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-amber-600' },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]">
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]">
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">No work orders found</p>
          <button onClick={() => setShowModal(true)} className="mt-3 bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors">
            + New Work Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <div key={o.id} className={`bg-white border border-l-4 ${PRIORITY_BORDERS[o.priority] || PRIORITY_BORDERS.medium} border-slate-200 rounded-2xl overflow-hidden`}>
              <button
                onClick={() => setExpanded(e => ({ ...e, [o.id]: !e[o.id] }))}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[o.priority] || PRIORITY_COLORS.medium}`}>{o.priority}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{o.category}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || STATUS_COLORS.open}`}>{o.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{o.location}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{o.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-400">{new Date(o.created_at).toLocaleDateString()}</p>
                  {o.assigned_to && <p className="text-xs text-slate-500">{o.assigned_to}</p>}
                </div>
                <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expanded[o.id] ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {expanded[o.id] && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-sm text-slate-700 whitespace-pre-line">{o.description}</p>
                  {o.reported_by_name && <p className="text-xs text-slate-400">Reported by {o.reported_by_name}</p>}

                  {isAdmin && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={assignedTo[o.id] ?? (o.assigned_to || '')}
                          onChange={e => setAssignedTo(a => ({ ...a, [o.id]: e.target.value }))}
                          className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
                        >
                          <option value="">— Unassigned —</option>
                          {staffNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <button onClick={() => updateAssignee(o.id)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors">Assign</button>
                      </div>

                      {o.status === 'open' && (
                        <button onClick={() => updateStatus(o.id, 'in progress')} className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-medium transition-colors">Mark In Progress</button>
                      )}

                      {o.status !== 'resolved' && (
                        <div className="space-y-2">
                          <textarea
                            value={resolutionNotes[o.id] || ''}
                            onChange={e => setResolutionNotes(r => ({ ...r, [o.id]: e.target.value }))}
                            rows={2}
                            placeholder="Resolution notes…"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#185FA5] resize-none"
                          />
                          <button onClick={() => updateStatus(o.id, 'resolved')} className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-medium transition-colors">Mark Resolved</button>
                        </div>
                      )}

                      {o.status === 'resolved' && o.resolution_notes && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Resolution Notes</p>
                          <p className="text-xs text-slate-600">{o.resolution_notes}</p>
                        </div>
                      )}

                      <button onClick={() => setDeleteConfirmId(o.id)} className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Work Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">New Work Order</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Location <span className="text-red-500">*</span></label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="e.g. Room 12, Dining Room, Hallway B" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="text-red-500">*</span></label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} className={inputCls + ' resize-none'} placeholder="Describe the issue…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4">
              {maintError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{maintError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowModal(false); setMaintError('') }} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleCreate} disabled={!form.location.trim() || !form.description.trim() || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {saving ? 'Submitting…' : 'Submit Work Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">Delete this work order?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null) }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
