/*
-- Run in Supabase SQL editor to add new community columns:
alter table communities add column if not exists total_beds integer;
alter table communities add column if not exists default_monthly_rate numeric(10,2);
*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import Layout from '../components/layout/Layout'
import { useBulletin } from '../hooks/useBulletin'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

export default function FacilitySettings() {
  const navigate = useNavigate()
  const { community, reload } = useCommunity()
  const [form, setForm] = useState({ name: '', license_number: '', address: '', phone: '', email: '', website: '', total_beds: '', default_monthly_rate: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Bulletin state
  const { bulletin, loading: bulletinLoading, postBulletin, clearBulletin } = useBulletin()
  const [bulletinTitle, setBulletinTitle] = useState('')
  const [bulletinMessage, setBulletinMessage] = useState('')
  const [bulletinSaving, setBulletinSaving] = useState(false)
  const [bulletinSaved, setBulletinSaved] = useState(false)
  const [bulletinError, setBulletinError] = useState('')
  const [bulletinClearing, setBulletinClearing] = useState(false)

  useEffect(() => {
    if (community) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: community.name ?? '',
        license_number: community.license_number ?? '',
        address: community.address ?? '',
        phone: community.phone ?? '',
        email: community.email ?? '',
        website: community.website ?? '',
        total_beds: community.total_beds ?? '',
        default_monthly_rate: community.default_monthly_rate ?? '',
      })
    }
  }, [community])

  // Pre-fill bulletin form when active bulletin loads
  useEffect(() => {
    if (bulletin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBulletinTitle(bulletin.title ?? '')
      setBulletinMessage(bulletin.message ?? '')
    }
  }, [bulletin])

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
        total_beds: form.total_beds !== '' ? Number(form.total_beds) : null,
        default_monthly_rate: form.default_monthly_rate !== '' ? Number(form.default_monthly_rate) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', community.id)

    setSaving(false)
    if (saveErr) { setError(saveErr.message); return }
    await reload()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handlePostBulletin(e) {
    e.preventDefault()
    if (!bulletinTitle.trim()) { setBulletinError('Title is required.'); return }
    if (!bulletinMessage.trim()) { setBulletinError('Message is required.'); return }
    setBulletinSaving(true)
    setBulletinError('')
    setBulletinSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: postErr } = await postBulletin(bulletinTitle.trim(), bulletinMessage.trim(), user?.id ?? null)
    setBulletinSaving(false)
    if (postErr) { setBulletinError(postErr); return }
    setBulletinSaved(true)
    setTimeout(() => setBulletinSaved(false), 3000)
  }

  async function handleClearBulletin() {
    if (!bulletin) return
    setBulletinClearing(true)
    setBulletinError('')
    const { error: clearErr } = await clearBulletin(bulletin.id)
    setBulletinClearing(false)
    if (clearErr) { setBulletinError(clearErr); return }
    setBulletinTitle('')
    setBulletinMessage('')
    setBulletinSaved(false)
  }

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Community Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your facility information</p>
        </div>
      </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Beds</label>
              <input type="number" min="0" step="1" className={inputCls} value={form.total_beds} onChange={e => set('total_beds', e.target.value)} placeholder="e.g. 20" />
              <p className="text-xs text-slate-400 mt-1">Used by Occupancy reports</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Monthly Rate ($)</label>
              <input type="number" min="0" step="0.01" className={inputCls} value={form.default_monthly_rate} onChange={e => set('default_monthly_rate', e.target.value)} placeholder="e.g. 4500" />
              <p className="text-xs text-slate-400 mt-1">Used by Billing as a default</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Settings saved.</p>}

          <button type="submit" disabled={saving} className="w-full bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Staff Bulletin section */}
      <div className="mt-8 max-w-lg">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Staff Bulletin</h2>
        <p className="text-sm text-slate-500 mb-4">
          Post an announcement that all staff see on their Dashboard.
          {bulletin ? ' There is currently an active bulletin.' : ' No active bulletin.'}
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          {bulletinLoading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <form onSubmit={handlePostBulletin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={bulletinTitle}
                  onChange={e => setBulletinTitle(e.target.value)}
                  placeholder="e.g. All-Staff Meeting Tomorrow"
                  maxLength={120}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  value={bulletinMessage}
                  onChange={e => setBulletinMessage(e.target.value)}
                  placeholder="Enter your announcement here…"
                />
              </div>

              {bulletinError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{bulletinError}</p>
              )}
              {bulletinSaved && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  {bulletin ? 'Bulletin updated.' : 'Bulletin posted.'}
                </p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={bulletinSaving}
                  className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
                >
                  {bulletinSaving ? 'Saving…' : bulletin ? 'Update Bulletin' : 'Post Bulletin'}
                </button>

                {bulletin && (
                  <button
                    type="button"
                    onClick={handleClearBulletin}
                    disabled={bulletinClearing}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {bulletinClearing ? 'Clearing…' : 'Clear Bulletin'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}
