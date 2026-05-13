import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function FacilitySettings() {
  const navigate = useNavigate()
  const { community, reload } = useCommunity()
  const [form, setForm] = useState({ name: '', license_number: '', address: '', phone: '', email: '', website: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (community) {
      setForm({
        name: community.name ?? '',
        license_number: community.license_number ?? '',
        address: community.address ?? '',
        phone: community.phone ?? '',
        email: community.email ?? '',
        website: community.website ?? '',
      })
    }
  }, [community])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Community name is required.'); return }
    if (!community) { setError('No community loaded.'); return }
    setSaving(true)
    setError('')
    setSaved(false)

    const { error: saveErr } = await supabase
      .from('communities')
      .update({
        name: form.name,
        license_number: form.license_number || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', community.id)

    setSaving(false)
    if (saveErr) { setError(saveErr.message); return }
    await reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-slate-500 hover:text-slate-800 mb-4 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <h1 className="text-xl font-semibold text-slate-800 mb-6">Community Settings</h1>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Community Name <span className="text-red-500">*</span>
            </label>
            <input required className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sunrise Senior Living" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">License Number</label>
            <input className={inputCls} value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="e.g. CA-123456" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, CA 90000" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@facility.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input type="url" className={inputCls} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://facility.com" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Settings saved.</p>}

          <button type="submit" disabled={saving} className="w-full bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
