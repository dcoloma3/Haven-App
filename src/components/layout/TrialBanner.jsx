import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

export default function TrialBanner() {
  const { community } = useCommunity()
  const { profile } = useProfile()

  if (community?.plan !== 'trial' || !community?.trial_end_date) return null

  const now = new Date()
  const trialEnd = new Date(community.trial_end_date)
  const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return null // expired — handled by TrialExpired lock screen

  const isUrgent  = daysLeft <= 2
  const isWarning = daysLeft > 2 && daysLeft <= 5

  const subject = encodeURIComponent(`Full Access Inquiry — ${community.name}`)
  const body = encodeURIComponent(
    `Hey Haven! 👋\n\nMy free trial for ${community.name} is coming to an end and I'm really enjoying it so far! I'd love to learn more about getting full access and finding the right plan for my community.\n\nFeel free to reach out anytime — looking forward to connecting!\n\n— ${profile?.full_name || ''}`
  )
  const mailtoLink = `mailto:support@havencare.app?subject=${subject}&body=${body}`

  const colors = isUrgent
    ? { bar: 'bg-red-600',   text: 'text-white',           badge: 'bg-red-800 text-red-100',    btn: 'bg-white text-red-700 hover:bg-red-50' }
    : isWarning
    ? { bar: 'bg-amber-500', text: 'text-white',           badge: 'bg-amber-700 text-amber-100', btn: 'bg-white text-amber-700 hover:bg-amber-50' }
    : { bar: 'bg-[#042C53]', text: 'text-white/90',        badge: 'bg-white/15 text-white',      btn: 'bg-white text-[#042C53] hover:bg-white/90' }

  const message = daysLeft === 1
    ? 'Trial ending tomorrow!'
    : `Trial ending in ${daysLeft} days`

  return (
    <div className={`fixed top-[61px] left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-2 ${colors.bar}`}>
      <div className={`flex items-center gap-2 min-w-0 text-sm ${colors.text}`}>
        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${colors.badge}`}>
          Free Trial
        </span>
        <span className="truncate font-medium">{message}</span>
      </div>
      <a
        href={mailtoLink}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${colors.btn}`}
      >
        Get Full Access →
      </a>
    </div>
  )
}
