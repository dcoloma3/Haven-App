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

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchData() {
    const { data: all } = await supabase
      .from('adl_records')
      .select('*')
      .eq('resident_id', residentId)
      .order('recorded_date', { ascending: false })
      .limit(11)

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
    if (todayRecord) {
      await supabase.from('adl_records').update(payload).eq('id', todayRecord.id)
    } else {
      await supabase.from('adl_records').insert(payload)
    }
    setSaving(false)
    setEditing(false)
    await fetchData()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading ADLs…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Activities of Daily Living</h3>
        {!editing && (
          <button onClick={startLog} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            {todayRecord ? 'Edit Today\'s ADLs' : 'Log Today\'s ADLs'}
          </button>
        )}
      </div>

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
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
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
