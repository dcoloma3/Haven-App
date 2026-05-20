import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import EventForm from '../calendar/EventForm'
import { localDateStr } from '../../lib/dateUtils'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(timeStr) {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ─── Single appointment row ───────────────────────────────────────────────────
function AppointmentRow({ appt, onEdit }) {
  return (
    <button
      onClick={() => onEdit(appt)}
      className="w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors group"
    >
      {/* Blue appointment dot */}
      <span className="w-2 h-2 rounded-full bg-[#185FA5] flex-shrink-0 mt-1.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {appt.appointment_type || appt.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
          <span className="text-xs text-slate-500">{formatDate(appt.event_date)}</span>
          {appt.event_time && (
            <span className="text-xs text-slate-400">· {formatTime(appt.event_time)}</span>
          )}
          {appt.location && (
            <span className="text-xs text-slate-400">· {appt.location}</span>
          )}
        </div>
        {appt.notes && (
          <p className="text-xs text-slate-400 mt-1 truncate">{appt.notes}</p>
        )}
      </div>
      <svg
        className="w-4 h-4 text-slate-300 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResidentAppointments({ residentId, communityId }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [showPast, setShowPast] = useState(false)
  // We need the resident list for EventForm (just this resident pre-filled,
  // but EventForm expects the full community list — fetch it)
  const [residents, setResidents] = useState([])

  const today = localDateStr()

  // ── Fetch this resident's appointments ───────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!residentId || !communityId) return
    setLoading(true)
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('community_id', communityId)
      .eq('resident_id', residentId)
      .eq('event_type', 'Appointment')
      .order('event_date', { ascending: true })
    setAppointments(data ?? [])
    setLoading(false)
  }, [residentId, communityId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAppointments()
  }, [fetchAppointments])

  // ── Fetch residents for EventForm dropdown ────────────────────────────────────
  useEffect(() => {
    if (!communityId) return
    supabase
      .from('residents')
      .select('id, first_name, last_name, full_name')
      .eq('community_id', communityId)
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => setResidents(data ?? []))
  }, [communityId])

  function handleFormSaved() {
    fetchAppointments()
    setShowAddForm(false)
    setEditingEvent(null)
  }

  // ── Split upcoming vs past ────────────────────────────────────────────────────
  const upcoming = appointments.filter(a => a.event_date >= today)
  const past = appointments.filter(a => a.event_date < today)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-[#042C53]">Appointments</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#185FA5] hover:text-[#0C447C] transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Appointment
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
      ) : (
        <>
          {/* ── Upcoming ── */}
          {upcoming.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl px-4 py-6 text-center mb-4">
              <p className="text-sm text-slate-400">No upcoming appointments.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-sm text-[#185FA5] font-medium hover:underline"
              >
                + Schedule one
              </button>
            </div>
          ) : (
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 mb-4">
              {upcoming.map(appt => (
                <AppointmentRow key={appt.id} appt={appt} onEdit={setEditingEvent} />
              ))}
            </div>
          )}

          {/* ── Past appointments (collapsible) ── */}
          {past.length > 0 && (
            <div>
              <button
                onClick={() => setShowPast(p => !p)}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors mb-2"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showPast ? 'rotate-90' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                {showPast ? 'Hide' : 'Show'} past appointments ({past.length})
              </button>

              {showPast && (
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {past.map(appt => (
                    <AppointmentRow key={appt.id} appt={appt} onEdit={setEditingEvent} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add modal — pre-fills this resident */}
      {showAddForm && (
        <EventForm
          residents={residents}
          communityId={communityId}
          defaultDate={localDateStr()}
          defaultResidentId={residentId}
          onClose={() => setShowAddForm(false)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Edit/delete modal */}
      {editingEvent && (
        <EventForm
          residents={residents}
          communityId={communityId}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  )
}