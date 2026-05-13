import { useRef, useState } from 'react'

function CameraIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function ViewIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Wraps a trigger element and shows a "Take Photo / Choose from Library" menu.
 *
 * Usage:
 *   <PhotoSourcePicker onFile={file => ...} menuAlign="left">
 *     {({ openMenu }) => <button onClick={openMenu}>Upload</button>}
 *   </PhotoSourcePicker>
 *
 * menuAlign: "left" (menu left-aligns with trigger) | "right" (right-aligns)
 */
export default function PhotoSourcePicker({ onFile, onView, children, menuAlign = 'left' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cameraRef = useRef(null)
  const libraryRef = useRef(null)

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  function pick(ref) {
    setMenuOpen(false)
    // Brief delay lets the backdrop unmount before the native picker opens,
    // avoiding focus conflicts on some mobile browsers.
    setTimeout(() => ref.current?.click(), 50)
  }

  const alignClass = menuAlign === 'right' ? 'right-0' : 'left-0'

  return (
    <div className="relative inline-block">
      {children({ openMenu: () => setMenuOpen(true) })}

      {menuOpen && (
        <>
          {/* Backdrop — closes menu on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />

          {/* Menu */}
          <div className={`absolute ${alignClass} top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden w-52`}>
            {onView && (
              <>
                <button
                  onClick={() => { setMenuOpen(false); onView() }}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                >
                  <ViewIcon />
                  View Photo
                </button>
                <div className="border-t border-slate-100" />
              </>
            )}
            <button
              onClick={() => pick(cameraRef)}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <CameraIcon />
              Take Photo
            </button>
            <div className="border-t border-slate-100" />
            <button
              onClick={() => pick(libraryRef)}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <LibraryIcon />
              Choose from Library
            </button>
          </div>
        </>
      )}

      {/* Camera input — capture="environment" triggers rear camera on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {/* Library input — opens file picker / photo library */}
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
