import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'
import { localDateStr } from '../../lib/dateUtils'

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function ResidentTransportation({ residentId, resident: _resident }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTrip, setEditTrip] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ trip_date: '', departure_time: '', return_time: '', destination: '', purpose: '', driver_name: '', vehicle: '', notes: '', status: 'scheduled' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
  const today = localDateStr()

  async function fetchTrips() {
    const { data } = await supabase
      .from('transportation_log')
      .select('*')
      .eq('resident_id', residentId)
      .order('trip_date', { ascending: false })
    setTrips(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTrips() }, [residentId]) // eslint-disable-line

  function openAdd() {
    setEditTrip(null)
    setForm({ trip_date: today, departure_time: '', return_time: '', destination: '', purpose: '', driver_name: '', vehicle: '', notes: '', status: 'scheduled' })
    setShowModal(true)
  }

  function openEdit(t) {
    setEditTrip(t)
    setForm({ trip_date: t.trip_date || '', departure_time: t.departure_time || '', return_time: t.return_time || '', destination: t.destination || '', purpose: t.purpose || '', driver_name: t.driver_name || '', vehicle: t.vehicle || '', notes: t.notes || '', status: t.status || 'scheduled' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.destination.trim() || !form.trip_date) return
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
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
    }
    if (editTrip) {
      await supabase.from('transportation_log').update(payload).eq('id', editTrip.id)
    } else {
      await supabase.from('transportation_log').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    await fetchTrips()
  }

  async function updateStatus(id, status) {
    await supabase.from('transportation_log').update({ status }).eq('id', id)
    await fetchTrips()
  }

  async function handleDelete(id) {
    await supabase.from('transportation_log').delete().eq('id', id)
    setDeleteConfirm(null)
    await fetchTrips()
  }

  const upcoming = trips.filter(t => t.trip_date >= today && t.status !== 'cancelled')
  const past = trips.filter(t => t.trip_date < today || t.status === 'cancelled')

  if (loading) return <p className="text-slate-400 text-sm">Loading transportation…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Transportation Log</h3>
        <button onClick={openAdd} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Schedule Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm font-medium">No trips scheduled</p>
          <p className="text-slate-400 text-xs mt-1">Schedule a trip using the button above</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Upcoming</h4>
              <div className="space-y-3">
                {upcoming.map(t => <TripCard key={t.id} trip={t} onEdit={openEdit} onDelete={setDeleteConfirm} onStatusChange={updateStatus} isAdmin={isAdmin} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Past</h4>
              <div className="space-y-3">
                {past.map(t => <TripCard key={t.id} trip={t} onEdit={openEdit} onDelete={setDeleteConfirm} onStatusChange={updateStatus} isAdmin={isAdmin} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editTrip ? 'Edit Trip' : 'Schedule Trip'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
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
                <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} className={inputCls} placeholder="e.g. Doctor's Office, Pharmacy" />
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.destination.trim() || !form.trip_date || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : editTrip ? 'Save Changes' : 'Schedule Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">Delete Trip</h3>
            <p className="text-sm text-slate-500 mb-5">Delete the trip to <strong>{deleteConfirm.destination}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TripCard({ trip, onEdit, onDelete, onStatusChange, isAdmin }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[trip.status] || STATUS_COLORS.scheduled}`}>{trip.status}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">{trip.destination}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(trip.trip_date + 'T00:00:00').toLocaleDateString()}
            {trip.departure_time ? ` at ${trip.departure_time}` : ''}
            {trip.return_time ? ` — ${trip.return_time}` : ''}
          </p>
          {trip.purpose && <p className="text-xs text-slate-400 mt-0.5">{trip.purpose}</p>}
          {trip.driver_name && <p className="text-xs text-slate-400">Driver: {trip.driver_name}{trip.vehicle ? ` · ${trip.vehicle}` : ''}</p>}
          {trip.notes && <p className="text-xs text-slate-400 mt-0.5">{trip.notes}</p>}
        </div>
      </div>
      <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
        {trip.status === 'scheduled' && (
          <>
            <button onClick={() => onStatusChange(trip.id, 'completed')} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 transition-colors">Mark Completed</button>
            <button onClick={() => onStatusChange(trip.id, 'cancelled')} className="text-xs text-slate-400 font-medium hover:text-slate-600 transition-colors">Cancel Trip</button>
          </>
        )}
        {isAdmin && (
          <>
            <button onClick={() => onEdit(trip)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors">Edit</button>
            <button onClick={() => onDelete(trip)} className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors">Delete</button>
          </>
        )}
      </div>
    </div>
  )
}
