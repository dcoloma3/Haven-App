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

function UploadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

export default function PhotoGallery({ residentId }) {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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

  async function handleFile(file) {
    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop().toLowerCase() || 'jpg'
    const path = `${residentId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('resident-photos')
      .upload(path, file)

    if (uploadErr) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      return
    }

    const { data, error: dbErr } = await supabase
      .from('resident_photos')
      .insert([{ resident_id: residentId, storage_path: path, file_name: file.name }])
      .select()
      .single()

    setUploading(false)
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
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium text-slate-700">Photos</h2>

        <PhotoSourcePicker onFile={handleFile} menuAlign="right">
          {({ openMenu }) => (
            <button
              onClick={() => !uploading && openMenu()}
              disabled={uploading}
              className="flex items-center gap-2 text-sm text-[#185FA5] hover:text-[#0C447C] disabled:opacity-50 transition-colors"
            >
              <UploadIcon />
              {uploading ? 'Uploading…' : '+ Upload Photo'}
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
          <p className="text-sm">No photos yet.</p>
          <p className="text-xs mt-1">Upload photos to share with family members.</p>
        </div>
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="group relative">
              <button
                onClick={() => setLightboxPhoto(photo)}
                className="block w-full rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
              >
                <img
                  src={getPublicUrl(photo.storage_path)}
                  alt={photo.file_name}
                  className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
              </button>
              <p className="text-xs text-slate-400 mt-1.5 truncate">{formatDate(photo.uploaded_at)}</p>

              <button
                onClick={e => handleDelete(photo, e)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white text-sm leading-none"
                title="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none transition-colors"
          >
            ×
          </button>
          <img
            src={getPublicUrl(lightboxPhoto.storage_path)}
            alt={lightboxPhoto.file_name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white/60 text-sm">{formatDate(lightboxPhoto.uploaded_at)}</p>
            <button
              onClick={e => handleDelete(lightboxPhoto, e)}
              className="mt-2 text-red-400 hover:text-red-300 text-sm transition-colors"
            >
              Delete photo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
