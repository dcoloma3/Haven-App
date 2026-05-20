import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function CreateCommunityModal({ onClose, onCreated }) {
  const { reload } = useCommunity()
  const [form, setForm] = useState({ name: '', address: '', phone: '', license_number: '', email: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function handleCreate() {
    if (!form.name.trim()) { setError('Community name is required.'); return }
    setSaving(true)
    setError('')
    const { data: community, error: err } = await supabase.rpc('create_community', {
      p_name: form.name.trim(),
      p_address: form.address || null,
      p_phone: form.phone || null,
      p_license_number: form.license_number || null,
      p_email: form.email || null,
      p_website: form.website || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    if (!community?.id) { setError('Failed to create community. Please try again.'); setSaving(false); return }
    await reload()
    setSaving(false)
    onCreated(community.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">New Community</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Community Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputCls}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Sunrise Senior Living"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
            <input
              className={inputCls}
              value={form.license_number}
              onChange={e => set('license_number', e.target.value)}
              placeholder="e.g. CA-123456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              className={inputCls}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="123 Main St, City, CA 90000"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                className={inputCls}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="info@facility.com"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Creating…' : 'Create community'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
