/*
-- Run in Supabase SQL editor:
create table adl_records (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  recorded_by_name text,
  created_at timestamptz default now(),
  recorded_date date not null,
  bathing text,
  dressing text,
  eating text,
  mobility text,
  continence text,
  toileting text,
  grooming text,
  notes text
);
create unique index on adl_records(resident_id, recorded_date);
alter table adl_records enable row level security;
create policy "community members can manage adl records" on adl_records
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const ADL_CATEGORIES = ['bathing', 'dressing', 'eating', 'mobility', 'continence', 'toileting', 'grooming']
const ADL_LABELS = {
  bathing: 'Bathing',
  dressing: 'Dressing',
  eating: 'Eating',
  mobility: 'Mobility',
  continence: 'Continence',
  toileting: 'Toileting',
  grooming: 'Grooming',
}

const LEVEL_OPTIONS = [
  { value: 'Independent', label: 'Independent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'Assisted', label: 'Assisted', color: 'bg-amber-100 text-amber-700 border-amber-200', active: 'bg-amber-500 text-white border-amber-500' },
  { value: 'Dependent', label: 'Dependent', color: 'bg-red-100 text-red-700 border-red-200', active: 'bg-red-500 text-white border-red-500' },
]

function levelColor(val) {
  if (val === 'Independent') return 'bg-emerald-100 text-emerald-700'
  if (val === 'Assisted') return 'bg-amber-100 text-amber-700'
  if (val === 'Dependent') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-500'
}

function getYesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function ADLTracker({ residentId, resident }) {
  const { communityId } = useCommunity()
  const { profile } = useProfile()
  const [today] = useState(new Date().toISOString().split('T')[0])
  const [todayRecord, setTodayRecord] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: '' }), { notes: '' }))

  // Back-entry state
  const [showBackEntry, setShowBackEntry] = useState(false)
  const [backDate, setBackDate] = useState(getYesterday())
  const [backRecord, setBackRecord] = useState(null) // existing record for back date if any
  const [backCheckDone, setBackCheckDone] = useState(false)
  const [editingBack, setEditingBack] = useState(false)
  const [backForm, setBackForm] = useState(ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: '' }), { notes: '' }))
  const [savingBack, setSavingBack] = useState(false)

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchData() {
    const { data: all } = await supabase
      .from('adl_records')
      .select('*')
      .eq('resident_id', residentId)
      .order('recorded_date', { ascending: false })
      .limit(30)

    const todayRec = (all || []).find(r => r.recorded_date === today)
    setTodayRecord(todayRec || null)
    setHistory((all || []).filter(r => r.recorded_date !== today))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [residentId]) // eslint-disable-line

  function startLog() {
    const base = ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: todayRecord?.[c] || '' }), {})
    setForm({ ...base, notes: todayRecord?.notes || '' })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      recorded_by_name: authorName,
      recorded_date: today,
      notes: form.notes.trim() || null,
      ...ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: form[c] || null }), {}),
    }
    let error
    if (todayRecord) {
      ;({ error } = await supabase.from('adl_records').update(payload).eq('id', todayRecord.id))
    } else {
      ;({ error } = await supabase.from('adl_records').insert(payload))
    }
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setEditing(false)
    await fetchData()
  }

  // ── Back-entry logic ──────────────────────────────────────────────────────────

  async function handleCheckBackDate() {
    setBackCheckDone(false)
    setBackRecord(null)
    setEditingBack(false)
    const { data } = await supabase
      .from('adl_records')
      .select('*')
      .eq('resident_id', residentId)
      .eq('recorded_date', backDate)
      .maybeSingle()
    setBackRecord(data || null)
    setBackCheckDone(true)
    if (!data) {
      // No existing record — open blank form
      setBackForm(ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: '' }), { notes: '' }))
      setEditingBack(true)
    }
  }

  function loadBackForEdit() {
    setBackForm({
      ...ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: backRecord?.[c] || '' }), {}),
      notes: backRecord?.notes || '',
    })
    setEditingBack(true)
  }

  async function handleSaveBack() {
    setSavingBack(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      recorded_by_name: authorName,
      recorded_date: backDate,
      notes: backForm.notes.trim() || null,
      ...ADL_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: backForm[c] || null }), {}),
    }
    let error
    if (backRecord) {
      ;({ error } = await supabase.from('adl_records').update(payload).eq('id', backRecord.id))
    } else {
      ;({ error } = await supabase.from('adl_records').insert(payload))
    }
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setSavingBack(false)
      return
    }
    setSavingBack(false)
    setShowBackEntry(false)
    setBackCheckDone(false)
    setBackRecord(null)
    setEditingBack(false)
    await fetchData()
  }

  function cancelBackEntry() {
    setShowBackEntry(false)
    setBackCheckDone(false)
    setBackRecord(null)
    setEditingBack(false)
    setBackDate(getYesterday())
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading ADLs…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-700">Activities of Daily Living</h3>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={startLog} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
              {todayRecord ? "Edit Today's ADLs" : "Log Today's ADLs"}
            </button>
          )}
          {!editing && (
            <button
              onClick={() => { setShowBackEntry(true); setBackCheckDone(false); setEditingBack(false); setBackRecord(null) }}
              className="border border-slate-300 text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Log Past Day
            </button>
          )}
        </div>
      </div>

      {/* Back-entry panel */}
      {showBackEntry && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">Log ADLs for a Past Day</h4>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Select Date</label>
              <input
                type="date"
                max={getYesterday()}
                value={backDate}
                onChange={e => { setBackDate(e.target.value); setBackCheckDone(false); setEditingBack(false); setBackRecord(null) }}
                className={inputCls}
              />
            </div>
            <button
              onClick={handleCheckBackDate}
              className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Check Date
            </button>
          </div>

          {backCheckDone && backRecord && !editingBack && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-amber-800 font-medium">A record exists for {new Date(backDate + 'T00:00:00').toLocaleDateString()}. Edit it instead?</p>
              <button
                onClick={loadBackForEdit}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Edit Record
              </button>
            </div>
          )}

          {editingBack && (
            <>
              <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{new Date(backDate + 'T00:00:00').toLocaleDateString()}</h5>
              {ADL_CATEGORIES.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-medium text-slate-600 mb-1.5">{ADL_LABELS[cat]}</p>
                  <div className="flex gap-2">
                    {LEVEL_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setBackForm(f => ({ ...f, [cat]: f[cat] === opt.value ? '' : opt.value }))}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${backForm[cat] === opt.value ? opt.active : opt.color}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Session Notes</label>
                <textarea
                  value={backForm.notes}
                  onChange={e => setBackForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className={inputCls + ' resize-none'}
                  placeholder="Optional notes…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={cancelBackEntry} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSaveBack} disabled={savingBack} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {savingBack ? 'Saving…' : 'Save Past ADLs'}
                </button>
              </div>
            </>
          )}

          {!editingBack && (
            <div className="flex gap-3 pt-1">
              <button onClick={cancelBackEntry} className="border border-slate-300 text-slate-700 rounded-xl px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Today's record or form */}
      {editing ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-700 text-sm">Today — {new Date().toLocaleDateString()}</h4>
          {ADL_CATEGORIES.map(cat => (
            <div key={cat}>
              <p className="text-xs font-medium text-slate-600 mb-1.5">{ADL_LABELS[cat]}</p>
              <div className="flex gap-2">
                {LEVEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, [cat]: f[cat] === opt.value ? '' : opt.value }))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${form[cat] === opt.value ? opt.active : opt.color}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Session Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditing(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
              {saving ? 'Saving…' : 'Save ADLs'}
            </button>
          </div>
        </div>
      ) : todayRecord ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Today — {new Date().toLocaleDateString()}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ADL_CATEGORIES.map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-16">{ADL_LABELS[cat]}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${levelColor(todayRecord[cat])}`}>
                  {todayRecord[cat] || '—'}
                </span>
              </div>
            ))}
          </div>
          {todayRecord.notes && <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">{todayRecord.notes}</p>}
          {todayRecord.recorded_by_name && <p className="text-xs text-slate-400 mt-2">Recorded by {todayRecord.recorded_by_name}</p>}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-sm font-medium">No ADLs logged today</p>
          <p className="text-slate-400 text-xs mt-1">Tap "Log Today's ADLs" to record</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent History</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map(r => (
              <div key={r.id} className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">{new Date(r.recorded_date + 'T00:00:00').toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-2">
                  {ADL_CATEGORIES.map(cat => r[cat] && (
                    <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor(r[cat])}`}>
                      {ADL_LABELS[cat]}: {r[cat]}
                    </span>
                  ))}
                </div>
                {r.notes && <p className="text-xs text-slate-400 mt-2 italic">{r.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!todayRecord && history.length === 0 && !editing && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center text-center">
          <p className="text-slate-500 text-sm font-medium">No ADL records yet</p>
          <p className="text-slate-400 text-xs mt-1">Start logging daily activities for this resident</p>
        </div>
      )}
    </div>
  )
}
