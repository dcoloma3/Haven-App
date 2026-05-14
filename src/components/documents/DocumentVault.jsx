/*
-- Run in Supabase SQL editor:
-- Also create a storage bucket named "resident-documents" with public = false
create table resident_documents (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  file_name text not null,
  file_url text not null,
  file_size bigint,
  file_type text,
  category text not null default 'Other',
  notes text
);
create index on resident_documents(resident_id, created_at desc);
alter table resident_documents enable row level security;
create policy "community members can manage documents" on resident_documents
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const CATEGORIES = ['DNR', 'POA', 'Insurance', 'Physician Orders', 'Lab Results', 'Advance Directive', 'ID', 'Other']

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }) {
  const isPdf = type?.includes('pdf')
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
      {isPdf ? (
        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )}
    </div>
  )
}

export default function DocumentVault({ residentId, resident }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('Other')
  const [notes, setNotes] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchDocuments() {
    const { data } = await supabase
      .from('resident_documents')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
    setDocuments(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchDocuments() }, [residentId]) // eslint-disable-line

  async function handleUpload() {
    if (!selectedFile) return
    setUploading(true)
    try {
      const timestamp = Date.now()
      const path = `${communityId}/${residentId}/${timestamp}_${selectedFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('resident-documents')
        .upload(path, selectedFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('resident-documents').getPublicUrl(path)

      const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
      await supabase.from('resident_documents').insert({
        community_id: communityId,
        resident_id: residentId,
        created_by_name: authorName,
        file_name: selectedFile.name,
        file_url: publicUrl,
        file_size: selectedFile.size,
        file_type: selectedFile.type,
        category,
        notes: notes.trim() || null,
      })
      setSelectedFile(null)
      setCategory('Other')
      setNotes('')
      setShowUploadForm(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchDocuments()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(doc) {
    setDeleting(true)
    try {
      // Extract path from URL
      const url = new URL(doc.file_url)
      const pathParts = url.pathname.split('/resident-documents/')
      if (pathParts[1]) {
        await supabase.storage.from('resident-documents').remove([pathParts[1]])
      }
      await supabase.from('resident_documents').delete().eq('id', doc.id)
      setDeleteConfirm(null)
      await fetchDocuments()
    } catch (err) {
      alert('Delete failed: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const docs = documents.filter(d => d.category === cat)
    if (docs.length) acc[cat] = docs
    return acc
  }, {})

  if (loading) return <p className="text-slate-400 text-sm">Loading documents…</p>

  return (
    <div className="space-y-5">
      {/* Upload Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Document Vault</h3>
        <button
          onClick={() => setShowUploadForm(v => !v)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">New Document</h4>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File <span className="text-red-500">*</span></label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={e => setSelectedFile(e.target.files[0] || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className={inputCls + ' resize-none'}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
            >Cancel</button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Documents grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No documents uploaded yet</p>
          <p className="text-slate-400 text-xs mt-1">Upload PDFs or images to keep resident documents organized</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, docs]) => (
          <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cat}</h4>
            </div>
            <div className="divide-y divide-slate-100">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <FileIcon type={doc.file_type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString()}
                      {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                      {doc.created_by_name ? ` · ${doc.created_by_name}` : ''}
                    </p>
                    {doc.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{doc.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#185FA5] hover:text-[#0C447C] text-xs font-medium transition-colors"
                    >
                      Open
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm(doc)}
                        className="text-red-400 hover:text-red-600 transition-colors ml-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">Delete Document</h3>
            <p className="text-sm text-slate-500 mb-5">Are you sure you want to delete <strong>{deleteConfirm.file_name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
