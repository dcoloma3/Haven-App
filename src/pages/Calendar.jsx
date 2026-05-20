import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import EventForm from '../components/calendar/EventForm'
import { localDateStr } from '../lib/dateUtils'
import { useCommunity } from '../context/CommunityContext'

// ─── Constants ───────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

// ─── Holiday computation (client-side) ───────────────────────────────────────
function getHolidays(year) {
  function nthWeekday(year, month, weekday, n) {
    let count = 0
    for (let d = 1; d <= 31; d++) {
      const date = new Date(year, month, d)
      if (date.getMonth() !== month) break
      if (date.getDay() === weekday) { count++; if (count === n) return d }
    }
  }
  function lastWeekday(year, month, weekday) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    for (let d = lastDay; d >= 1; d--) {
      if (new Date(year, month, d).getDay() === weekday) return d
    }
  }
  const pad = n => String(n).padStart(2, '0')
  const iso = (m, d) => `${year}-${pad(m + 1)}-${pad(d)}`
  return {
    [iso(0, 1)]: "New Year's Day",
    [iso(0, nthWeekday(year, 0, 1, 3))]: 'MLK Day',
    [iso(1, nthWeekday(year, 1, 1, 3))]: "Presidents' Day",
    [iso(4, lastWeekday(year, 4, 1))]: 'Memorial Day',
    [iso(5, 19)]: 'Juneteenth',
    [iso(6, 4)]: 'Independence Day',
    [iso(8, nthWeekday(year, 8, 1, 1))]: 'Labor Day',
    [iso(9, nthWeekday(year, 9, 1, 2))]: 'Columbus Day',
    [iso(10, 11)]: 'Veterans Day',
    [iso(10, nthWeekday(year, 10, 4, 4))]: 'Thanksgiving',
    [iso(11, 25)]: 'Christmas Day',
  }
}

// Dot color by event type
function dotColor(eventType) {
  if (eventType === 'Appointment') return '#185FA5'      // blue
  if (eventType === 'Community Event') return '#7C3AED'  // purple
  if (eventType === '__holiday__') return '#EF4444'      // red
  return '#94A3B8'
}

