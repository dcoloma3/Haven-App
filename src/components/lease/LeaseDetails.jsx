import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  )
}

export default function LeaseDetails({ residentId }) {
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ monthly_rate: '', start_date: '', end_date: '', security_deposit: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('lease_terms')
      .select('*')
      .eq('resident_id', residentId)
      .maybeSingle()
      .then(({ data }) => { setLease(data); setLoading(false) })
  }, [residentId])

  function startEdit() {
    setForm({
      monthly_rate: lease?.monthly_rate ?? '',
      start_date: lease?.start_date ?? '',
      end_date: lease?.end_date ?? '',
      security_deposit: lease?.security_deposit ?? '',
    })
    setError('')
    setEditing(true)
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after start date.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      resident_id: residentId,
      monthly_rate: form.monthly_rate !== '' ? Number(form.monthly_rate) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      security_deposit: form.security_deposit !== '' ? Number(form.security_deposit) : null,
    }

    let data, error
    if (lease) {
      ;({ data, error } = await supabase.from('lease_terms').update(payload).eq('id', lease.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('lease_terms').insert([payload]).select().single())
    }

    setSaving(false)
    if (error) { setError(error.message); return }
    setLease(data)
    setEditing(false)
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>

  if (!editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-medium text-slate-700">Lease Terms</h2>
          <button onClick={startEdit} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">
            {lease ? 'Edit' : 'Add Lease Terms'}
          </button>
        </div>

        {!lease ? (
          <p className="text-sm text-slate-400">No lease terms on file.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Monthly Rate" value={formatMoney(lease.monthly_rate)} />
            <Field label="Security Deposit" value={formatMoney(lease.security_deposit)} />
            <Field label="Start Date" value={formatDate(lease.start_date)} />
            <Field label="End Date" value={formatDate(lease.end_date)} />
          </dl>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="font-medium text-slate-700 mb-5">{lease ? 'Edit Lease Terms' : 'Add Lease Terms'}</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Rate ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.monthly_rate} onChange={e => set('monthly_rate', e.target.value)} placeholder="e.g. 4500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Security Deposit ($)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={form.security_deposit} onChange={e => set('security_deposit', e.target.value)} placeholder="e.g. 4500" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" className={inputCls} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={() => setEditing(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Save Lease Terms'}
          </button>
        </div>
      </div>
    </div>
  )
}
