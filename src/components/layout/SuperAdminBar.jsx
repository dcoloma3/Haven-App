import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

export default function SuperAdminBar() {
  const { isSuperAdmin, community, communityId, allCommunities, setCommunityId } = useCommunity()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  if (!isSuperAdmin || !communityId) return null

  function switchTo(id) {
    setMenuOpen(false)
    setCommunityId(id)
    navigate('/dashboard')
  }

  function exitToPanel() {
    setCommunityId(null)
    navigate('/superadmin')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#042C53] border-t-2 border-amber-400 px-4 py-2.5 flex items-center gap-3">

      {/* Badge */}
      <span className="bg-amber-400 text-[#042C53] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
        Owner
      </span>

      {/* Community switcher dropdown */}
      <div className="relative flex-1 min-w-0">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium transition-colors max-w-full"
        >
          <span className="truncate">{community?.name ?? 'Select Community'}</span>
          <svg className="w-3 h-3 flex-shrink-0 opacity-60" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 8L1 3h10z" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-xl border border-slate-200 w-64 max-h-80 overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Switch Community</p>
              </div>
              {allCommunities.map(c => (
                <button
                  key={c.id}
                  onClick={() => switchTo(c.id)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-2 ${
                    c.id === communityId
                      ? 'bg-[#E6F1FB] text-[#185FA5] font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === communityId && (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Exit button */}
      <button
        onClick={exitToPanel}
        className="flex-shrink-0 text-xs text-white/70 hover:text-white transition-colors border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg"
      >
        ← Owner Panel
      </button>
    </div>
  )
}
