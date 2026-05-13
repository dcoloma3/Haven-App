import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PhotoSourcePicker from '../ui/PhotoSourcePicker'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function getPublicUrl(path) {
  return supabase.storage.from('resident-photos').getPublicUrl(path).data.publicUrl
}

// ─── Note entry modal (shown after picking a photo) ───────────────────────────

function NoteModal({ file, onSave, onCancel, saving }) {
  const [note, setNote] = useState('')
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Photo preview */}
        {preview && (
          <img src={preview} alt="Preview" className="w-full max-h-56 object-cover" />
        )}

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Add a note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Family visit, therapy session, outing to the park…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(note.trim())}
              disabled={saving}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2 text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Add Photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photo, onClose, onDelete }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none transition-colors"
      >
        ×
      </button>

      <div className="flex flex-col items-center gap-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <img
          src={getPublicUrl(photo.storage_path)}
          alt={photo.file_name}
          className="max-w-full max-h-[65vh] object-contain rounded-xl"
        />

        <div className="text-center">
          <p className="text-white/60 text-sm">{formatDate(photo.uploaded_at)}</p>
          {photo.notes && (
            <p className="text-white text-sm mt-1.5 max-w-md">{photo.notes}</p>
          )}
        </div>

        <button
          onClick={() => onDelete(photo)}
          className="text-red-400 hover:text-red-300 text-sm transition-colors"
        >
          Delete photo
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PhotoGallery({ residentId }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingFile, setPendingFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  useEffect(() => {
    supabase
      .from('resident_photos')
      .select('*')
      .eq('resident_id', residentId)
      .order('uploaded_at', { ascending: false })
      .then(({ data }) => { setPhotos(data ?? []); setLoading(false) })
  }, [residentId])

  // Step 1: file selected → show note modal
  function handleFile(file) {
    setError('')
    setPendingFile(file)
  }

  // Step 2: user confirms note → upload + save
  async function handleSave(note) {
    if (!pendingFile) return
    setSaving(true)

    const ext = pendingFile.name.split('.').pop().toLowerCase() || 'jpg'
    const path = `${residentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('resident-photos')
      .upload(path, pendingFile)

    if (uploadErr) {
      setError('Upload failed. Please try again.')
      setSaving(false)
      setPendingFile(null)
      return
    }

    const { data, error: dbErr } = await supabase
      .from('resident_photos')
      .insert([{
        resident_id: residentId,
        storage_path: path,
        file_name: pendingFile.name,
        notes: note || null,
      }])
      .select()
      .single()

    setSaving(false)
    setPendingFile(null)
    if (!dbErr && data) setPhotos(prev => [data, ...prev])
  }

  async function handleDelete(photo, e) {
    e?.stopPropagation()
    await supabase.storage.from('resident-photos').remove([photo.storage_path])
    await supabase.from('resident_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    if (lightboxPhoto?.id === photo.id) setLightboxPhoto(null)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-800">Photos</h2>

        <PhotoSourcePicker onFile={handleFile} menuAlign="right">
          {({ openMenu }) => (
            <button
              onClick={openMenu}
              className="flex items-center gap-2 bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Add Photo
            </button>
          )}
        </PhotoSourcePicker>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && photos.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <p className="text-sm font-medium text-slate-500">No photos yet</p>
          <p className="text-xs mt-1">Tap "Add Photo" to get started.</p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative">

              {/* Photo tile */}
              <button
                onClick={() => setLightboxPhoto(photo)}
                className="block w-full rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#185FA5] relative"
              >
                <img
                  src={getPublicUrl(photo.storage_path)}
                  alt={photo.file_name}
                  className="w-full aspect-square object-cover transition-opacity group-hover:opacity-80"
                  loading="lazy"
                />

                {/* Hover overlay — shows date + note */}
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 text-left">
                  <p className="text-white text-xs font-semibold leading-tight">{formatDate(photo.uploaded_at)}</p>
                  {photo.notes && (
                    <p className="text-white/80 text-xs mt-1 leading-tight line-clamp-3">{photo.notes}</p>
                  )}
                </div>
              </button>

              {/* Delete button (top-right, appears on hover) */}
              <button
                onClick={e => handleDelete(photo, e)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-sm leading-none z-10"
                title="Delete photo"
              >
                ×
              </button>

              {/* Note indicator dot */}
              {photo.notes && (
                <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-white/80" title="Has note" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note modal — shown after picking a photo */}
      {pendingFile && (
        <NoteModal
          file={pendingFile}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setPendingFile(null)}
        />
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          onClose={() => setLightboxPhoto(null)}
          onDelete={(photo) => { handleDelete(photo); setLightboxPhoto(null) }}
        />
      )}
    </div>
  )
}
