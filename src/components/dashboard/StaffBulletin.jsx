/**
 * StaffBulletin — displays the active community bulletin as a card.
 * Props:
 *   bulletin  – null | { id, title, message, posted_by, posted_at, updated_at }
 *   onClear   – () => void  — called when admin presses "Clear"
 *   onEdit    – () => void  — called when admin presses "Edit" (scrolls to settings form)
 *   isAdmin   – boolean
 */
export default function StaffBulletin({ bulletin, onClear, onEdit, isAdmin }) {
  if (!bulletin) return null

  function fmtPosted(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const postedTime = fmtPosted(bulletin.updated_at || bulletin.posted_at)

  return (
    <div className="bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-4 py-3 mb-4">
      <div className="flex items-start gap-3">
        {/* Megaphone icon */}
        <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
          <svg
            className="w-5 h-5 text-[#185FA5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#042C53] leading-tight">{bulletin.title}</p>
          <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{bulletin.message}</p>
          {postedTime && (
            <p className="text-xs text-slate-400 mt-1">Posted {postedTime}</p>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-medium text-[#185FA5] hover:text-[#0C447C] transition-colors px-2 py-1 rounded-lg hover:bg-[#185FA5]/10"
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
