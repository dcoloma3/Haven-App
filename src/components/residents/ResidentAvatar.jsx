import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getColor } from '../../lib/colors'
import { ringBoxShadow } from '../../lib/medStatus'
import PhotoSourcePicker from '../ui/PhotoSourcePicker'

function CameraIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function getInitials(resident) {
  if (resident.first_name || resident.last_name) {
    return ((resident.first_name?.[0] ?? '') + (resident.last_name?.[0] ?? '')).toUpperCase()
  }
  return (resident.full_name || '').split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
}

function getDisplayName(resident) {
  const parts = [resident.first_name, resident.middle_name, resident.last_name].filter(Boolean)
  return parts.length ? parts.join(' ') : (resident.full_name || '')
}

export default function ResidentAvatar({ resident, onUpdate, medStatus }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [imgError, setImgError] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  const initials = getInitials(resident)

  const color = getColor(resident.color)

  async function handleFile(file) {
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
    const path = `${resident.id}/avatar.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('resident-avatars')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Upload failed')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('resident-avatars')
      .getPublicUrl(path)

    // Cache-bust so the updated photo loads immediately
    const urlWithBuster = `${publicUrl}?t=${Date.now()}`

    const { data, error: updateErr } = await supabase
      .from('residents')
      .update({ avatar_url: urlWithBuster })
      .eq('id', resident.id)
      .select()
      .single()

    setUploading(false)
    if (!updateErr && data) onUpdate(data)
  }

  const hasPhoto = resident.avatar_url && !imgError

  return (
    <div className="flex-shrink-0">
      <PhotoSourcePicker
        onFile={handleFile}
        onView={hasPhoto ? () => setViewOpen(true) : undefined}
        menuAlign="left"
      >
        {({ openMenu }) => (
          <button
            type="button"
            onClick={() => !uploading && openMenu()}
            className="relative group block w-16 h-16 rounded-full focus:outline-none"
            style={medStatus ? { boxShadow: ringBoxShadow(medStatus) } : undefined}
            title="Change photo"
          >
            {hasPhoto ? (
              <img
                src={resident.avatar_url}
                alt={getDisplayName(resident)}
                onError={() => setImgError(true)}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold"
                style={{ backgroundColor: color.chipBg, color: color.chipText }}
              >
                {uploading ? <span className="text-sm animate-pulse">…</span> : initials}
              </div>
            )}

            {!uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon />
              </div>
            )}
          </button>
        )}
      </PhotoSourcePicker>

      {error && <p className="text-xs text-red-500 mt-1 text-center">{error}</p>}

      {viewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setViewOpen(false)}
        >
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img
              src={resident.avatar_url}
              alt={getDisplayName(resident)}
              className="w-full rounded-2xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setViewOpen(false)}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none transition-colors"
              aria-label="Close"
            >
              &times;
            </button>
            <p className="text-center text-white text-sm mt-3 font-medium">{getDisplayName(resident)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
