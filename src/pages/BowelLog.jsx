import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/layout/Layout'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import { localDateStr } from '../lib/dateUtils'
import ResidentAvatar from '../components/residents/ResidentAvatar'

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

function residentName(r) {
  return r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Resident'
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return localDateStr(dt)
}
function fmtLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function LogModal({ resident, period, date, communityId, onClose, onSaved }) {
  const { profile } = useProfile()
  const [form, setForm] = useState({ bristol_type: '', size: '', continence: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const hour = period === 'AM' ? 8 : 20
    const [y, m, d] = date.split('-').map(Number)
    const occurred = new Date(y, m - 1, d, hour, 0, 0)
    const { data: { session } } = await supabase.auth.getSession()
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : ''
    const { data, error: err } = await supabase.from('bowel_movements').insert({
      resident_id: resident.id,
      community_id: communityId,
      occurred_at: occurred.toISOString(),
      period,
      bristol_type: form.bristol_type !== '' ? Number(form.bristol_type) : null,
      size: form.size || null,
      continence: form.continence || null,
      notes: form.notes.trim() || null,
      recorded_by: session?.user?.id ?? null,
      recorded_by_name: authorName || null,
    }).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Log Bowel Movement</h2>
            <p className="text-xs text-slate-400">{residentName(resident)} · {period} · {fmtLong(date)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bristol Stool Type</label>
            <select value={form.bristol_type} onChange={e => setForm(f => ({ ...f, bristol_type: e.target.value }))} className={inputCls}>
              <option value="">— Not recorded —</option>
              {BRISTOL.map(b => <option key={b.v} value={b.v}>{b.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Size</label>
              <select value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className={inputCls}>
                <option value="">—</option>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Continence</label>
              <select value={form.continence} onChange={e => setForm(f => ({ ...f, continence: e.target.value }))} className={inputCls}>
                <option value="">—</option>
                {CONTINENCE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} placeholder="Blood, color, pain, observations…" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PeriodCell({ entries, onAdd }) {
  return (
    <div className="flex-1 min-w-0">
      {entries.length === 0 ? (
        <button onClick={onAdd} className="w-full text-xs text-[#185FA5] hover:text-[#0C447C] border border-dashed border-slate-300 hover:border-[#185FA5] rounded-lg py-2 transition-colors">
          + Log
        </button>
      ) : (
        <div className="space-y-1">
          {entries.map(e => (
            <div key={e.id} className="text-xs bg-slate-50 rounded-lg px-2 py-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {e.bristol_type && <span className="font-semibold text-[#185FA5]">Type {e.bristol_type}</span>}
                {e.size && <span className="text-slate-500">{e.size}</span>}
                {e.continence && <span className="text-slate-500">· {e.continence}</span>}
                <span className="text-slate-400 ml-auto">{fmtTime(e.occurred_at)}</span>
              </div>
              {e.notes && <p className="text-slate-500 mt-0.5">{e.notes}</p>}
            </div>
          ))}
          <button onClick={onAdd} className="text-[11px] text-[#185FA5] hover:text-[#0C447C] px-1">+ Add another</button>
        </div>
      )}
    </div>
  )
}

export default function BowelLog() {
  const { communityId } = useCommunity()
  const [date, setDate] = useState(() => localDateStr())
  const [residents, setResidents] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [logFor, setLogFor] = useState(null) // { resident, period }

  const load = useCallback(async () => {
    if (!communityId) return
    setLoading(true)
    const [y, m, d] = date.split('-').map(Number)
    const from = new Date(y, m - 1, d, 0, 0, 0)
    const to = new Date(y, m - 1, d, 23, 59, 59)
    const [{ data: res }, { data: bm }] = await Promise.all([
      supabase.from('residents')
        .select('id, first_name, last_name, full_name, room_number, color, avatar_url')
        .eq('community_id', communityId).eq('status', 'active')
        .order('last_name', { ascending: true }),
      supabase.from('bowel_movements')
        .select('*')
        .eq('community_id', communityId)
        .gte('occurred_at', from.toISOString())
        .lte('occurred_at', to.toISOString())
        .order('occurred_at', { ascending: true }),
    ])
    setResidents(res ?? [])
    setEntries(bm ?? [])
    setLoading(false)
  }, [communityId, date])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const byResident = {}
  for (const e of entries) {
    const dt = new Date(e.occurred_at)
    const period = e.period || (dt.getHours() < 12 ? 'AM' : 'PM')
    ;(byResident[e.resident_id] = byResident[e.resident_id] || { AM: [], PM: [] })[period].push(e)
  }

  const isToday = date === localDateStr()
  const loggedCount = entries.length

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Bowel Log</h1>
            <p className="text-sm text-slate-400">{fmtLong(date)}{isToday && ' · Today'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(d => addDays(d, -1))} className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg">←</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]" />
            <button onClick={() => setDate(d => addDays(d, 1))} className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg">→</button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : residents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <p className="text-slate-500 text-sm font-medium">No active residents</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-2">{loggedCount} bowel movement{loggedCount !== 1 ? 's' : ''} logged on this day</p>
            {/* Header row (desktop) */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              <div className="w-56">Resident</div>
              <div className="flex-1">AM</div>
              <div className="flex-1">PM</div>
            </div>
            <div className="space-y-2">
              {residents.map(r => {
                const buckets = byResident[r.id] || { AM: [], PM: [] }
                return (
                  <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-center gap-2.5 w-full sm:w-56 flex-shrink-0">
                      <ResidentAvatar resident={r} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{residentName(r)}</p>
                        {r.room_number && <p className="text-xs text-slate-400">Room {r.room_number}</p>}
                      </div>
                    </div>
                    <div className="flex gap-3 flex-1">
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase sm:hidden mb-1">AM</p>
                        <PeriodCell entries={buckets.AM} onAdd={() => setLogFor({ resident: r, period: 'AM' })} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase sm:hidden mb-1">PM</p>
                        <PeriodCell entries={buckets.PM} onAdd={() => setLogFor({ resident: r, period: 'PM' })} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {logFor && (
        <LogModal
          resident={logFor.resident}
          period={logFor.period}
          date={date}
          communityId={communityId}
          onClose={() => setLogFor(null)}
          onSaved={(entry) => { setEntries(prev => [...prev, entry]); setLogFor(null) }}
        />
      )}
    </Layout>
  )
}
