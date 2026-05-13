import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getColor, BUSINESS_COLOR } from '../lib/colors'
import Layout from '../components/layout/Layout'
import EventForm from '../components/calendar/EventForm'

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [residents, setResidents] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
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
    setSelectedDay(null)
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    setSelectedDay(null)
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

  // Build legend
  const residentLegendMap = {}
  events.forEach(e => {
    if (RESIDENT_TYPES.includes(e.event_type) && e.resident_id && e.residents) {
      residentLegendMap[e.resident_id] = { name: e.residents.full_name, color: e.residents.color ?? 'blue' }
    }
  })
  const residentLegendItems = Object.values(residentLegendMap).sort((a, b) => a.name.localeCompare(b.name))
  const hasBusinessEvents = events.some(e => !RESIDENT_TYPES.includes(e.event_type))

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-600 text-lg">‹</button>
          <h1 className="text-xl font-semibold text-slate-800 w-48 text-center">
            {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h1>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors text-slate-600 text-lg">›</button>
        </div>
        <button
          onClick={() => openAddForm(todayStr)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Event
        </button>
      </div>

      {/* Calendar grid */}
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
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div
                          key={e.id}
                          onClick={ev => { ev.stopPropagation(); setEditingEvent(e) }}
                          className="text-xs px-1.5 py-0.5 rounded truncate leading-tight cursor-pointer hover:opacity-75 transition-opacity"
                          style={eventChipStyle(e)}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-slate-400 px-1">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {(residentLegendItems.length > 0 || hasBusinessEvents) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 px-1">
          {residentLegendItems.map(r => {
            const c = getColor(r.color)
            return (
              <div key={r.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: c.chipBg, outline: `1.5px solid ${c.swatch}` }} />
                <span className="text-xs text-slate-500">{r.name}</span>
              </div>
            )
          })}
          {hasBusinessEvents && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: BUSINESS_COLOR.chipBg, outline: `1.5px solid ${BUSINESS_COLOR.swatch}` }} />
              <span className="text-xs text-slate-500">Business event</span>
            </div>
          )}
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-slate-800">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={() => openAddForm(selectedDay)} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">
                + Add Event
              </button>
              <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-slate-400">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEditingEvent(e)}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: eventPanelBg(e) }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: eventDotColor(e) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-sm font-medium text-slate-800">{e.title}</p>
                      {e.event_time && <span className="text-xs text-slate-500">{formatTime(e.event_time)}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {e.event_type}{e.residents?.full_name ? ` · ${e.residents.full_name}` : ''}
                    </p>
                    {e.notes && <p className="text-xs text-slate-400 mt-1">{e.notes}</p>}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">Edit →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <EventForm
          residents={residents}
          defaultDate={addFormDate}
          onClose={() => setShowAddForm(false)}
          onSaved={handleFormSaved}
        />
      )}

      {/* Edit form */}
      {editingEvent && (
        <EventForm
          residents={residents}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={handleFormSaved}
        />
      )}
    </Layout>
  )
}
