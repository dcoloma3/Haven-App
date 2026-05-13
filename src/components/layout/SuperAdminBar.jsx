import { Link } from 'react-router-dom'
import { useCommunity } from '../../context/CommunityContext'

export default function SuperAdminBar() {
  const { isSuperAdmin, community, communityId, editMode, setEditMode, setCommunityId } = useCommunity()

  if (!isSuperAdmin || !communityId) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#042C53] border-t-2 border-amber-400 px-4 py-2.5 flex items-center gap-4">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="bg-amber-400 text-[#042C53] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Super Admin
        </span>
        <span className="text-white/80 text-sm truncate max-w-[200px]">
          {community?.name ?? 'Community'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto flex-shrink-0">
        {/* Edit mode toggle */}
        <span className="text-white/60 text-xs">Edit Mode</span>
        <button
          onClick={() => setEditMode(m => !m)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editMode ? 'bg-amber-400' : 'bg-white/20'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editMode ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
        <span className={`text-xs font-medium ${editMode ? 'text-amber-400' : 'text-white/40'}`}>
          {editMode ? 'On' : 'Off'}
        </span>

        <div className="w-px h-4 bg-white/20 mx-1" />

        <button
          onClick={() => { setCommunityId(null); setEditMode(false) }}
          className="text-xs text-white/70 hover:text-white transition-colors"
        >
          ← Exit to Super Admin
        </button>
      </div>
    </div>
  )
}
