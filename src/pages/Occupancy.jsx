/*
-- Run in Supabase SQL editor:
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  created_at timestamptz default now(),
  prospect_name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  requested_room_type text,
  notes text,
  priority text not null default 'medium',
  status text not null default 'waiting'
);
create index on waitlist(community_id, created_at desc);
alter table waitlist enable row level security;
create policy "community admins can manage waitlist" on waitlist
  for all using (community_id in (select community_id from community_members where user_id = auth.uid() and role = 'admin'));
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

const STATUS_COLORS = {
  waiting: 'bg-blue-100 text-blue-700',
  toured: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-slate-100 text-slate-500',
}

export default function Occupancy() {
  const { communityId, isAdmin } = useCommunity()
  const navigate = useNavigate()
  const [residents, setResidents] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProspect, setEditProspect] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ prospect_name: '', contact_name: '', contact_phone: '', contact_email: '', requested_room_type: '', notes: '', priority: 'medium', status: 'waiting' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  const [totalBeds, setTotalBeds] = useState(null)

  async function load() {
    const [{ data: res }, { data: wl }, { data: comm }] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room_number, status').eq('community_id', communityId).order('room_number'),
      supabase.from('waitlist').select('*').eq('community_id', communityId).order('priority').order('created_at'),
      supabase.from('communities').select('total_beds').eq('id', communityId).single(),
    ])
    setResidents(res || [])
    setWaitlist(wl || [])
    setTotalBeds(comm?.total_beds ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId]) // eslint-disable-line

  const activeResidents = residents.filter(r => r.status === 'active')
  const occupiedRooms = [...new Set(activeResidents.map(r => r.room_number).filter(Boolean))]

  function openAdd() {
    setEditProspect(null)
    setForm({ prospect_name: '', contact_name: '', contact_phone: '', contact_email: '', requested_room_type: '', notes: '', priority: 'medium', status: 'waiting' })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditProspect(p)
    setForm({ prospect_name: p.prospect_name, contact_name: p.contact_name || '', contact_phone: p.contact_phone || '', contact_email: p.contact_email || '', requested_room_type: p.requested_room_type || '', notes: p.notes || '', priority: p.priority, status: p.status })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.prospect_name.trim()) return
    setSaving(true)
    const payload = { community_id: communityId, ...form, prospect_name: form.prospect_name.trim() }
    if (editProspect) {
      await supabase.from('waitlist').update(payload).eq('id', editProspect.id)
    } else {
      await supabase.from('waitlist').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    await load()
  }

  async function handleDelete(id) {
    await supabase.from('waitlist').delete().eq('id', id)
    setDeleteConfirm(null)
    await load()
  }

  async function updateStatus(id, status) {
    await supabase.from('waitlist').update({ status }).eq('id', id)
    await load()
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Occupancy & Waitlist</h1>
      </div>

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="space-y-8">
          {/* Occupancy Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-700">Occupancy Overview</h2>
              <div className="flex gap-4 items-center">
                <div className="text-center">
                  <p className="text-xl font-bold text-[#185FA5]">{occupiedRooms.length}</p>
                  <p className="text-xs text-slate-500">Occupied</p>
                </div>
                {totalBeds != null && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-400">{totalBeds - occupiedRooms.length}</p>
                      <p className="text-xs text-slate-500">Available</p>
                    </div>
                    <div className={`text-center px-3 py-1 rounded-xl ${occupiedRooms.length / totalBeds >= 0.9 ? 'bg-emerald-50' : occupiedRooms.length / totalBeds >= 0.7 ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <p className={`text-xl font-bold ${occupiedRooms.length / totalBeds >= 0.9 ? 'text-emerald-600' : occupiedRooms.length / totalBeds >= 0.7 ? 'text-amber-600' : 'text-red-600'}`}>
                        {Math.round((occupiedRooms.length / totalBeds) * 100)}%
                      </p>
                      <p className="text-xs text-slate-500">Occupancy</p>
                    </div>
                  </>
                )}
                {totalBeds == null && (
                  <p className="text-xs text-slate-400 italic">Set total beds in <a href="/settings" className="text-[#185FA5] hover:underline">Settings</a> to see occupancy %</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeResidents.map(r => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/residents/${r.id}`)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-[#185FA5] hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#185FA5] flex items-center justify-center text-white font-bold text-sm mb-2">
                    {r.first_name?.[0] || '?'}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.first_name} {r.last_name}</p>
                  <p className="text-xs text-slate-400">Room {r.room_number || '—'}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Waitlist */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-700">Waitlist</h2>
              {isAdmin && (
                <button onClick={openAdd} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Prospect
                </button>
              )}
            </div>

            {waitlist.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm">No prospects on the waitlist</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prospect</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waitlist.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.prospect_name}</p>
                          {p.requested_room_type && <p className="text-xs text-slate-400">{p.requested_room_type}</p>}
                          {p.notes && <p className="text-xs text-slate-400 truncate max-w-[150px]">{p.notes}</p>}
                        </td>
                        <td className="px-4 py-3">
                          {p.contact_name && <p className="text-xs text-slate-600">{p.contact_name}</p>}
                          {p.contact_phone && <p className="text-xs text-slate-400">{p.contact_phone}</p>}
                          {p.contact_email && <p className="text-xs text-slate-400">{p.contact_email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.medium}`}>{p.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.waiting}`}>{p.status}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => openEdit(p)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors">Edit</button>
                              <select
                                value={p.status}
                                onChange={e => updateStatus(p.id, e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                              >
                                <option value="waiting">Waiting</option>
                                <option value="toured">Toured</option>
                                <option value="accepted">Accepted</option>
                                <option value="declined">Declined</option>
                              </select>
                              <button onClick={() => setDeleteConfirm(p)} className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors">Delete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editProspect ? 'Edit Prospect' : 'Add Prospect'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prospect Name <span className="text-red-500">*</span></label>
                <input value={form.prospect_name} onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))} className={inputCls} placeholder="Prospect's name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="waiting">Waiting</option>
                    <option value="toured">Toured</option>
                    <option value="accepted">Accepted</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className={inputCls} placeholder="Primary contact" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className={inputCls} placeholder="Phone number" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email</label>
                  <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className={inputCls} placeholder="email@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Requested Room Type</label>
                <input value={form.requested_room_type} onChange={e => setForm(f => ({ ...f, requested_room_type: e.target.value }))} className={inputCls} placeholder="e.g. Private, Semi-Private" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Any notes about this prospect…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.prospect_name.trim() || saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : editProspect ? 'Save Changes' : 'Add Prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">Delete Prospect</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteConfirm.prospect_name}</strong> from the waitlist?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
