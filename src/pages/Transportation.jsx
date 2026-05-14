/*
-- Run in Supabase SQL editor:
create table transportation_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  trip_date date not null,
  departure_time time,
  return_time time,
  destination text not null,
  purpose text,
  driver_name text,
  vehicle text,
  notes text,
  status text not null default 'scheduled'
);
create index on transportation_log(community_id, trip_date desc);
create index on transportation_log(resident_id, trip_date desc);
alter table transportation_log enable row level security;
create policy "community members can manage transportation" on transportation_log
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function Transportation() {
  const { communityId } = useCommunity()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [trips, setTrips] = useState([])
  const [residents, setResidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('upcoming')
  const [filterDate, setFilterDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [residentSearch, setResidentSearch] = useState('')
  const [form, setForm] = useState({ resident_id: '', trip_date: new Date().toISOString().split('T')[0], departure_time: '', return_time: '', destination: '', purpose: '', driver_name: '', vehicle: '', notes: '', status: 'scheduled' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
  const today = new Date().toISOString().split('T')[0]

  async function load() {
    const [{ data: tripsData }, { data: residentsData }] = await Promise.all([
      supabase.from('transportation_log').select('*, residents(id, first_name, last_name, room_number)').eq('community_id', communityId).order('trip_date', { ascending: false }),
      supabase.from('residents').select('id, first_name, last_name').eq('community_id', communityId).eq('status', 'active').order('last_name'),
    ])
    setTrips(tripsData || [])
    setResidents(residentsData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId]) // eslint-disable-line

  const filtered = trips.filter(t => {
    if (view === 'upcoming' && (t.trip_date < today || t.status === 'cancelled')) return false
    if (view === 'past' && t.trip_date >= today && t.status !== 'cancelled') return false
    if (filterDate && t.trip_date !== filterDate) return false
    return true
  })

  const filteredResidents = residents.filter(r =>
    residentSearch === '' ||
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(residentSearch.toLowerCase())
  )

  async function handleSave() {
    if (!form.destination.trim() || !form.trip_date || !form.resident_id) return
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    await supabase.from('transportation_log').insert({
      community_id: communityId,
      resident_id: form.resident_id,
      created_by_name: authorName,
      trip_date: form.trip_date,
      departure_time: form.departure_time || null,
      return_time: form.return_time || null,
      destination: form.destination.trim(),
      purpose: form.purpose.trim() || null,
      driver_name: form.driver_name.trim() || null,
      vehicle: form.vehicle.trim() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    })
    setSaving(false)
    setShowModal(false)
    setForm({ resident_id: '', trip_date: today, departure_time: '', return_time: '', destination: '', purpose: '', driver_name: '', vehicle: '', notes: '', status: 'scheduled' })
    setResidentSearch('')
    await load()
  }

  async function updateStatus(id, status) {
    await supabase.from('transportation_log').update({ status }).eq('id', id)
    await load()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transportation</h1>
          <p className="text-sm text-slate-500 mt-1">Resident trip scheduling</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Schedule Trip
        </button>
      </div>

      {/* Toggle + Date filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([val, label]) => (
            <button key={val} onClick={() => setView(val)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === val ? 'bg-[#185FA5] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
        />
        {filterDate && <button onClick={() => setFilterDate('')} className="text-sm text-slate-400 hover:text-slate-600 px-2">Clear</button>}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">No trips found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destination</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {t.residents ? (
                      <button onClick={() => navigate(`/residents/${t.residents.id}`)} className="text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors">
                        {t.residents.first_name} {t.residents.last_name}
                      </button>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{new Date(t.trip_date + 'T00:00:00').toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.departure_time || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 text-sm font-medium">{t.destination}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.driver_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[t.status] || STATUS_COLORS.scheduled}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'scheduled' && (
                      <button onClick={() => updateStatus(t.id, 'completed')} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors">Complete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">Schedule Trip</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Resident <span className="text-red-500">*</span></label>
                <input
                  value={residentSearch}
                  onChange={e => { setResidentSearch(e.target.value); if (!e.target.value) setForm(f => ({ ...f, resident_id: '' })) }}
                  placeholder="Search resident name…"
                  className={inputCls}
                />
                {residentSearch && filteredResidents.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden max-h-40 overflow-y-auto">
                    {filteredResidents.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setForm(f => ({ ...f, resident_id: r.id })); setResidentSearch(`${r.first_name} ${r.last_name}`) }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {r.first_name} {r.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date" value={form.trip_date} onChange={e => setForm(f => ({ ...f, trip_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Departure</label>
                  <input type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Return</label>
                  <input type="time" value={form.return_time} onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Destination <span className="text-red-500">*</span></label>
                <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className={inputCls} placeholder="Where to?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Purpose</label>
                <input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className={inputCls} placeholder="Reason for trip" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Driver</label>
                  <input value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} className={inputCls} placeholder="Driver name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vehicle</label>
                  <input value={form.vehicle} onChange={e => setForm(f => ({ ...f, vehicle: e.target.value }))} className={inputCls} placeholder="Vehicle" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.destination.trim() || !form.trip_date || !form.resident_id || saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : 'Schedule Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
