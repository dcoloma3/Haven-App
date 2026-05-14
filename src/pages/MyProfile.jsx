import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'
import CertInput from '../components/ui/CertInput'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function MyProfile() {
  const { profile, isAdmin } = useProfile()

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    emergency_contact_name: profile?.emergency_contact_name ?? '',
    emergency_contact_phone: profile?.emergency_contact_phone ?? '',
    hire_date: profile?.hire_date ?? '',
    certifications: profile?.certifications ?? [],
    role: profile?.role ?? 'staff',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const payload = {
      full_name: form.full_name || null,
      phone: form.phone || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      hire_date: form.hire_date || null,
      certifications: form.certifications,
      ...(isAdmin ? { role: form.role } : {}),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('user_id', profile.user_id)

    setSaving(false)
    if (error) { setError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-16 text-slate-400">
          <p>Profile not found. Please contact your manager.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-800 mb-6">My Profile</h1>

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          {/* Read-only identity info */}
          <div className="pb-4 border-b border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E6F1FB] text-[#185FA5] font-semibold text-lg flex items-center justify-center flex-shrink-0">
              {form.full_name
                ? form.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                : (profile.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                profile.role === 'admin' ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'
              }`}>
                {profile.role === 'admin' ? 'Manager' : 'Staff'}
              </span>
            </div>
          </div>

          {/* Personal */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Personal Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
              </div>
            </div>
          </div>

          {/* Work info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Work Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                <input type="date" className={inputCls} value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="staff">Staff</option>
                    <option value="admin">Manager</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Emergency contact */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Emergency Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                <input
                  className={inputCls}
                  value={form.emergency_contact_name}
                  onChange={e => set('emergency_contact_name', e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
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

          {/* Certifications */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Certifications</p>
            <CertInput value={form.certifications} onChange={certs => set('certifications', certs)} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {saved && <p className="text-sm text-emerald-600 font-medium">✓ Profile saved</p>}
          </div>
        </form>
      </div>
    </Layout>
  )
}
