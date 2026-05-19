/*
-- Run in Supabase SQL editor:
create table staff_certifications (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  staff_profile_id uuid,
  staff_name text not null,
  created_at timestamptz default now(),
  cert_name text not null,
  issued_date date,
  expiry_date date,
  cert_number text,
  notes text,
  status text not null default 'valid'
);
create index on staff_certifications(community_id, expiry_date);
alter table staff_certifications enable row level security;
create policy "community admins can manage certs" on staff_certifications
  for all using (community_id in (select community_id from community_members where user_id = auth.uid() and role = 'admin'));
*/

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'

function computeStatus(expiry_date) {
  if (!expiry_date) return 'valid'
  const exp = new Date(expiry_date)
  const now = new Date()
  const diff = (exp - now) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 60) return 'expiring_soon'
  return 'valid'
}

const STATUS_COLORS = {
  expired: 'bg-red-100 text-red-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  valid: 'bg-emerald-100 text-emerald-700',
}

const STATUS_LABELS = {
  expired: 'Expired',
  expiring_soon: 'Expiring Soon',
  valid: 'Valid',
}

export default function Certifications() {
  const { communityId } = useCommunity()
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editCert, setEditCert] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [certError, setCertError] = useState('')
  const [form, setForm] = useState({ staff_name: '', cert_name: '', issued_date: '', expiry_date: '', cert_number: '', notes: '' })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function fetchCerts() {
    const { data } = await supabase
      .from('staff_certifications')
      .select('*')
      .eq('community_id', communityId)
      .order('expiry_date')
    setCerts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCerts() }, [communityId]) // eslint-disable-line

  const enriched = useMemo(() => certs.map(c => ({ ...c, computedStatus: computeStatus(c.expiry_date) })), [certs])

  const expired = enriched.filter(c => c.computedStatus === 'expired')
  const expiringSoon = enriched.filter(c => c.computedStatus === 'expiring_soon')

  const filtered = enriched.filter(c => {
    if (filter === 'expired' && c.computedStatus !== 'expired') return false
    if (filter === 'expiring_soon' && c.computedStatus !== 'expiring_soon') return false
    if (filter === 'valid' && c.computedStatus !== 'valid') return false
    if (search && !c.staff_name.toLowerCase().includes(search.toLowerCase()) && !c.cert_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by staff
  const grouped = filtered.reduce((acc, c) => {
    if (!acc[c.staff_name]) acc[c.staff_name] = []
    acc[c.staff_name].push(c)
    return acc
  }, {})

  function openAdd() {
    setEditCert(null)
    setForm({ staff_name: '', cert_name: '', issued_date: '', expiry_date: '', cert_number: '', notes: '' })
    setCertError('')
    setShowModal(true)
  }

  function openEdit(c) {
    setEditCert(c)
    setForm({ staff_name: c.staff_name, cert_name: c.cert_name, issued_date: c.issued_date || '', expiry_date: c.expiry_date || '', cert_number: c.cert_number || '', notes: c.notes || '' })
    setCertError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.staff_name.trim() || !form.cert_name.trim()) return
    setCertError('')
    setSaving(true)
    const payload = {
      community_id: communityId,
      staff_name: form.staff_name.trim(),
      cert_name: form.cert_name.trim(),
      issued_date: form.issued_date || null,
      expiry_date: form.expiry_date || null,
      cert_number: form.cert_number.trim() || null,
      notes: form.notes.trim() || null,
    }
    let error
    if (editCert) {
      ;({ error } = await supabase.from('staff_certifications').update(payload).eq('id', editCert.id))
    } else {
      ;({ error } = await supabase.from('staff_certifications').insert(payload))
    }
    if (error) {
      console.error(error)
      setCertError(error.message || 'Something went wrong.')
      setSaving(false)
      return
    }
    setSaving(false)
    setShowModal(false)
    await fetchCerts()
  }

  async function handleDelete(id) {
    setCertError('')
    const { error } = await supabase.from('staff_certifications').delete().eq('id', id).eq('community_id', communityId)
    if (error) {
      console.error(error)
      setCertError(error.message || 'Something went wrong.')
      return
    }
    setDeleteConfirm(null)
    await fetchCerts()
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Certifications</h1>
          <p className="text-sm text-slate-500 mt-1">Track licenses and certifications</p>
        </div>
        <button onClick={openAdd} className="self-start sm:self-auto whitespace-nowrap bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Certification
        </button>
      </div>

      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-semibold text-red-700">⚠ {expired.length} certification{expired.length > 1 ? 's' : ''} expired</p>
          <p className="text-xs text-red-500">{expired.map(c => `${c.staff_name} — ${c.cert_name}`).join(', ')}</p>
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm font-semibold text-amber-700">⏰ {expiringSoon.length} certification{expiringSoon.length > 1 ? 's' : ''} expiring within 60 days</p>
          <p className="text-xs text-amber-600">{expiringSoon.map(c => `${c.staff_name} — ${c.cert_name}`).join(', ')}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 overflow-x-auto flex-shrink-0">
          {[['all', 'All'], ['expired', 'Expired'], ['expiring_soon', 'Expiring Soon'], ['valid', 'Valid']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filter === val ? 'bg-[#185FA5] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{label}</button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff or cert name…"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#185FA5]"
        />
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">No certifications found</p>
          <button onClick={openAdd} className="mt-3 bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors">
            + Add Certification
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([staffName, staffCerts]) => (
            <div key={staffName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">{staffName}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {staffCerts.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-800">{c.cert_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.computedStatus]}`}>{STATUS_LABELS[c.computedStatus]}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                        {c.issued_date && <span>Issued: {new Date(c.issued_date + 'T00:00:00').toLocaleDateString()}</span>}
                        {c.expiry_date && <span>Expires: {new Date(c.expiry_date + 'T00:00:00').toLocaleDateString()}</span>}
                        {c.cert_number && <span>#{c.cert_number}</span>}
                      </div>
                      {c.notes && <p className="text-xs text-slate-400 mt-0.5">{c.notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors">Edit</button>
                      <button onClick={() => setDeleteConfirm(c)} className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editCert ? 'Edit Certification' : 'Add Certification'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Staff Name <span className="text-red-500">*</span></label>
                <input value={form.staff_name} onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))} className={inputCls} placeholder="Staff member's name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Certification Name <span className="text-red-500">*</span></label>
                <input value={form.cert_name} onChange={e => setForm(f => ({ ...f, cert_name: e.target.value }))} className={inputCls} placeholder="e.g. CPR, CNA License" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Issued Date</label>
                  <input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Certificate Number</label>
                <input value={form.cert_number} onChange={e => setForm(f => ({ ...f, cert_number: e.target.value }))} className={inputCls} placeholder="License or cert number" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4">
              {certError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{certError}</p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!form.staff_name.trim() || !form.cert_name.trim() || saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  {saving ? 'Saving…' : editCert ? 'Save Changes' : 'Add Certification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-2">Delete Certification</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteConfirm.cert_name}</strong> for {deleteConfirm.staff_name}?</p>
            {certError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{certError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setCertError('') }} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