export default function Calendar() {
  const now = new Date()
  const { communityId } = useCommunity()
  const navigate = useNavigate()

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [residents, setResidents] = useState([])
  const [selectedDay, setSelectedDay] = useState(
    () => localDateStr()
  )
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormDate, setAddFormDate] = useState('')
  const [editingEvent, setEditingEvent] = useState(null)
  const [upcomingEvents, setUpcomingEvents] = useState([])

  // ── Fetch events for current month ──────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!communityId) return
    const start = isoDate(year, month, 1)
    const end = isoDate(year, month, new Date(year, month + 1, 0).getDate())
    const { data } = await supabase
      .from('calendar_events')
      .select('*, residents(id, first_name, last_name, full_name)')
      .eq('community_id', communityId)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_time', { nullsFirst: true })
    setEvents(data ?? [])
  }, [year, month, communityId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents()
  }, [fetchEvents])

  // ── Fetch upcoming events (next 5 from today) ────────────────────────────────
  useEffect(() => {
    if (!communityId) return
    const today = localDateStr()
    supabase
      .from('calendar_events')
      .select('*, residents(id, first_name, last_name, full_name)')
      .eq('community_id', communityId)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true, nullsFirst: true })
      .limit(5)
      .then(({ data }) => setUpcomingEvents(data ?? []))
  }, [communityId])

  // ── Fetch active residents for EventForm ─────────────────────────────────────
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

  // ── Month navigation ─────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    setSelectedDay(localDateStr())
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

  // ── Build calendar grid ───────────────────────────────────────────────────────
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const remainder = cells.length % 7
  if (remainder !== 0) for (let i = 0; i < 7 - remainder; i++) cells.push(null)

  // ── Merge DB events + holidays into eventsByDate map ─────────────────────────
  const holidays = getHolidays(year)

  const eventsByDate = events.reduce((acc, e) => {
    if (!acc[e.event_date]) acc[e.event_date] = []
    acc[e.event_date].push(e)
    return acc
  }, {})

  // Inject holiday pseudo-events
  Object.entries(holidays).forEach(([dateStr, name]) => {
    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = []
    // Only add if not already present (avoid duplicates on re-render)
    const alreadyHas = eventsByDate[dateStr].some(e => e.event_type === '__holiday__' && e.title === name)
    if (!alreadyHas) {
      eventsByDate[dateStr].unshift({
        id: `holiday-${dateStr}`,
        title: name,
        event_type: '__holiday__',
        event_date: dateStr,
        event_time: null,
        resident_id: null,
        residents: null,
        location: null,
        notes: null,
      })
    }
  })

  const todayStr = localDateStr()
  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Page heading */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule appointments, activities, and facility events</p>
        </div>
        <Link
          to="/activities"
          className="flex-shrink-0 text-xs font-semibold text-[#185FA5] bg-[#E6F1FB] px-3 py-1.5 rounded-full hover:bg-[#cce3f6] transition-colors"
        >
          Track participation →
        </Link>
      </div>

      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors text-xl"
          >
            ‹
          </button>
          <h2 className="text-lg font-bold text-[#042C53] w-44 text-center">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors text-xl"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="text-sm text-[#185FA5] font-medium border border-[#185FA5] px-3 py-1.5 rounded-lg hover:bg-[#E6F1FB] active:bg-[#cce3f6] transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar grid card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {/* Show 3-letter label on larger screens, 1-letter on tiny */}
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dateStr = day ? isoDate(year, month, day) : null
            const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : []
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const isBothTodayAndSelected = isToday && isSelected
            const isHoliday = dateStr ? !!holidays[dateStr] : false

            // Determine day number text color
            let dayNumCls = 'text-slate-700'
            if (isBothTodayAndSelected) dayNumCls = 'text-white'
            else if (isSelected) dayNumCls = 'text-[#185FA5]'
            else if (isToday) dayNumCls = 'text-white'
            else if (isHoliday) dayNumCls = 'text-red-500'

            // Day number circle background
            let dayNumBg = ''
            if (isBothTodayAndSelected) dayNumBg = 'bg-[#185FA5]'
            else if (isSelected) dayNumBg = 'bg-[#E6F1FB]'
            else if (isToday) dayNumBg = 'bg-[#185FA5]'

            // Up to 3 dot types, then "+N more"
            const MAX_DOTS = 3
            const visibleDots = dayEvents.slice(0, MAX_DOTS)
            const extraCount = dayEvents.length - MAX_DOTS

            return (
              <button
                key={i}
                onClick={() => day && setSelectedDay(isSelected ? null : dateStr)}
                disabled={!day}
                className={`flex flex-col items-center pt-2 pb-2 gap-1 min-h-[3.5rem] sm:min-h-[4.5rem] transition-colors focus:outline-none ${
                  !day
                    ? 'bg-slate-50 cursor-default'
                    : isSelected
                    ? 'bg-[#E6F1FB] active:bg-[#cce3f6]'
                    : 'hover:bg-slate-50 active:bg-slate-100 cursor-pointer'
                }`}
              >
                {day && (
                  <>
                    {/* Day number */}
                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${dayNumBg} ${dayNumCls}`}>
                      {day}
                    </span>

                    {/* Event dots (max 3) */}
                    {visibleDots.length > 0 && (
                      <div className="flex items-center gap-0.5 flex-wrap justify-center max-w-full px-0.5">
                        {visibleDots.map(e => (
                          <span
                            key={e.id}
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: dotColor(e.event_type) }}
                          />
                        ))}
                      </div>
                    )}

                    {/* "+N more" overflow label */}
                    {extraCount > 0 && (
                      <span className="text-[9px] text-slate-400 leading-none">+{extraCount}</span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day event list */}
      {selectedDay && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
              {holidays[selectedDay] && (
                <span className="ml-2 text-xs text-red-400 font-normal">· {holidays[selectedDay]}</span>
              )}
            </h2>
            <button
              onClick={() => openAddForm(selectedDay)}
              className="text-sm text-[#185FA5] font-semibold hover:text-[#0C447C] transition-colors"
            >
              + Add Event
            </button>
          </div>

          {/* Events for the selected day */}
          {selectedDayEvents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-400">No events on this day.</p>
              <button
                onClick={() => openAddForm(selectedDay)}
                className="mt-2 text-sm text-[#185FA5] font-medium hover:underline"
              >
                + Add an event
              </button>
            </div>
          ) : (
            <div>
              {selectedDayEvents.map((e, i) => {
                const isHolidayEvent = e.event_type === '__holiday__'
                const residentName = e.residents
                  ? (e.residents.full_name || [e.residents.first_name, e.residents.last_name].filter(Boolean).join(' '))
                  : null

                return (
                  <button
                    key={e.id}
                    onClick={() => !isHolidayEvent && setEditingEvent(e)}
                    disabled={isHolidayEvent}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors ${
                      i !== 0 ? 'border-t border-slate-100' : ''
                    } ${isHolidayEvent ? 'cursor-default' : 'hover:bg-slate-50 active:bg-slate-100'}`}
                  >
                    {/* Colored dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: dotColor(e.event_type) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                        {e.event_time && (
                          <span className="text-xs text-slate-500">{formatTime(e.event_time)}</span>
                        )}
                        {!isHolidayEvent && (
                          <span className="text-xs text-slate-400">{e.event_type}</span>
                        )}
                        {residentName && e.residents?.id && (
                          <button
                            onClick={ev => { ev.stopPropagation(); navigate(`/residents/${e.residents.id}`) }}
                            className="text-xs text-[#185FA5] hover:text-[#0B3D6E] font-medium transition-colors hover:underline underline-offset-2"
                          >
                            · {residentName}
                          </button>
                        )}
                        {residentName && !e.residents?.id && (
                          <span className="text-xs text-slate-500">· {residentName}</span>
                        )}
                        {e.location && (
                          <span className="text-xs text-slate-400">· {e.location}</span>
                        )}
                      </div>
                      {e.notes && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{e.notes}</p>
                      )}
                    </div>
                    {!isHolidayEvent && (
                      <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Events list */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Upcoming Events</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingEvents.map(e => {
              const residentName = e.residents
                ? (e.residents.full_name || [e.residents.first_name, e.residents.last_name].filter(Boolean).join(' '))
                : null
              const dateLabel = new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
              })
              return (
                <div key={e.id} className="flex items-start gap-3 px-4 py-3.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: dotColor(e.event_type) }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-slate-500">{dateLabel}</span>
                      {e.event_time && (
                        <span className="text-xs text-slate-500">· {formatTime(e.event_time)}</span>
                      )}
                      {residentName && (
                        <span className="text-xs text-slate-500">· {residentName}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add / Edit modals */}
      {showAddForm && (
        <EventForm
          residents={residents}
          communityId={communityId}
          defaultDate={addFormDate}
          onClose={() => setShowAddForm(false)}
          onSaved={handleFormSaved}
        />
      )}
      {editingEvent && (
        <EventForm
          residents={residents}
          communityId={communityId}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSaved={handleFormSaved}
        />
      )}
    </Layout>
  )
}