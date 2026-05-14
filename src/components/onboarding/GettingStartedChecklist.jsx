import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ITEMS = [
  {
    key: 'hasResidents',
    label: 'Add your first resident',
    sub: 'Build your resident roster',
    link: '/dashboard',
    linkLabel: 'Go to Residents',
  },
  {
    key: 'hasMeds',
    label: 'Set up medications',
    sub: 'Add medications to a resident profile',
    link: '/residents',
    linkLabel: 'View Residents',
  },
  {
    key: 'hasNotes',
    label: 'Log your first shift note',
    sub: 'Start the team communication log',
    link: '/shift-log',
    linkLabel: 'Go to Shift Log',
  },
  {
    key: 'hasVitals',
    label: 'Record vital signs',
    sub: "Track a resident's health readings",
    link: '/vitals',
    linkLabel: 'Go to Vitals',
  },
  {
    key: 'hasStaff',
    label: 'Invite a staff member',
    sub: 'Bring your team into Haven',
    link: '/staff',
    linkLabel: 'Go to Staff',
  },
]

export default function GettingStartedChecklist({ communityId }) {
  const storageKey = `haven_checklist_dismissed_${communityId}`

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === '1'
  )
  const [progress, setProgress] = useState({
    hasResidents: false,
    hasMeds: false,
    hasNotes: false,
    hasVitals: false,
    hasStaff: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (dismissed || !communityId) return

    async function checkProgress() {
      setLoading(true)
      const [
        { count: resCount },
        { count: medCount },
        { count: noteCount },
        { count: vitalCount },
        { data: members },
      ] = await Promise.all([
        supabase
          .from('residents')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId)
          .eq('status', 'active'),
        supabase
          .from('medications')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId),
        supabase
          .from('shift_notes')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId),
        supabase
          .from('vital_signs')
          .select('id', { count: 'exact', head: true })
          .eq('community_id', communityId),
        supabase
          .from('community_members')
          .select('user_id, role')
          .eq('community_id', communityId),
      ])

      setProgress({
        hasResidents: (resCount ?? 0) > 0,
        hasMeds: (medCount ?? 0) > 0,
        hasNotes: (noteCount ?? 0) > 0,
        hasVitals: (vitalCount ?? 0) > 0,
        hasStaff: (members ?? []).filter(m => m.role === 'staff').length > 0,
      })
      setLoading(false)
    }

    checkProgress()
  }, [communityId, dismissed])

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  const completedCount = ITEMS.filter(item => progress[item.key]).length
  const allDone = completedCount === 5

  return (
    <div className="bg-white border border-[#185FA5]/20 rounded-2xl overflow-hidden mb-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#042C53] to-[#185FA5] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm">Getting Started</span>
          <span className="text-white/60 text-xs">{completedCount} of 5 complete</span>
        </div>
        <button
          onClick={dismiss}
          className="text-white/40 hover:text-white text-lg leading-none transition-colors"
          aria-label="Dismiss checklist"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[#185FA5]/20">
        <div
          className="h-full bg-[#185FA5] rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / 5) * 100}%` }}
        />
      </div>

      {/* All done state */}
      {!loading && allDone ? (
        <div className="flex flex-col items-center py-6 px-5 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">🎉 Setup complete!</h3>
          <p className="text-sm text-slate-500 mb-4">
            Your community is fully configured and ready for daily operations.
          </p>
          <button
            onClick={dismiss}
            className="text-sm font-semibold text-[#185FA5] hover:text-[#0C447C] transition-colors"
          >
            Dismiss
          </button>
        </div>
      ) : (
        /* Checklist items */
        <div className="divide-y divide-slate-100">
          {ITEMS.map(item => {
            const done = progress[item.key]
            return (
              <div key={item.key} className="flex items-center gap-3 px-5 py-3">
                {/* Circle icon */}
                {done ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : loading ? (
                  <div className="w-6 h-6 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}

                {/* Label + sub */}
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    <>
                      <p
                        className={`text-sm font-medium ${
                          done ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        {item.label}
                      </p>
                      {!done && (
                        <p className="text-xs text-slate-400">{item.sub}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Link (only if not done and not loading) */}
                {!done && !loading && (
                  <Link
                    to={item.link}
                    className="text-xs text-[#185FA5] font-semibold hover:text-[#0C447C] whitespace-nowrap flex-shrink-0 transition-colors"
                  >
                    {item.linkLabel} →
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
