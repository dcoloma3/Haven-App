/*
-- Run in Supabase SQL editor:
create table billing_records (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade,
  created_by_name text,
  created_at timestamptz default now(),
  billing_month text not null,
  base_rate numeric(10,2) not null default 0,
  level_of_care_charge numeric(10,2) not null default 0,
  medication_management_fee numeric(10,2) not null default 0,
  ancillary_charges numeric(10,2) not null default 0,
  ancillary_description text,
  total_amount numeric(10,2) not null default 0,
  status text not null default 'draft',
  notes text
);
create index on billing_records(community_id, billing_month desc);
create index on billing_records(resident_id, billing_month desc);
alter table billing_records enable row level security;
create policy "community admins can manage billing" on billing_records
  for all using (community_id in (select community_id from community_members where user_id = auth.uid() and role = 'admin'));
*/

/*
-- Run in Supabase SQL editor to add new community columns used by Occupancy and Billing:
alter table communities add column if not exists total_beds integer;
alter table communities add column if not exists default_monthly_rate numeric(10,2);
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
}

export default function Billing() {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [residents, setResidents] = useState([])
  const [billingMap, setBillingMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [generating, setGenerating] = useState(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(null)

  async function load() {
    const [{ data: res }, { data: bills }] = await Promise.all([
      supabase.from('residents').select('id, first_name, last_name, room_number').eq('community_id', communityId).eq('status', 'active').order('last_name'),
      supabase.from('billing_records').select('*').eq('community_id', communityId).eq('billing_month', month),
    ])
    setResidents(res || [])
    const map = {}
    for (const b of (bills || [])) map[b.resident_id] = b
    setBillingMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId, month]) // eslint-disable-line

  async function generateStatement(resident) {
    setGenerating(resident.id)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    await supabase.from('billing_records').insert({
      community_id: communityId,
      resident_id: resident.id,
      created_by_name: authorName,
      billing_month: month,
      base_rate: 0,
      level_of_care_charge: 0,
      medication_management_fee: 0,
      ancillary_charges: 0,
      total_amount: 0,
      status: 'draft',
    })
    setGenerating(null)
    await load()
  }

  async function bulkGenerate() {
    const missing = residents.filter(r => !billingMap[r.id])
    if (missing.length === 0) { alert('All residents already have a statement for this month.'); return }
    const confirmed = window.confirm(`Generate draft statements for all ${missing.length} resident${missing.length !== 1 ? 's' : ''} who don't have a statement for ${month}?`)
    if (!confirmed) return
    setBulkGenerating(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const inserts = missing.map(r => ({
      community_id: communityId,
      resident_id: r.id,
      created_by_name: authorName,
      billing_month: month,
      base_rate: 0,
      level_of_care_charge: 0,
      medication_management_fee: 0,
      ancillary_charges: 0,
      total_amount: 0,
      status: 'draft',
    }))
    const { error } = await supabase.from('billing_records').insert(inserts)
    if (error) { console.error(error); alert('Bulk generate failed. Please try again.') }
    setBulkGenerating(false)
    await load()
  }

  async function updateStatus(billId, status) {
    setUpdatingStatus(billId)
    await supabase.from('billing_records').update({ status }).eq('id', billId)
    setUpdatingStatus(null)
    await load()
  }

  // Totals: sent + paid + overdue count as billed; outstanding = sent + overdue
  const totalBilled = Object.values(billingMap)
    .filter(b => b.status === 'sent' || b.status === 'paid' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)
  const totalPaid = Object.values(billingMap)
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)
  const totalOutstanding = Object.values(billingMap)
    .filter(b => b.status === 'sent' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.total_amount), 0)
  const draftCount = Object.values(billingMap).filter(b => b.status === 'draft').length

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Billing</h1>
        <p className="text-sm text-slate-500 mt-1">Monthly billing statements</p>
      </div>

      {/* Month picker + Bulk Generate */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <label className="text-sm font-medium text-slate-600">Month:</label>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
        />
        {isAdmin && !loading && (
          <button
            onClick={bulkGenerate}
            disabled={bulkGenerating}
            className="ml-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {bulkGenerating ? 'Generating…' : 'Bulk Generate'}
          </button>
        )}
      </div>

      {/* Summary stats — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Total Billed</p>
          <p className="text-lg font-bold text-slate-800">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Collected</p>
          <p className="text-lg font-bold text-emerald-600">${totalPaid.toFixed(2)}</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${totalOutstanding > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-xs mb-1 ${totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Outstanding</p>
          <p className={`text-lg font-bold ${totalOutstanding > 0 ? 'text-amber-700' : 'text-slate-800'}`}>${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Draft</p>
          <p className="text-lg font-bold text-slate-600">{draftCount}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {residents.map(r => {
                const bill = billingMap[r.id]
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/residents/${r.id}`)} className="text-[#185FA5] hover:text-[#0C447C] font-medium transition-colors">
                        {r.first_name} {r.last_name}
                      </button>
                      <p className="text-xs text-slate-400">Room {r.room_number || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {bill ? `$${Number(bill.total_amount).toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {bill ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[bill.status] || STATUS_COLORS.draft}`}>{bill.status}</span>
                      ) : (
                        <span className="text-xs text-slate-300">No statement</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!bill ? (
                        <button
                          onClick={() => generateStatement(r)}
                          disabled={generating === r.id}
                          className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors disabled:opacity-50"
                        >
                          {generating === r.id ? 'Generating…' : 'Generate'}
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {bill.status === 'draft' && (
                            <button
                              onClick={() => updateStatus(bill.id, 'sent')}
                              disabled={updatingStatus === bill.id}
                              className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Mark Sent
                            </button>
                          )}
                          {bill.status === 'sent' && (
                            <>
                              <button
                                onClick={() => updateStatus(bill.id, 'paid')}
                                disabled={updatingStatus === bill.id}
                                className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => updateStatus(bill.id, 'overdue')}
                                disabled={updatingStatus === bill.id}
                                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Overdue
                              </button>
                            </>
                          )}
                          {bill.status === 'overdue' && (
                            <button
                              onClick={() => updateStatus(bill.id, 'paid')}
                              disabled={updatingStatus === bill.id}
                              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Mark Paid
                            </button>
                          )}
                          {bill.status === 'paid' && (
                            <span className="text-xs text-emerald-600 font-medium">✓ Paid</span>
                          )}
                          <button onClick={() => navigate(`/residents/${r.id}`, { state: { openTab: 'Billing' } })} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                            Detail
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {residents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">No active residents</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Status legend — outside overflow container so it's always visible */}
      {!loading && (
        <p className="text-xs text-slate-400 mt-3">
          <span className="font-medium text-slate-500">Status:</span>{' '}
          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Draft</span> = created, not sent &nbsp;·&nbsp;
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Sent</span> = invoice delivered &nbsp;·&nbsp;
          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Paid</span> = payment received &nbsp;·&nbsp;
          <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">Overdue</span> = payment past due
        </p>
      )}
    </Layout>
  )
}
