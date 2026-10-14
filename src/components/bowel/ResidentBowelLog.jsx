import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'
import { generateBowelGridPDF } from '../../lib/bowelGridPDF'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const BRISTOL = [
  { v: 1, label: 'Type 1 — Separate hard lumps' },
  { v: 2, label: 'Type 2 — Lumpy, sausage-shaped' },
  { v: 3, label: 'Type 3 — Sausage with cracks' },
  { v: 4, label: 'Type 4 — Smooth, soft sausage (normal)' },
  { v: 5, label: 'Type 5 — Soft blobs, clear edges' },
  { v: 6, label: 'Type 6 — Mushy, ragged edges' },
  { v: 7, label: 'Type 7 — Watery, no solid pieces' },
]
const SIZES = ['Small', 'Medium', 'Large']
const CONTINENCE = ['Continent', 'Incontinent']

function nowLocalInput() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function isoToLocalInput(iso) {
  if (!iso) return nowLocalInput()
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function periodFor(localInput) {
  const h = new Date(localInput).getHours()
  return h < 12 ? 'AM' : 'PM'
}
function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function formatDateLong(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const EMPTY_FORM = { occurred_at: '', period: 'AM', bristol_type: '', size: '', continence: '', notes: '' }

export default function ResidentBowelLog({ residentId }) {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportMonth, setReportMonth] = useState(currentMonthStr())
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [generating, setGenerating] = useState(false)

  const [yearStr, monthStr] = reportMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const from = new Date(year, month - 1, 1, 0, 0, 0)
    const to = new Date(year, month, 0, 23, 59, 59)
    const { data } = await supabase
      .from('bowel_movements')
      .select('*')
      .eq('resident_id', residentId)
      .gte('occurred_at', from.toISOString())
      .lte('occurred_at', to.toISOString())
      .order('occurred_at', { ascending: false })
    setRecords(data ?? [])
    setLoading(false)
  }, [residentId, year, month])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords()
  }, [fetchRecords])

  function setField(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value }
      if (field === 'occurred_at') next.period = periodFor(value)
      return next
    })
  }

  function openNew() {
    const now = nowLocalInput()
    setEditRecord(null)
    setForm({ ...EMPTY_FORM, occurred_at: now, period: periodFor(now) })
    setSaveError('')
    setShowModal(true)
  }

  function openEdit(r) {
    setEditRecord(r)
    setForm({
      occurred_at: isoToLocalInput(r.occurred_at),
      period: r.period || 'AM',
      bristol_type: r.bristol_type ?? '',
      size: r.size ?? '',
      continence: r.continence ?? '',
      notes: r.notes ?? '',
    })
    setSaveError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditRecord(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.occurred_at) { setSaveError('Pick a date and time.'); return }
    setSaving(true)
    setSaveError('')
    const { data: { session } } = await supabase.auth.getSession()
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
    const payload = {
      resident_id: residentId,
      community_id: communityId,
      occurred_at: new Date(form.occurred_at).toISOString(),
      period: form.period,
      bristol_type: form.bristol_type !== '' ? Number(form.bristol_type) : null,
      size: form.size || null,
      continence: form.continence || null,
      notes: form.notes.trim() || null,
    }
    let error
    if (editRecord) {
      ;({ error } = await supabase.from('bowel_movements').update(payload).eq('id', editRecord.id))
    } else {
      ;({ error } = await supabase.from('bowel_movements').insert({
        ...payload,
        recorded_by: session?.user?.id ?? null,
        recorded_by_name: authorName || null,
      }))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    closeModal()
    fetchRecords()
  }

  async function handleDelete(r) {
    if (!window.confirm('Delete this bowel movement entry? This cannot be undone.')) return
    await supabase.from('bowel_movements').delete().eq('id', r.id)
    fetchRecords()
  }

  async function handleReport() {
    setGenerating(true)
    try {
      await generateBowelGridPDF({ residentId, communityId, month, year, supabase })
    } catch (err) {
      console.error('Bowel report error:', err)
    } finally {
      setGenerating(false)
    }
  }

  // Group by local date (desc)
  const groups = {}
  for (const r of records) {
    const d = new Date(r.occurred_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    ;(groups[key] = groups[key] || []).push(r)
  }
  const grouped = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-slate-700">Bowel Movements</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
          />
          <button
            onClick={handleReport}
            disabled={generating}
            className="border border-slate-300 text-slate-600 hover:text-[#185FA5] hover:border-[#185FA5] rounded-lg px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Monthly Report'}
          </button>
          <button
            onClick={openNew}
            className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Log BM
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm font-medium">No bowel movements logged this month</p>
          <p className="text-slate-400 text-xs mt-1">Use “Log BM” to add the first entry</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateStr, list]) => (
            <div key={dateStr}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{formatDateLong(dateStr)}</span>
                <div className="flex-1 border-t border-slate-100" />
                <span className="text-xs text-slate-400">{list.length} entr{list.length !== 1 ? 'ies' : 'y'}</span>
              </div>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {list.map(r => (
                  <div key={r.id} className="flex items-start justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.period === 'PM' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>{r.period}</span>
                        {r.bristol_type && <span className="text-[10px] font-semibold bg-[#E6F1FB] text-[#185FA5] px-1.5 py-0.5 rounded-full">Bristol {r.bristol_type}</span>}
                        {r.size && <span className="text-xs text-slate-500">{r.size}</span>}
                        {r.continence && <span className="text-xs text-slate-500">· {r.continence}</span>}
                      </div>
                      {r.notes && <p className="text-xs text-slate-500 mt-0.5">{r.notes}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatTime(r.occurred_at)}{r.recorded_by_name ? ` · ${r.recorded_by_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button onClick={() => openEdit(r)} className="text-[11px] text-[#185FA5] hover:text-[#0C447C] px-2 py-1 rounded-lg hover:bg-[#E6F1FB] transition-colors">Edit</button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(r)} className="text-[11px] text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editRecord ? 'Edit Bowel Movement' : 'Log Bowel Movement'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date & Time</label>
                  <input type="datetime-local" value={form.occurred_at} onChange={e => setField('occurred_at', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
                  <select value={form.period} onChange={e => setField('period', e.target.value)} className={inputCls}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Bristol Stool Type</label>
                <select value={form.bristol_type} onChange={e => setField('bristol_type', e.target.value)} className={inputCls}>
                  <option value="">— Not recorded —</option>
                  {BRISTOL.map(b => <option key={b.v} value={b.v}>{b.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Size / Amount</label>
                  <select value={form.size} onChange={e => setField('size', e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Continence</label>
                  <select value={form.continence} onChange={e => setField('continence', e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    {CONTINENCE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} className={`${inputCls} resize-none`} placeholder="Blood, color, pain, observations…" />
              </div>
              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {saving ? 'Saving…' : editRecord ? 'Save Changes' : 'Log Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
