import { useState } from 'react'

const SLIDES = [
  {
    icon: (
      <div className="w-16 h-16 bg-[#E6F1FB] rounded-2xl flex items-center justify-center text-4xl">
        🏠
      </div>
    ),
    title: 'Welcome to Haven',
    body: "You're moving to a modern, all-in-one care management platform. Whether you're coming from paper records or another system, we'll have you up and running today.",
    note: null,
  },
  {
    icon: (
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      </div>
    ),
    title: 'Start with your residents',
    body: 'Add each resident\'s profile — name, room, physician, and care level. Everything else in Haven (medications, vitals, incidents) connects back here.',
    note: '💡 Tip: Work through your existing roster one at a time. Most teams finish their full resident list in under an hour.',
  },
  {
    icon: (
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 1-2-2V9m6 5h4"/>
        </svg>
      </div>
    ),
    title: 'Replace your paper MAR',
    body: 'Set up each resident\'s medications once. Every day, the Dispense screen shows exactly what needs to be given and when — one tap marks it done and it\'s logged forever.',
    note: '💡 Haven replaces paper Medication Administration Records with a timestamped digital log — visible to your whole team instantly.',
  },
  {
    icon: (
      <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
    ),
    title: 'Bring your whole team in',
    body: 'Staff log in separately and only see what they need for their shift — Dispense, Vitals, Shift Log. Admins see everything. You can also enable Google or Apple sign-in.',
    note: '💡 Invite your team from Facility Settings → Staff. They\'ll get an email to set up their account.',
  },
  {
    icon: (
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    ),
    title: "You're all set!",
    body: "We've set up a quick checklist on your dashboard to guide your first steps. Most care teams are fully up and running within an afternoon.",
    note: null,
  },
]

export default function WelcomeModal({ userId, onDone }) {
  const storageKey = `haven_welcome_done_${userId}`
  const [done, setDone] = useState(() => localStorage.getItem(storageKey) === '1')
  const [slide, setSlide] = useState(0)
  const [fading, setFading] = useState(false)

  if (done) return null

  const isLast = slide === SLIDES.length - 1

  function markDone() {
    localStorage.setItem(storageKey, '1')
    setDone(true)
    onDone()
  }

  function advance() {
    if (!isLast) {
      setFading(true)
      setTimeout(() => {
        setSlide(s => s + 1)
        setFading(false)
      }, 150)
    } else {
      markDone()
    }
  }

  const current = SLIDES[slide]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Logo pill */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-[#185FA5] font-bold text-sm tracking-widest bg-[#E6F1FB] px-3 py-1 rounded-full">
            haven
          </span>
          {/* Skip button — only on slides 1–4 */}
          {!isLast && (
            <button
              onClick={markDone}
              className="text-slate-400 hover:text-slate-600 text-sm transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Slide content */}
        <div
          className="px-6 pt-6 pb-2 flex flex-col items-center text-center transition-opacity duration-200"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {/* Icon */}
          <div className="mb-5">{current.icon}</div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-800 mb-3">{current.title}</h2>

          {/* Body */}
          <p className="text-sm text-slate-500 leading-relaxed mb-4">{current.body}</p>

          {/* Note */}
          {current.note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 text-left w-full mb-2">
              {current.note}
            </div>
          )}
        </div>

        {/* Progress dots + button */}
        <div className="px-6 pb-6 pt-3 flex flex-col items-center gap-4">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === slide
                    ? 'w-5 h-2 bg-[#185FA5]'
                    : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Next / Start Setup button */}
          <button
            onClick={advance}
            className="w-full text-white font-semibold py-3 rounded-2xl text-sm transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)',
              boxShadow: '0 2px 12px rgba(24,95,165,0.4)',
            }}
          >
            {isLast ? 'Start Setup →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
