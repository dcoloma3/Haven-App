import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function SearchIcon({ light }) {
  return (
    <svg
      className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
        light ? 'text-slate-400' : 'text-white/50'
      }`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function Section({ label, children }) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1">
        {label}
      </p>
      {children}
      <div className="pb-1" />
    </div>
  )
}

function ResultItem({ primary, secondary, onClick }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-baseline gap-1.5 min-w-0"
    >
      <span className="text-sm font-medium text-slate-800 truncate">{primary}</span>
      {secondary && (
        <span className="text-xs text-slate-400 flex-shrink-0 truncate">{secondary}</span>
      )}
    </button>
  )
}

export default function GlobalSearch() {
  const { communityId } = useCommunity()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const [, setFocused] = useState(false)
  const navigate    = useNavigate()
  const containerRef = useRef(null)
  const timerRef     = useRef(null)

  // Close on click outside
  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.length < 2) { setResults(null); setOpen(false); return }

    setLoading(true)
    setOpen(true)

    timerRef.current = setTimeout(async () => {
      const q = `%${query}%`
      const [resRes, medRes, evtRes] = await Promise.all([
        supabase.from('residents').select('id, full_name, room_number').eq('community_id', communityId).ilike('full_name', q).limit(5),
        supabase.from('medications').select('id, medication_name, residents(id, full_name)').eq('community_id', communityId).ilike('medication_name', q).limit(5),
        supabase.from('calendar_events').select('id, title, event_date').eq('community_id', communityId).ilike('title', q).order('event_date').limit(5),
      ])
      setResults({
        residents: resRes.data ?? [],
        medications: medRes.data ?? [],
        events: evtRes.data ?? [],
      })
      setLoading(false)
    }, 200)

    return () => clearTimeout(timerRef.current)
  }, [query, communityId])

  function handleSelect(path) {
    setQuery('')
    setOpen(false)
    navigate(path)
  }

  const total = results
    ? results.residents.length + results.medications.length + results.events.length
    : 0

  // Switch to light mode when the input is active so results are readable
  const light = true // navbar is always light (white bg)

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <SearchIcon light={light} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); query.length >= 2 && setOpen(true) }}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur() } }}
          placeholder="Search residents, medications, events…"
          className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border transition-colors focus:outline-none bg-[#F3F8FD] text-slate-800 placeholder:text-slate-400 border-slate-200 focus:border-[#185FA5] focus:bg-white"
          style={{ boxShadow: 'none' }}
          onFocus={e => { e.currentTarget.style.boxShadow = 'var(--haven-shadow-focus)' }}
          onBlurCapture={e => { e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden max-h-96 overflow-y-auto">
          {loading && <p className="text-sm text-slate-400 px-4 py-3">Searching…</p>}

          {!loading && total === 0 && (
            <p className="text-sm text-slate-400 px-4 py-3">No results for "{query}"</p>
          )}

          {!loading && total > 0 && (
            <>
              {results.residents.length > 0 && (
                <Section label="Residents">
                  {results.residents.map(r => (
                    <ResultItem
                      key={r.id}
                      primary={r.full_name}
                      secondary={r.room_number ? `Room ${r.room_number}` : null}
                      onClick={() => handleSelect(`/residents/${r.id}`)}
                    />
                  ))}
                </Section>
              )}
              {results.medications.length > 0 && (
                <Section label="Medications">
                  {results.medications.map(m => (
                    <ResultItem
                      key={m.id}
                      primary={m.medication_name}
                      secondary={m.residents?.full_name}
                      onClick={() => handleSelect(`/residents/${m.residents?.id}`)}
                    />
                  ))}
                </Section>
              )}
              {results.events.length > 0 && (
                <Section label="Calendar Events">
                  {results.events.map(e => (
                    <ResultItem
                      key={e.id}
                      primary={e.title}
                      secondary={formatDate(e.event_date)}
                      onClick={() => handleSelect('/calendar')}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
