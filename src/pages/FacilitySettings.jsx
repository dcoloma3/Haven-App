import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useFacility } from '../context/FacilityContext'
import Layout from '../components/layout/Layout'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function FacilitySettings() {
  const navigate = useNavigate()
  const { facility, refresh } = useFacility()
  const [form, setForm] = useState({ facility_name: '', license_number: '', address: '', phone_number: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (facility) {
      setForm({
        facility_name: facility.facility_name ?? '',
        license_number: facility.license_number ?? '',
        address: facility.address ?? '',
        phone_number: facility.phone_number ?? '',
      })
    }
  }, [facility])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.facility_name.trim()) { setError('Facility name is required.'); return }
    setSaving(true)
    setError('')
    setSaved(false)

    const payload = {
      facility_name: form.facility_name,
      license_number: form.license_number || null,
      address: form.address || null,
      phone_number: form.phone_number || null,
      updated_at: new Date().toISOString(),
    }

    const { error: saveErr } = facility
      ? await supabase.from('facility_settings').update(payload).eq('id', facility.id)
      : await supabase.from('facility_settings').insert([payload])

    setSaving(false)
    if (saveErr) { setError(saveErr.message); return }
    await refresh()
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

      <h1 className="text-xl font-semibold text-slate-800 mb-6">Facility Settings</h1>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Facility Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              className={inputCls}
              value={form.facility_name}
              onChange={e => set('facility_name', e.target.value)}
              placeholder="e.g. Sunrise Senior Living"
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
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="123 Main St, City, CA 90000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              className={inputCls}
              value={form.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="(555) 000-0000"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {saved && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Settings saved.
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
