import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import HavenLogo from '../components/layout/HavenLogo'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']

export default function ProfileCompletion() {
  const { profile, setProfile } = useProfile()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    phone: '',
    address: '',
    position: '',
    date_of_birth: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave(skip = false) {
    setSaving(true)
    setError('')

    const payload = skip
      ? { profile_completed: true }
      : {
          phone: form.phone || null,
          address: form.address || null,
          position: form.position || null,
          date_of_birth: form.date_of_birth || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_relationship: form.emergency_contact_relationship || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
          profile_completed: true,
        }

    const { data, error: dbErr } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', profile?.user_id)
      .select()
      .single()

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    if (data) setProfile(data)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <HavenLogo markHeight={36} textSize={26} />
          <h1 className="text-xl font-bold text-slate-800 mt-4">Complete Your Profile</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            This information is kept on file for your community. You can update it anytime.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">

          {/* Contact Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Info</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  className={inputCls}
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="123 Main St, City, CA 90000"
                />
              </div>
            </div>
          </div>

          {/* Work Info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Work Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position / Title</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.position}
                  onChange={e => set('position', e.target.value)}
                  placeholder="e.g. Caregiver"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.date_of_birth}
                  onChange={e => set('date_of_birth', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.emergency_contact_name}
                  onChange={e => set('emergency_contact_name', e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                  <select
                    className={inputCls}
                    value={form.emergency_contact_relationship}
                    onChange={e => set('emergency_contact_relationship', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {RELATIONSHIPS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Best Phone</label>
                  <input
                    type="tel"
                    className={inputCls}
                    value={form.emergency_contact_phone}
                    onChange={e => set('emergency_contact_phone', e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 border border-slate-300 text-slate-600 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
