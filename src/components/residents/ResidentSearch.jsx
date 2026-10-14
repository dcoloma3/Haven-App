import { useState, useEffect, useRef } from 'react'
import { searchResident } from '../../lib/residentSearch'

export default function ResidentSearch({ residentId, resident, onJump }) {
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const reqRef = useRef(0)

  // Debounced search — all state updates happen inside the async callback
  // (never synchronously within the effect body).
  useEffect(() => {
    const q = query.trim()
    const id = ++reqRef.current
    const t = setTimeout(async () => {
      if (q.length < 2) {
        if (id === reqRef.current) { setGroups([]); setLoading(false) }
        return
      }
      setLoading(true)
      const { groups } = await searchResident(residentId, q, resident)
      if (id === reqRef.current) { setGroups(groups); setLoading(false) }
    }, 200)
    return () => clearTimeout(t)
  }, [query, residentId, resident])

  // Close panel on outside click
  useEffect(() => {
    function onDoc(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const showPanel = open && query.trim().length >= 2

  function handleJump(tab) {
    onJump(tab)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={boxRef} className="relative mb-5">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search this resident — medications, MAR, bowel logs, vitals, incidents…"
          className="w-full border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute z-40 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400 px-4 py-4">Searching…</p>
          ) : total === 0 ? (
            <p className="text-sm text-slate-400 px-4 py-4">No matches for “{query.trim()}”.</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 px-4 pt-3 pb-1">{total} result{total !== 1 ? 's' : ''}</p>
              {groups.map(group => (
                <div key={group.category} className="px-2 pb-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide px-2 pt-2 pb-1">
                    {group.category} <span className="text-slate-300">· {group.items.length}</span>
                  </p>
                  {group.items.map((r, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleJump(r.tab)}
                      className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                        <p className="text-xs text-slate-500 truncate">{r.snippet}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {r.dateStr && <p className="text-[11px] text-slate-400">{r.dateStr}</p>}
                        <p className="text-[10px] text-[#185FA5]">Open {r.tab} →</p>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
