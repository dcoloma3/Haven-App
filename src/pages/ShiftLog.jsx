/*
-- Run in Supabase SQL editor:
create table shift_notes (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade nullable,
  author_name text,
  created_at timestamptz default now(),
  shift text not null,
  content text not null,
  is_pinned boolean not null default false
);
create index on shift_notes(community_id, created_at desc);
alter table shift_notes enable row level security;
create policy "community members can manage shift notes" on shift_notes
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'
import { localDateStr } from '../lib/dateUtils'

const SHIFT_COLORS = {
  Morning: 'bg-amber-100 text-amber-700',
  Afternoon: 'bg-blue-100 text-blue-700',
  Evening: 'bg-indigo-100 text-indigo-700',
}

function currentShift() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Morning'
  if (h >= 14 && h < 22) return 'Afternoon'
  return 'Evening'
}

export default function ShiftLog() {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [residents, setResidents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (location.state?.quickAdd) setShowModal(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [saving, setSaving] = useState(false)
  const [filterShift, setFilterShift] = useState('All')
  const [filterDate, setFilterDate] = useState(localDateStr())
  const [form, setForm] = useState({ shift: currentShift(), content: '', resident_id: '', is_pinned: false })
  const [residentSearch, setResidentSearch] = useState('')

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchNotes() {
    let query = supabase
      .from('shift_notes')
      .select('*, residents(id, first_name, last_name, room_number)')
      .eq('community_id', communityId)

    if (filterDate) {
      const start = filterDate + 'T00:00:00'
      const end = filterDate + 'T23:59:59'
      query = query.gte('created_at', start).lte('created_at', end)
    }
    if (filterShift !== 'All') query = query.eq('shift', filterShift)

    const { data } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.from('residents').select('id, first_name, last_name').eq('community_id', communityId).eq('status', 'active').order('last_name')
      .then(({ data }) => setResidents(data || []))
  }, [communityId])

  useEffect(() => { fetchNotes() }, [communityId, filterShift, filterDate]) // eslint-disable-line

  async function handleSave() {
    if (!form.content.trim()) return
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    await supabase.from('shift_notes').insert({
      community_id: communityId,
      resident_id: form.resident_id || null,
      author_name: authorName,
      shift: form.shift,
      content: form.content.trim(),
      is_pinned: isAdmin ? form.is_pinned : false,
    })
    setSaving(false)
    setShowModal(false)
    setForm({ shift: currentShift(), content: '', resident_id: '', is_pinned: false })
    setResidentSearch('')
    await fetchNotes()
  }

  async function togglePin(note) {
    await supabase.from('shift_notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id).eq('community_id', communityId)
    await fetchNotes()
  }

  async function handleDelete(id) {
    await supabase.from('shift_notes').delete().eq('id', id).eq('community_id', communityId)
    await fetchNotes()
  }

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(4, 44, 83) // #042C53
    doc.text('Shift Log Report', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    const dateLabel = filterDate || 'All dates'
    const shiftLabel = filterShift === 'All' ? 'All shifts' : filterShift
    doc.text(`Date: ${dateLabel}  |  Shift: ${shiftLabel}`, 14, 29)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35)

    autoTable(doc, {
      startY: 42,
      head: [['Shift', 'Author', 'Resident', 'Note', 'Time']],
      body: notes.map(n => [
        n.shift,
        n.author_name || 'Staff',
        n.residents ? `${n.residents.first_name} ${n.residents.last_name} (Rm ${n.residents.room_number})` : '—',
        n.content,
        new Date(n.created_at).toLocaleString(),
      ]),
      headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      // Columns total 182mm — exact fit for A4 with 14mm margins each side
      columnStyles: {
        0: { cellWidth: 20 },  // Shift
        1: { cellWidth: 26 },  // Author
        2: { cellWidth: 36 },  // Resident
        3: { cellWidth: 70 },  // Note (largest, wraps naturally)
        4: { cellWidth: 30 },  // Time
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    })

    const filename = `shift-log-${dateLabel.replace(/\//g, '-')}.pdf`
    doc.save(filename)
  }

  const filteredResidents = residents.filter(r =>
    residentSearch === '' ||
    `${r.first_name} ${r.last_name}`.toLowerCase().includes(residentSearch.toLowerCase())
  )

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shift Log</h1>
          <p className="text-sm text-slate-500 mt-1">Team communications and handoff notes</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {notes.length > 0 && (
            <button
              onClick={exportPDF}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
              title="Export to PDF"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Export PDF
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Note
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* Shift filter */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-shrink-0">
          {['All', 'Morning', 'Afternoon', 'Evening'].map(s => (
            <button
              key={s}
              onClick={() => setFilterShift(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterShift === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Date: Today shortcut + date picker */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          <button
            onClick={() => setFilterDate(localDateStr())}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${filterDate === localDateStr() ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Today
          </button>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : notes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm font-medium">No shift notes for this date</p>
          <p className="text-slate-400 text-xs mt-1">Add the first note for this shift</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className={`bg-white border rounded-2xl p-4 ${note.is_pinned ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SHIFT_COLORS[note.shift] || 'bg-slate-100 text-slate-600'}`}>
                      {note.shift}
                    </span>
                    {note.is_pinned && (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        📌 Pinned
                      </span>
                    )}
                    {note.residents && (
                      <button
                        onClick={() => navigate(`/residents/${note.residents.id}`)}
                        className="text-xs text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors"
                      >
                        {note.residents.first_name} {note.residents.last_name} (Rm {note.residents.room_number})
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-line">{note.content}</p>
                  <p className="text-xs text-slate-400 mt-2">{note.author_name || 'Staff'} · {new Date(note.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {isAdmin && (
                    <button onClick={() => togglePin(note)} className={`text-xs p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${note.is_pinned ? 'text-amber-500 hover:text-amber-700 bg-amber-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}`} title={note.is_pinned ? 'Unpin' : 'Pin'}>
                      📌
                    </button>
                  )}
                  {(isAdmin) && (
                    <button onClick={() => setDeleteConfirmId(note.id)} className="text-slate-300 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-50 min-w-[36px] min-h-[36px] flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Note Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">New Shift Note</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Shift <span className="text-red-500">*</span></label>
                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))} className={inputCls}>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Note <span className="text-red-500">*</span></label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5} className={inputCls + ' resize-none'} placeholder="Write your shift note…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tag Resident (optional)</label>
                <input
                  type="text"
                  value={residentSearch}
                  onChange={e => { setResidentSearch(e.target.value); if (!e.target.value) setForm(f => ({ ...f, resident_id: '' })) }}
                  placeholder="Search resident name…"
                  className={inputCls}
                />
                {residentSearch && filteredResidents.length > 0 && (
                  <div className="mt-1 border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden max-h-40 overflow-y-auto">
                    {filteredResidents.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setForm(f => ({ ...f, resident_id: r.id })); setResidentSearch(`${r.first_name} ${r.last_name}`) }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        {r.first_name} {r.last_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="pin" checked={form.is_pinned} onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))} className="rounded" />
                  <label htmlFor="pin" className="text-sm text-slate-700">Pin this note</label>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={!form.content.trim() || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : 'Post Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">Delete this note?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null) }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
