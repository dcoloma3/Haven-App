import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getColor, BUSINESS_COLOR } from '../lib/colors'
import Layout from '../components/layout/Layout'
import EventForm from '../components/calendar/EventForm'
import { useIsMobile } from '../hooks/useIsMobile'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const RESIDENT_TYPES = ['Resident Appointment', 'Family Outing']

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function eventChipStyle(event) {
  if (!RESIDENT_TYPES.includes(event.event_type)) {
    return { backgroundColor: BUSINESS_COLOR.chipBg, color: BUSINESS_COLOR.chipText }
  }
  const c = getColor(event.residents?.color)
  return { backgroundColor: c.chipBg, color: c.chipText }
}

function eventDotColor(event) {
  if (!RESIDENT_TYPES.includes(event.event_type)) return BUSINESS_COLOR.swatch
  return getColor(event.residents?.color).swatch
}

function eventPanelBg(event) {
  if (!RESIDENT_TYPES.includes(event.event_type)) return BUSINESS_COLOR.chipBg
  return getColor(event.residents?.color).chipBg
}

export default function Calendar() {
  const now = new Date()
  const isMobile = useIsMobile()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [residents, setResidents] = useState([])
  const [selectedDay, setSelectedDay] = useState(() => isoDate(now.getFullYear(), now.getMonth(), now.getDate()))
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormDate, setAddFormDate] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)

  const fetchEvents = useCallback(async () => {
    const start = isoDate(year, month, 1)
    const end = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    const { data } = await supabase
      .from('calendar_events')
      .select('*, residents(full_name, color)')
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_time', { nullsFirst: true })
    setEvents(data ?? [])
  }, [year, month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    supabase.from('residents').select('id, full_name').order('full_name')
      .then(({ data }) => setResidents(data ?? []))
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function openAddForm(date) {
    setAddFormDate(date)
    setShowAddForm(true)
  }

  function handleFormSaved() {
    fetchEvents()
    setShowAddForm(false)
    setEditingEvent(null)
  }

  // Build calendar grid
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const remainder = cells.length % 7
  if (remainder !== 0) for (let i = 0; i < 7 - remainder; i++) cells.push(null)

  const eventsByDate = events.reduce((acc, e) => {
    if (!acc[e.event_date]) acc[e.event_date] = []
    acc[e.event_date].push(e)
    return acc
  }, {})

  const todayStr = isoDate(now.getFullYear(), now.getMonth(), now.getDate())
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []

  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Layout>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 text-xl active:bg-slate-50">‹</button>
          <h1 className="text-base font-semibold text-slate-800">{monthLabel}</h1>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 text-xl active:bg-slate-50">›</button>
        </div>

        {/* Compact calendar grid */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {DAYS_SHORT.map((d, i) => (
              <div key={i} className="py-2 text-center text-xs font-medium text-slate-400">{d}</div>
            ))}
          </div>

          {/* Day cells — compact on mobile */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dateStr = day ? isoDate(year, month, day) : null
              const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const hasDot = dayEvents.length > 0

              return (
                <button
                  key={i}
                  onClick={() => day && setSelectedDay(isSelected ? null : dateStr)}
                  disabled={!day}
                  className={`flex flex-col items-center py-2 gap-1 transition-colors ${
                    !day ? 'bg-slate-50' :
                    isSelected ? 'bg-[#185FA5]' :
                    'active:bg-slate-50'
                  }`}
                >
                  {day && (
                    <>
                      <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                        isSelected ? 'text-white' :
                        isToday ? 'bg-[#E6F1FB] text-[#185FA5] font-bold' :
                        'text-slate-700'
                      }`}>
                        {day}
                      </span>
                      {hasDot && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-[#185FA5]'}`} />
                      )}
                      {!hasDot && <span className="w-1.5 h-1.5" />}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {selectedDay
              ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a day'}
          </h2>
          {selectedDay && (
            <button
              onClick={() => openAddForm(selectedDay)}
              className="text-sm text-[#185FA5] font-medium active:opacity-70"
            >
              + Add
            </button>
          )}
        </div>

        {selectedDay && selectedDayEvents.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-8 text-center">
            <p className="text-slate-400 text-sm">No events today</p>
            <button
              onClick={() => openAddForm(selectedDay)}
              className="mt-2 text-sm text-[#185FA5] font-medium"
            >
              + Add an event
            </button>
          </div>
        )}

        {selectedDayEvents.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {selectedDayEvents.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setEditingEvent(e)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: eventDotColor(e) }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{e.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {e.event_time ? formatTime(e.event_time) + ' · ' : ''}{e.event_type}
                    {e.residents?.full_name ? ` · ${e.residents.full_name}` : ''}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {showAddForm && (
          <EventForm residents={residents} defaultDate={addFormDate} onClose={() => setShowAddForm(false)} onSaved={handleFormSaved} />
        )}
        {editingEvent && (
          <EventForm residents={residents} event={editingEvent} onClose={() => setEditingEvent(null)} onSaved={handleFormSaved} />
        )}
      </Layout>
    )
  }

  // ─── DESKTOP LAYOUT ───────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-600 text-lg">‹</button>
          <h1 className="text-xl font-semibold text-slate-800 w-48 text-center">{monthLabel}</h1>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-600 text-lg">›</button>
        </div>
        <button onClick={() => openAddForm(todayStr)} className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add Event
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dateStr = day ? isoDate(year, month, day) : null
            const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            return (
              <div
                key={i}
                onClick={() => day && setSelectedDay(dateStr === selectedDay ? null : dateStr)}
                className={`min-h-[5rem] p-1.5 border-b border-r border-slate-100 transition-colors ${
                  !day ? 'bg-slate-50' :
                  isSelected ? 'bg-[#E6F1FB] cursor-pointer' :
                  'hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {day && (
                  <>
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-[#185FA5] text-white' : 'text-slate-600'
                    }`}>{day}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} onClick={ev => { ev.stopPropagation(); setEditingEvent(e) }}
                          className="text-xs px-1.5 py-0.5 rounded truncate leading-tight cursor-pointer hover:opacity-75 transition-opacity"
                          style={eventChipStyle(e)}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && <div className="text-xs text-slate-400 px-1">+{dayEvents.length - 2} more</div>}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-slate-800">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={() => openAddForm(selectedDay)} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">+ Add Event</button>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(e => (
                <button key={e.id} onClick={() => setEditingEvent(e)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: eventPanelBg(e) }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: eventDotColor(e) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{e.title}</p>
                      {e.event_time && <span className="text-xs text-slate-500">{formatTime(e.event_time)}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{e.event_type}{e.residents?.full_name ? ` · ${e.residents.full_name}` : ''}</p>
                    {e.notes && <p className="text-xs text-slate-400 mt-1">{e.notes}</p>}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">Edit →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddForm && <EventForm residents={residents} defaultDate={addFormDate} onClose={() => setShowAddForm(false)} onSaved={handleFormSaved} />}
      {editingEvent && <EventForm residents={residents} event={editingEvent} onClose={() => setEditingEvent(null)} onSaved={handleFormSaved} />}
    </Layout>
  )
}
