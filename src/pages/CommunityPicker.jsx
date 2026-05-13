import { useCommunity } from '../context/CommunityContext'
import HavenLogo from '../components/layout/HavenLogo'
import { supabase } from '../lib/supabase'

export default function CommunityPicker() {
  const { memberships, setCommunityId } = useCommunity()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8">
        <div className="mb-6">
          <HavenLogo />
        </div>

        <h1 className="text-xl font-semibold text-slate-800 mb-1">Select a Community</h1>
        <p className="text-sm text-slate-500 mb-6">You have access to multiple communities. Choose one to continue.</p>

        <div className="space-y-3">
          {memberships.map(m => (
            <button
              key={m.communities.id}
              onClick={() => setCommunityId(m.communities.id)}
              className="w-full text-left border border-slate-200 rounded-xl px-5 py-4 hover:border-[#185FA5] hover:bg-[#E6F1FB]/30 transition-all group"
            >
              <p className="font-medium text-slate-800 group-hover:text-[#185FA5]">{m.communities.name}</p>
              {m.communities.address && (
                <p className="text-xs text-slate-400 mt-0.5">{m.communities.address}</p>
              )}
              <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                m.role === 'admin' ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {m.role === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full mt-6 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
