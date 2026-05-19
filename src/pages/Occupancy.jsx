/*
-- Run in Supabase SQL editor (supabase-migration-care-level-prospects.sql):
alter table waitlist add column if not exists referral_source text;
alter table waitlist add column if not exists care_level_interest text;
alter table waitlist add column if not exists inquiry_date date;
alter table waitlist add column if not exists tour_date date;
*/

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'

const CARE_LEVEL_COLORS = {
  AL:      'bg-blue-100 text-blue-700',
  IL:      'bg-emerald-100 text-emerald-700',
  MC:      'bg-purple-100 text-purple-700',
  SNF:     'bg-amber-100 text-amber-700',
  Hospice: 'bg-slate-100 text-slate-600',
  Respite: 'bg-orange-100 text-orange-700',
}

const PIPELINE_STAGES = [
  { key: 'inquiry',   label: 'Inquiry',       color: 'bg-blue-50 border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  { key: 'toured',    label: 'Toured',         color: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',   dot: 'bg-amber-400' },
  { key: 'waiting',   label: 'Deciding',       color: 'bg-purple-50 border-purple-200',text: 'text-purple-700',  dot: 'bg-purple-400' },
  { key: 'accepted',  label: 'Move-In Ready',  color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'declined',  label: 'Declined',       color: 'bg-slate-50 border-slate-200',  text: 'text-slate-500',   dot: 'bg-slate-300' },
]

