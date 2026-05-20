import { useNavigate } from 'react-router-dom'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'

export default function TrialLockedFeature({ featureName = 'This feature' }) {
  const navigate = useNavigate()
  const { community } = useCommunity()
  const { profile } = useProfile()

  const subject = encodeURIComponent(`Full Access Inquiry — ${community?.name || 'My Community'}`)
  const body = encodeURIComponent(
    `Hey Haven! 👋\n\nI'm currently on a free trial for ${community?.name || 'my community'} and I'd love to unlock the full app! I'm especially interested in ${featureName}.\n\nCould you reach out to help me get set up? Looking forward to it!\n\n— ${profile?.full_name || ''}`
  )
  const mailtoLink = `mailto:support@havencare.app?subject=${subject}&body=${body}`

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-2">{featureName} isn't included in your trial</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-sm leading-relaxed">
        Upgrade to full access to unlock {featureName.toLowerCase()} and everything else Haven has to offer.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={mailtoLink}
          className="inline-flex items-center justify-center gap-2 bg-[#042C53] hover:bg-[#0B3D6E] text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-colors"
        >
          Get Full Access →
        </a>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 px-5 rounded-xl text-sm transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
