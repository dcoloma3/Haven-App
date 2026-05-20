/*
-- Run in Supabase SQL editor:
create table activities (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  activity_date date not null,
  activity_time time,
  title text not null,
  description text,
  location text,
  capacity integer
);
create table activity_attendance (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  status text not null default 'attended',
  notes text,
  unique(activity_id, resident_id)
);
create index on activities(community_id, activity_date desc);
create index on activity_attendance(activity_id);
alter table activities enable row level security;
alter table activity_attendance enable row level security;
create policy "community members can manage activities" on activities
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
create policy "community members can manage attendance" on activity_attendance
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'
import { localDateStr } from '../lib/dateUtils'

export default function Activities() {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const today = localDateStr()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(today)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [residents, setResidents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [, setSaveError] = useState('')

  const [editActivity, setEditActivity] = useState(null)
  const [form, setForm] = useState({ activity_date: localDateStr(), activity_time: '', title: '', description: '', location: '', capacity: '' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function load() {
    let query = supabase.from('activities').select('*, activity_attendance(id, resident_id, status)').eq('community_id', communityId).order('activity_date', { ascending: true }).order('activity_time', { ascending: true })
    const { data } = await query
    setActivities(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId]) // eslint-disable-line

  useEffect(() => {
    supabase.from('residents').select('id, first_name, last_name').eq('community_id', communityId).eq('status', 'active').order('last_name')
      .then(({ data }) => setResidents(data || []))
  }, [communityId])

  const filtered = activities.filter(a => {
    if (filterDate) return a.activity_date === filterDate
    return true
  })

  function openNew() {
    setEditActivity(null)
    setForm({ activity_date: today, activity_time: '', title: '', description: '', location: '', capacity: '' })
    setShowNewModal(true)
  }

  function openEdit(a) {
    setEditActivity(a)
    setForm({
      activity_date: a.activity_date || today,
      activity_time: a.activity_time?.slice(0, 5) || '',
      title: a.title || '',
      description: a.description || '',
      location: a.location || '',
      capacity: a.capacity != null ? String(a.capacity) : '',
    })
    setShowNewModal(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.activity_date) return
    setSaving(true)
    setSaveError('')
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      created_by_name: authorName,
      activity_date: form.activity_date,
      activity_time: form.activity_time || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      location: form.location.trim() || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
    }
    let err
    if (editActivity) {
      ;({ error: err } = await supabase.from('activities').update(payload).eq('id', editActivity.id).eq('community_id', communityId))
    } else {
      ;({ error: err } = await supabase.from('activities').insert(payload))
    }
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    setShowNewModal(false)
    setEditActivity(null)
    setForm({ activity_date: today, activity_time: '', title: '', description: '', location: '', capacity: '' })
    await load()
  }

  async function openAttendance(activity) {
    setShowAttendanceModal(activity)
    // Build attendance map — start with null (no selection) for all residents
    // Only pre-fill residents who already have a saved attendance record
    const map = {}
    for (const att of (activity.activity_attendance || [])) map[att.resident_id] = att.status
    setAttendance(map)
  }

  async function saveAttendance() {
    if (!showAttendanceModal) return
    setSavingAttendance(true)
    // Only save residents where a status has been explicitly selected (non-null)
    const upserts = residents
      .filter(r => attendance[r.id] != null)
      .map(r => ({
        activity_id: showAttendanceModal.id,
        resident_id: r.id,
        community_id: communityId,
        status: attendance[r.id],
      }))
    if (upserts.length > 0) {
      await supabase.from('activity_attendance').upsert(upserts, { onConflict: 'activity_id,resident_id' })
    }
    setSavingAttendance(false)
    setShowAttendanceModal(null)
    await load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('activities').delete().eq('id', id).eq('community_id', communityId)
    if (error) { setSaveError(error.message); return }
    setDeleteConfirm(null)
    await load()
  }

  return (
    <Layout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Activities</h1>
          <p className="text-sm text-slate-500 mt-1">Log and track resident participation in daily activities</p>
          <Link
            to="/calendar"
            className="inline-block mt-2 text-xs font-semibold text-[#185FA5] bg-[#E6F1FB] px-3 py-1.5 rounded-full hover:bg-[#cce3f6] transition-colors"
          >
            View Calendar →
          </Link>
        </div>
        <button onClick={openNew} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2 flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Activity
        </button>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-5">
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
        />
        {filterDate !== today && (
          <button onClick={() => setFilterDate(today)} className="text-sm text-[#185FA5] font-medium hover:text-[#0C447C]">Today</button>
        )}
        {filterDate && <button onClick={() => setFilterDate('')} className="text-sm text-slate-400 hover:text-slate-600">Show all</button>}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">No activities scheduled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const attendedCount = (a.activity_attendance || []).filter(att => att.status === 'attended').length
            const absentCount = (a.activity_attendance || []).filter(att => att.status === 'absent').length
            const declinedCount = (a.activity_attendance || []).filter(att => att.status === 'declined').length
            const hasAttendance = (a.activity_attendance || []).length > 0

            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-bold text-slate-800">{a.title}</p>
                      {hasAttendance && (
                        <span className="text-xs bg-[#E6F1FB] text-[#185FA5] px-2.5 py-0.5 rounded-full font-semibold">
                          {attendedCount} attended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(a.activity_date + 'T00:00:00').toLocaleDateString()}
                      {a.activity_time ? ` at ${a.activity_time}` : ''}
                      {a.location ? ` · ${a.location}` : ''}
                    </p>
                    {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                    {hasAttendance && (
                      <div className="flex gap-3 mt-2 text-xs text-slate-500">
                        <span className="text-emerald-600">{attendedCount} attended</span>
                        <span className="text-slate-400">{absentCount} absent</span>
                        <span className="text-slate-400">{declinedCount} declined</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => openAttendance(a)} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      Take Attendance
                    </button>
                    {isAdmin && (
                      <button onClick={() => openEdit(a)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors text-center">Edit</button>
                    )}
                    {isAdmin && (
                      <button onClick={() => setDeleteConfirm(a)} className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors text-center">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New / Edit Activity Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => { setShowNewModal(false); setEditActivity(null) }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editActivity ? 'Edit Activity' : 'New Activity'}</h2>
              <button onClick={() => { setShowNewModal(false); setEditActivity(null) }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Activity name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                  <input type="time" value={form.activity_time} onChange={e => setForm(f => ({ ...f, activity_time: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className={inputCls} placeholder="e.g. Common Room" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Capacity</label>
                  <input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className={inputCls} placeholder="Max participants" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="Activity description…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => { setShowNewModal(false); setEditActivity(null) }} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.title.trim() || !form.activity_date || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : editActivity ? 'Save Changes' : 'Create Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowAttendanceModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">Take Attendance</h2>
                <p className="text-xs text-slate-500">{showAttendanceModal.title}</p>
              </div>
              <button onClick={() => setShowAttendanceModal(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500 font-medium">
                  {Object.values(attendance).filter(s => s === 'attended').length} attended ·{' '}
                  {Object.values(attendance).filter(s => s === 'absent').length} absent ·{' '}
                  {Object.values(attendance).filter(s => s === 'declined').length} declined ·{' '}
                  {residents.filter(r => attendance[r.id] == null).length} unrecorded
                </p>
              </div>
              <div className="space-y-2">
                {residents.map(r => (
                  <div key={r.id} className={`flex items-center gap-2 rounded-xl px-4 py-3 ${attendance[r.id] == null ? 'bg-slate-100' : 'bg-slate-50'}`}>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/residents/${r.id}`) }}
                      className="text-[#185FA5] hover:text-[#0B3D6E] font-medium transition-colors hover:underline underline-offset-2 text-sm flex-1 min-w-0 truncate text-left"
                    >
                      {r.first_name} {r.last_name}
                    </button>
                    <div className="flex gap-1 flex-shrink-0">
                      {[
                        { val: 'attended', label: 'Attended', inactive: 'bg-white text-slate-400 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-500' },
                        { val: 'absent', label: 'Absent', inactive: 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600 hover:border-slate-300', active: 'bg-slate-500 text-white border-slate-500' },
                        { val: 'declined', label: 'Declined', inactive: 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200', active: 'bg-red-500 text-white border-red-500' },
                      ].map(({ val, label, inactive, active }) => (
                        <button
                          key={val}
                          onClick={() => setAttendance(a => ({ ...a, [r.id]: a[r.id] === val ? null : val }))}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${attendance[r.id] === val ? active : inactive}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowAttendanceModal(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={saveAttendance} disabled={savingAttendance} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {savingAttendance ? 'Saving…' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">Delete Activity</h3>
            <p className="text-sm text-slate-500 mb-5">Delete <strong>{deleteConfirm.title}</strong>? Attendance records will also be deleted.</p>
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