const REFERRAL_SOURCES = [
  'A Place For Mom',
  'Family Referral',
  'Doctor / Hospital',
  'Website',
  'Walk-in',
  'Social Media',
  'Senior Advisor',
  'Other',
]

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
  const [stageFilter, setStageFilter] = useState('all')
  const [totalBeds, setTotalBeds] = useState(null)

  const emptyForm = {
    prospect_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    care_level_interest: '',
    referral_source: '',
    inquiry_date: '',
    tour_date: '',
    requested_room_type: '',
    notes: '',
    priority: 'medium',
    status: 'inquiry',
  }
  const [form, setForm] = useState(emptyForm)

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function load() {
    const [{ data: res }, { data: wl }, { data: comm }] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room_number, status, care_level').eq('community_id', communityId).order('room_number'),
      supabase.from('waitlist').select('*').eq('community_id', communityId).order('created_at', { ascending: false }),
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

  // Pipeline counts
  const stageCounts = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = waitlist.filter(p => p.status === s.key).length
    return acc
  }, {})
  const activeProspects = waitlist.filter(p => p.status !== 'declined').length

  const filteredProspects = stageFilter === 'all'
    ? waitlist
    : waitlist.filter(p => p.status === stageFilter)

  function openAdd() {
    setEditProspect(null)
    setForm({ ...emptyForm, inquiry_date: new Date().toISOString().split('T')[0] })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditProspect(p)
    setForm({
      prospect_name: p.prospect_name || '',
      contact_name: p.contact_name || '',
      contact_phone: p.contact_phone || '',
      contact_email: p.contact_email || '',
      care_level_interest: p.care_level_interest || '',
      referral_source: p.referral_source || '',
      inquiry_date: p.inquiry_date || '',
      tour_date: p.tour_date || '',
      requested_room_type: p.requested_room_type || '',
      notes: p.notes || '',
      priority: p.priority || 'medium',
      status: p.status || 'inquiry',
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.prospect_name.trim()) return
    setSaving(true)
    const payload = {
      community_id: communityId,
      prospect_name: form.prospect_name.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      care_level_interest: form.care_level_interest || null,
      referral_source: form.referral_source || null,
      inquiry_date: form.inquiry_date || null,
      tour_date: form.tour_date || null,
      requested_room_type: form.requested_room_type.trim() || null,
      notes: form.notes.trim() || null,
      priority: form.priority,
      status: form.status,
    }
    if (editProspect) {
      await supabase.from('waitlist').update(payload).eq('id', editProspect.id).eq('community_id', communityId)
    } else {
      await supabase.from('waitlist').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    await load()
  }

  async function handleDelete(id) {
    await supabase.from('waitlist').delete().eq('id', id).eq('community_id', communityId)
    setDeleteConfirm(null)
    await load()
  }

  async function advanceStage(p) {
    const order = PIPELINE_STAGES.map(s => s.key)
    const idx = order.indexOf(p.status)
    if (idx === -1 || idx >= order.length - 2) return // don't auto-advance to declined
    const next = order[idx + 1]
    await supabase.from('waitlist').update({ status: next }).eq('id', p.id)
    await load()
  }

  function stageInfo(key) {
    return PIPELINE_STAGES.find(s => s.key === key) || PIPELINE_STAGES[0]
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Occupancy & Prospects</h1>
          <p className="text-sm text-slate-500 mt-1">Track your rooms and incoming prospects</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="self-start sm:self-auto whitespace-nowrap text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)', boxShadow: '0 2px 12px rgba(24,95,165,0.4)' }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Prospect
          </button>
        )}
      </div>

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="space-y-8">

          {/* ── Occupancy Overview ── */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-700">Occupancy Overview</h2>
              <div className="flex gap-3 items-center">
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
                    <div className={`text-center px-3 py-1 rounded-xl ${
                      occupiedRooms.length / totalBeds >= 0.9 ? 'bg-emerald-50' :
                      occupiedRooms.length / totalBeds >= 0.7 ? 'bg-amber-50' : 'bg-red-50'
                    }`}>
                      <p className={`text-xl font-bold ${
                        occupiedRooms.length / totalBeds >= 0.9 ? 'text-emerald-600' :
                        occupiedRooms.length / totalBeds >= 0.7 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {Math.round((occupiedRooms.length / totalBeds) * 100)}%
                      </p>
                      <p className="text-xs text-slate-500">Occupancy</p>
                    </div>
                  </>
                )}
                {totalBeds == null && (
                  <p className="text-xs text-slate-400 italic">
                    Set total beds in <Link to="/settings" className="text-[#185FA5] hover:underline">Settings</Link>
                  </p>
                )}
              </div>
            </div>

            {activeResidents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">No active residents yet</p>
              </div>
            ) : (
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
                    <p className="text-xs text-slate-400 mb-1.5">Room {r.room_number || '—'}</p>
                    {r.care_level && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${CARE_LEVEL_COLORS[r.care_level] || 'bg-slate-100 text-slate-600'}`}>
                        {r.care_level}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Prospect Pipeline ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-700">Prospect Pipeline</h2>
                {activeProspects > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">{activeProspects} active prospect{activeProspects !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            {/* Pipeline stage bar */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {PIPELINE_STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}
                  className={`flex-shrink-0 min-w-[110px] border rounded-xl p-3 text-left transition-all ${
                    stageFilter === s.key
                      ? `${s.color} border-2`
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <p className={`text-xs font-semibold whitespace-nowrap ${stageFilter === s.key ? s.text : 'text-slate-600'}`}>{s.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${stageFilter === s.key ? s.text : 'text-slate-800'}`}>
                    {stageCounts[s.key] || 0}
                  </p>
                </button>
              ))}
            </div>

            {filteredProspects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <p className="text-slate-500 text-sm font-medium">No prospects in this stage</p>
                {isAdmin && stageFilter === 'all' && (
                  <button onClick={openAdd} className="mt-3 text-sm text-[#185FA5] font-semibold hover:underline">
                    + Add your first prospect
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prospect</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Care Level</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Referral</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                        {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProspects.map(p => {
                        const stage = stageInfo(p.status)
                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-800">{p.prospect_name}</p>
                              <div className="flex gap-2 mt-0.5 flex-wrap">
                                {p.inquiry_date && (
                                  <p className="text-xs text-slate-400">
                                    Inquiry: {new Date(p.inquiry_date + 'T00:00:00').toLocaleDateString()}
                                  </p>
                                )}
                                {p.tour_date && (
                                  <p className="text-xs text-slate-400">
                                    Tour: {new Date(p.tour_date + 'T00:00:00').toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              {p.notes && <p className="text-xs text-slate-400 truncate max-w-[180px] mt-0.5">{p.notes}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {p.contact_name && <p className="text-xs font-medium text-slate-700">{p.contact_name}</p>}
                              {p.contact_phone && <p className="text-xs text-slate-400">{p.contact_phone}</p>}
                              {p.contact_email && <p className="text-xs text-slate-400 truncate max-w-[140px]">{p.contact_email}</p>}
                            </td>
                            <td className="px-4 py-3">
                              {p.care_level_interest ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CARE_LEVEL_COLORS[p.care_level_interest] || 'bg-slate-100 text-slate-600'}`}>
                                  {p.care_level_interest}
                                </span>
                              ) : <span className="text-xs text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {p.referral_source
                                ? <p className="text-xs text-slate-600">{p.referral_source}</p>
                                : <span className="text-xs text-slate-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.color} ${stage.text}`}>
                                {stage.label}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3">
                                <div className="flex gap-2 flex-wrap items-center">
                                  <button onClick={() => openEdit(p)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C]">Edit</button>
                                  {p.status !== 'accepted' && p.status !== 'declined' && (
                                    <button
                                      onClick={() => advanceStage(p)}
                                      className="text-xs text-emerald-600 font-medium hover:text-emerald-800"
                                      title="Advance to next stage"
                                    >
                                      Advance →
                                    </button>
                                  )}
                                  {p.status === 'accepted' && (
                                    <button
                                      onClick={() => navigate('/dashboard?openAddResident=true')}
                                      className="bg-[#042C53] hover:bg-[#0B3D6E] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                      Convert to Resident
                                    </button>
                                  )}
                                  <button onClick={() => setDeleteConfirm(p)} className="text-xs text-red-400 font-medium hover:text-red-600">Delete</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editProspect ? 'Edit Prospect' : 'Add Prospect'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              {/* Prospect name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prospect Name <span className="text-red-500">*</span></label>
                <input value={form.prospect_name} onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))} className={inputCls} placeholder="Prospect's full name" />
              </div>

              {/* Stage + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pipeline Stage</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={inputCls}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Care level + Referral */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Care Level Interest</label>
                  <select value={form.care_level_interest} onChange={e => setForm(f => ({ ...f, care_level_interest: e.target.value }))} className={inputCls}>
                    <option value="">Not specified</option>
                    <option value="AL">Assisted Living (AL)</option>
                    <option value="IL">Independent Living (IL)</option>
                    <option value="MC">Memory Care (MC)</option>
                    <option value="SNF">Skilled Nursing (SNF)</option>
                    <option value="Hospice">Hospice</option>
                    <option value="Respite">Respite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Referral Source</label>
                  <select value={form.referral_source} onChange={e => setForm(f => ({ ...f, referral_source: e.target.value }))} className={inputCls}>
                    <option value="">Unknown</option>
                    {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Inquiry + Tour dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Inquiry Date</label>
                  <input type="date" value={form.inquiry_date} onChange={e => setForm(f => ({ ...f, inquiry_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tour Date</label>
                  <input type="date" value={form.tour_date} onChange={e => setForm(f => ({ ...f, tour_date: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* Contact info */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className={inputCls} placeholder="Primary contact (family member, etc.)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className={inputCls} placeholder="Phone number" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
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
              <button
                onClick={handleSave}
                disabled={!form.prospect_name.trim() || saving}
                className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {saving ? 'Saving…' : editProspect ? 'Save Changes' : 'Add Prospect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">Remove Prospect</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteConfirm.prospect_name}</strong> from the pipeline?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
