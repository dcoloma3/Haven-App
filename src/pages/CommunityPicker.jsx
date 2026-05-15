import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommunity } from '../context/CommunityContext'
import HavenLogo from '../components/layout/HavenLogo'
import AppLoader from '../components/ui/AppLoader'
import { supabase } from '../lib/supabase'

function CommunityAvatar({ name }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')

  // Pick a consistent color based on first char
  const colors = [
    ['#E6F1FB', '#185FA5'],
    ['#F0FDF4', '#16A34A'],
    ['#FFF7ED', '#C2410C'],
    ['#F5F3FF', '#7C3AED'],
    ['#FFF1F2', '#BE123C'],
    ['#ECFEFF', '#0E7490'],
  ]
  const idx = name.charCodeAt(0) % colors.length
  const [bg, text] = colors[idx]

  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
      style={{ background: bg, color: text }}
    >
      {initials}
    </div>
  )
}

export default function CommunityPicker() {
  const { memberships, setCommunityId } = useCommunity()
  const navigate = useNavigate()
  const [navigating, setNavigating] = useState(false)

  function handleSelect(id) {
    setNavigating(true)
    setCommunityId(id)
    setTimeout(() => navigate('/dashboard', { replace: true }), 350)
  }

  if (navigating) return <AppLoader />

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <HavenLogo />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h1 className="text-lg font-bold text-slate-800">Choose a community</h1>
            <p className="text-sm text-slate-500 mt-0.5">Select which community you'd like to manage today.</p>
          </div>

          {memberships.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No communities yet</p>
              <p className="text-sm text-slate-400">
                Contact{' '}
                <a href="mailto:support@haven.care" className="text-[#185FA5] hover:underline">
                  support@haven.care
                </a>{' '}
                to get set up.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {memberships.map(m => (
                <button
                  key={m.communities.id}
                  onClick={() => handleSelect(m.communities.id)}
                  className="w-full text-left flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                >
                  <CommunityAvatar name={m.communities.name} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-[#185FA5] transition-colors">
                      {m.communities.name}
                    </p>
                    {m.communities.address && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{m.communities.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.role === 'admin'
                        ? 'bg-[#E6F1FB] text-[#185FA5]'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {m.role === 'admin' ? 'Manager' : 'Staff'}
                    </span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-[#185FA5] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-100">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
