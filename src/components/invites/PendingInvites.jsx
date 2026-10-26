import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

// Shows any pending community invites addressed to the signed-in user (even
// for communities they aren't a member of yet) and lets them accept inline —
// so an existing user who's invited doesn't get sent to the sign-up page.
export default function PendingInvites() {
  const { reload, setCommunityId } = useCommunity()
  const { profile } = useProfile()
  const [invites, setInvites] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_my_pending_invites').then(({ data }) => {
      if (!cancelled) setInvites(data ?? [])
    })
    return () => { cancelled = true }
  }, [])

  async function accept(inv) {
    setBusyId(inv.invite_id)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setBusyId(null); setError('Please sign in again.'); return }
    const fullName = profile?.full_name
      || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      || session.user.email
    const { error: err } = await supabase.rpc('accept_invite', {
      p_invite_id: inv.invite_id,
      p_user_id: session.user.id,
      p_full_name: fullName,
      p_email: session.user.email,
    })
    setBusyId(null)
    if (err) { setError(err.message); return }
    setInvites(prev => prev.filter(i => i.invite_id !== inv.invite_id))
    await reload()
    setCommunityId(inv.community_id)
  }

  const visible = invites.filter(i => !dismissed.has(i.invite_id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {visible.map(inv => (
        <div key={inv.invite_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#E6F1FB] border border-[#185FA5]/25 rounded-xl px-4 py-3">
          <div className="text-sm text-slate-800">
            <span className="font-semibold">You've been invited to join {inv.community_name}</span>
            <span className="text-slate-500"> as {inv.role === 'admin' ? 'Manager' : 'Staff'}.</span>
            {error && busyId === null && <span className="block text-xs text-red-600 mt-1">{error}</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setDismissed(prev => new Set(prev).add(inv.invite_id))}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5"
            >
              Not now
            </button>
            <button
              onClick={() => accept(inv)}
              disabled={busyId === inv.invite_id}
              className="text-xs bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-1.5 transition-colors"
            >
              {busyId === inv.invite_id ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
