/*
-- Run in Supabase SQL editor:
create table vital_signs (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  recorded_by_name text,
  created_at timestamptz default now(),
  recorded_at timestamptz not null default now(),
  systolic integer,
  diastolic integer,
  pulse integer,
  temperature numeric(4,1),
  oxygen_saturation integer,
  weight numeric(5,1),
  notes text
);
create index on vital_signs(resident_id, recorded_at desc);
alter table vital_signs enable row level security;
create policy "community members can manage vitals" on vital_signs
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'

function isOutOfRange(field, value) {
  if (value == null || value === '') return false
  const v = Number(value)
  if (field === 'systolic') return v > 140 || v < 90
  if (field === 'diastolic') return v > 90 || v < 60
  if (field === 'pulse') return v > 100 || v < 60
  if (field === 'oxygen_saturation') return v < 95
  if (field === 'temperature') return v > 99.5 || v < 97.0
  return false
}

function anyOutOfRange(record) {
  return ['systolic', 'diastolic', 'pulse', 'oxygen_saturation', 'temperature'].some(f => isOutOfRange(f, record[f]))
}

export default function VitalSigns() {
  const { communityId } = useCommunity()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      // Get all active residents
      const { data: residents } = await supabase
        .from('residents')
        .select('id, first_name, last_name, room_number')
        .eq('community_id', communityId)
        .eq('status', 'active')
        .order('last_name')

      // Get latest vital per resident
      const { data: vitals } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('community_id', communityId)
        .order('recorded_at', { ascending: false })

      // Build map: resident_id -> latest vital
      const vitalMap = {}
      for (const v of (vitals || [])) {
        if (!vitalMap[v.resident_id]) vitalMap[v.resident_id] = v
      }

      const combined = (residents || []).map(r => ({
        resident: r,
        vital: vitalMap[r.id] || null,
      }))
      setRows(combined)
      setLoading(false)
    }
    load()
  }, [communityId])

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const filtered = rows.filter(({ vital }) => {
    if (filter === 'today') return vital && vital.recorded_at?.startsWith(today)
    if (filter === 'week') return vital && vital.recorded_at >= weekAgo
    return true
  })

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vital Signs</h1>
        <p className="text-sm text-slate-500 mt-1">Latest reading per resident</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {[['all', 'All'], ['today', 'Today'], ['week', 'This Week']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === val ? 'bg-[#185FA5] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">BP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pulse</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Temp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">O2%</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(({ resident, vital }) => (
                <tr key={resident.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/residents/${resident.id}`)}
                      className="text-[#185FA5] hover:text-[#0C447C] font-medium text-left transition-colors"
                    >
                      {resident.first_name} {resident.last_name}
                    </button>
                    <p className="text-xs text-slate-400">Room {resident.room_number || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {vital?.systolic && vital?.diastolic
                      ? <span className={isOutOfRange('systolic', vital.systolic) || isOutOfRange('diastolic', vital.diastolic) ? 'text-red-600 font-semibold' : ''}>{vital.systolic}/{vital.diastolic}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.pulse != null
                      ? <span className={isOutOfRange('pulse', vital.pulse) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.pulse}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.temperature != null
                      ? <span className={isOutOfRange('temperature', vital.temperature) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.temperature}°F</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital?.oxygen_saturation != null
                      ? <span className={isOutOfRange('oxygen_saturation', vital.oxygen_saturation) ? 'text-red-600 font-semibold' : 'text-slate-700'}>{vital.oxygen_saturation}%</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {vital ? new Date(vital.recorded_at).toLocaleDateString() : <span className="text-slate-300">No data</span>}
                  </td>
                  <td className="px-4 py-3">
                    {vital && anyOutOfRange(vital) && (
                      <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">⚠ Alert</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No data for selected filter</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
