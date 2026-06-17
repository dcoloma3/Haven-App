import { useEffect, useRef, useState } from 'react'
import {
  getActiveCaregiver, setActiveCaregiver, loadCaregiverRoster, initialsFromName,
} from '../../lib/administering'

// "Administering as: [Name] ▾" — sticky selector for the Dispense tab.
// Lets whoever is doing the med pass on a shared device pick their name once.
// Sources: staff accounts (passed in) + caregiver roster + a one-off typed name.
export default function AdministeringBar({ communityId, accounts, currentUser, onChange }) {
  const [roster, setRoster] = useState([])
  const [active, setActive] = useState(null)
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const wrapRef = useRef(null)

  // Load roster (resilient — [] before migration)
  useEffect(() => {
    let alive = true
    loadCaregiverRoster(communityId).then(r => { if (alive) setRoster(r) })
    return () => { alive = false }
  }, [communityId])

  // Initialise the active caregiver: saved choice, else the logged-in user.
  useEffect(() => {
    if (!communityId) return
    const saved = getActiveCaregiver(communityId)
    const initial = saved || (currentUser?.name ? { caregiverId: null, name: currentUser.name } : null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(initial)
    onChange?.(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, currentUser?.name])

  // Close the menu on outside click
  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Combined, de-duplicated option list (by lowercased name)
  const candidates = [
    ...(currentUser?.name ? [{ caregiverId: null, name: currentUser.name }] : []),
    ...(accounts ?? []).map(a => ({ caregiverId: null, name: a.name })),
    ...roster.map(r => ({ caregiverId: r.id, name: r.name })),
  ]
  const seenNames = new Set()
  const options = candidates.filter(c => {
    const k = (c.name || '').trim().toLowerCase()
    if (!k || seenNames.has(k)) return false
    seenNames.add(k)
    return true
  }).map(c => ({ caregiverId: c.caregiverId, name: c.name.trim() }))

  function choose(opt) {
    setActive(opt)
    setActiveCaregiver(communityId, opt)
    onChange?.(opt)
    setOpen(false)
    setTyped('')
  }

  function chooseTyped() {
    const name = typed.trim()
    if (!name) return
    choose({ caregiverId: null, name })
  }

  const label = active?.name || 'Select caregiver'

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2 bg-[#185FA5]/5 border border-[#185FA5]/20 rounded-xl px-3 py-2">
        <span className="text-xs font-medium text-slate-500">Administering as</span>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-[#185FA5] transition-colors"
        >
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#185FA5] text-white text-[10px] font-bold">
            {initialsFromName(label)}
          </span>
          {label}
          <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-80 overflow-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400">No caregivers yet — add them in Staff Directory.</div>
          )}
          {options.map(opt => {
            const isActive = active && opt.name.toLowerCase() === active.name.toLowerCase()
            return (
              <button
                key={(opt.caregiverId || 'acct') + opt.name}
                type="button"
                onClick={() => choose(opt)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 ${isActive ? 'bg-[#185FA5]/5' : ''}`}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
                  {initialsFromName(opt.name)}
                </span>
                <span className="flex-1 text-slate-700">{opt.name}</span>
                {opt.caregiverId && <span className="text-[10px] text-slate-400">roster</span>}
                {isActive && (
                  <svg className="w-4 h-4 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            )
          })}
          <div className="border-t border-slate-100 mt-1 pt-1 px-2 pb-1">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 px-1 pb-1">One-time name</div>
            <div className="flex gap-1.5">
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') chooseTyped() }}
                placeholder="Type a name…"
                className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
              <button
                type="button"
                onClick={chooseTyped}
                disabled={!typed.trim()}
                className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-40 text-white text-xs font-semibold px-3 rounded-lg"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
