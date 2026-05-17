import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function LeaseForm({ residentId, lease, onClose, onSaved }) {
  const [form, setForm] = useState({
    monthly_rate: lease?.monthly_rate ?? '',
    start_date: lease?.start_date ?? '',
    end_date: lease?.end_date ?? '',
    security_deposit: lease?.security_deposit ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    if (!form.monthly_rate) { setError('Monthly rate is required.'); return }
    setSaving(true)
    setError('')
    const payload = {
      resident_id: residentId,
      monthly_rate: form.monthly_rate !== '' ? Number(form.monthly_rate) : null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      security_deposit: form.security_deposit !== '' ? Number(form.security_deposit) : null,
    }

    let data, err
    if (lease) {
      ;({ data, error: err } = await supabase.from('lease_terms').update(payload).eq('id', lease.id).select().single())
    } else {
      ;({ data, error: err } = await supabase.from('lease_terms').insert([payload]).select().single())
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-slate-800 text-lg">{lease ? 'Edit Lease Terms' : 'Add Lease Terms'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Rate ($) <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.monthly_rate}
                onChange={e => set('monthly_rate', e.target.value)}
                placeholder="e.g. 4500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Security Deposit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.security_deposit}
                onChange={e => set('security_deposit', e.target.value)}
                placeholder="e.g. 4500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                className={inputCls}
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                className={inputCls}
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : lease ? 'Save Changes' : 'Add Lease Terms'}
          </button>
        </div>
      </div>
    </div>
  )
}
