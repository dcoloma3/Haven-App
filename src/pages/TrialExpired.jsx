import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'

export default function TrialExpired() {
  const { community } = useCommunity()
  const { profile } = useProfile()

  const subject = encodeURIComponent(`I'd Love to Keep Going! — ${community?.name || 'My Community'}`)
  const body = encodeURIComponent(
    `Hey Haven! 👋\n\nMy free trial for ${community?.name || 'my community'} just wrapped up and I have to say — I really loved it! I'd love to keep the momentum going and learn more about what a full subscription looks like for us.\n\nPlease reach out whenever you get a chance. Excited to continue!\n\n— ${profile?.full_name || ''}`
  )
  const mailtoLink = `mailto:support@haven.care?subject=${subject}&body=${body}`

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">

        {/* Haven logo mark */}
        <div className="w-16 h-16 bg-[#E6F1FB] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="35" viewBox="0 0 24 30" fill="none" aria-hidden="true">
            <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="#185FA5" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
            <rect x="4" y="20" width="5" height="8" fill="#185FA5" rx="0.5" />
            <rect x="13" y="18" width="5" height="5" stroke="#185FA5" strokeWidth="1.5" fill="none" rx="0.5" />
            <line x1="12" y1="3" x2="12" y2="6" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="1.5" r="1.5" fill="#378ADD" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">Your trial has ended 🎉</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We hope you loved your 14 days with Haven! Your data is safe and sound.
          Reach out and we'll get you set up on the perfect plan — usually takes less than a day.
        </p>

        {/* Primary CTA — email */}
        <a
          href={mailtoLink}
          className="flex items-center justify-center gap-2 w-full bg-[#042C53] hover:bg-[#0B3D6E] text-white font-medium py-3 rounded-xl text-sm transition-colors mb-3"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Email us to continue →
        </a>

        {/* Phone */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.58 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span className="text-sm text-slate-500">Or call us: </span>
          <span className="text-sm font-semibold text-slate-700">+1 (XXX) XXX-XXXX</span>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400 mb-3">support@haven.care · app.haven.care</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
