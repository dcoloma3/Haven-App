import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import HavenLogo from '../components/layout/HavenLogo'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full flex-1 transition-colors ${i < step ? 'bg-[#185FA5]' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { reload } = useCommunity()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [pendingInvite, setPendingInvite] = useState(null) // invite row if staff
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Personal info (all users)
  const [personal, setPersonal] = useState({
    full_name: '', date_of_birth: '', phone: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '', hire_date: '',
  })

  // Community info (admin only)
  const [community, setCommunity] = useState({
    name: '', address: '', phone: '', license_number: '', email: '', website: '',
  })

  const [showResidentPrompt, setShowResidentPrompt] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login', { replace: true }); return }
      setUserId(session.user.id)
      setUserEmail(session.user.email ?? '')

      // Check for a pending invite for this email
      const { data: invite } = await supabase
        .from('community_invites')
        .select('*, communities(name)')
        .eq('email', session.user.email)
        .eq('accepted', false)
        .maybeSingle()

      setPendingInvite(invite ?? null)
      setLoading(false)
    }
    init()
  }, [navigate])

  function setP(field, val) { setPersonal(p => ({ ...p, [field]: val })) }
  function setC(field, val) { setCommunity(c => ({ ...c, [field]: val })) }

  const isStaff = !!pendingInvite
  const totalSteps = isStaff ? 1 : 2

  async function handleSubmit() {
    setError('')
    if (!personal.full_name.trim()) { setError('Full name is required.'); return }
    if (!isStaff && !community.name.trim()) { setError('Community name is required.'); return }

    setSaving(true)
    try {
      let communityId

      if (isStaff) {
        // Join the community from the invite
        communityId = pendingInvite.community_id
        await supabase.from('community_members').upsert({
          community_id: communityId,
          user_id: userId,
          role: pendingInvite.role,
        })
        await supabase
          .from('community_invites')
          .update({ accepted: true })
          .eq('id', pendingInvite.id)
      } else {
        // Create a new community
        const { data: newCommunity, error: communityErr } = await supabase
          .from('communities')
          .insert([{
            name: community.name.trim(),
            address: community.address || null,
            phone: community.phone || null,
            license_number: community.license_number || null,
            email: community.email || null,
            website: community.website || null,
          }])
          .select()
          .single()

        if (communityErr) { setError(communityErr.message); setSaving(false); return }
        communityId = newCommunity.id

        // Make this user the admin
        await supabase.from('community_members').insert([{
          community_id: communityId,
          user_id: userId,
          role: 'admin',
        }])
      }

      // Save / update profile
      const profilePayload = {
        user_id: userId,
        email: userEmail,
        full_name: personal.full_name.trim(),
        date_of_birth: personal.date_of_birth || null,
        phone: personal.phone || null,
        address: personal.address || null,
        emergency_contact_name: personal.emergency_contact_name || null,
        emergency_contact_phone: personal.emergency_contact_phone || null,
        hire_date: personal.hire_date || null,
        onboarding_complete: true,
      }
      await supabase.from('profiles').upsert(profilePayload, { onConflict: 'user_id' })

      await reload()

      if (!isStaff) {
        setShowResidentPrompt(true)
      } else {
        window.location.href = '/dashboard'
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  if (showResidentPrompt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Community created!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Would you like to add your first resident now?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { window.location.href = '/dashboard?openAddResident=1' }}
              className="w-full bg-[#185FA5] hover:bg-[#0C447C] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Add a Resident
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard' }}
              className="w-full text-slate-500 hover:text-slate-700 text-sm transition-colors py-2"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-lg p-8">
        <div className="mb-6">
          <HavenLogo />
        </div>

        <StepIndicator step={step} total={totalSteps} />

        {/* Staff invite banner */}
        {isStaff && (
          <div className="mb-6 bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-4 py-3">
            <p className="text-sm text-[#185FA5] font-medium">
              You've been invited to join <strong>{pendingInvite.communities?.name}</strong>
            </p>
            <p className="text-xs text-[#185FA5]/80 mt-0.5">
              Fill in your details below to get started.
            </p>
          </div>
        )}

        {/* Step 1: Personal info */}
        {step === 1 && (
          <>
            <h1 className="text-xl font-semibold text-slate-800 mb-1">Welcome to Haven</h1>
            <p className="text-sm text-slate-500 mb-6">Let's start with some basic information about you.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={personal.full_name} onChange={e => setP('full_name', e.target.value)} placeholder="Jane Doe" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date of Birth</label>
                  <input type="date" className={inputCls} value={personal.date_of_birth} onChange={e => setP('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" className={inputCls} value={personal.phone} onChange={e => setP('phone', e.target.value)} placeholder="(555) 000-0000" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={personal.address} onChange={e => setP('address', e.target.value)} placeholder="123 Main St, City, CA 90000" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Emergency Contact Name</label>
                  <input className={inputCls} value={personal.emergency_contact_name} onChange={e => setP('emergency_contact_name', e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className={labelCls}>Emergency Contact Phone</label>
                  <input type="tel" className={inputCls} value={personal.emergency_contact_phone} onChange={e => setP('emergency_contact_phone', e.target.value)} placeholder="(555) 000-0000" />
                </div>
              </div>

              {isStaff && (
                <div>
                  <label className={labelCls}>Hire Date</label>
                  <input type="date" className={inputCls} value={personal.hire_date} onChange={e => setP('hire_date', e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Step 2: Community setup (admin only) */}
        {step === 2 && (
          <>
            <h1 className="text-xl font-semibold text-slate-800 mb-1">Set up your community</h1>
            <p className="text-sm text-slate-500 mb-6">Enter the details for your facility.</p>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Community / Facility Name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={community.name} onChange={e => setC('name', e.target.value)} placeholder="e.g. Sunrise Senior Living" />
              </div>

              <div>
                <label className={labelCls}>License Number</label>
                <input className={inputCls} value={community.license_number} onChange={e => setC('license_number', e.target.value)} placeholder="e.g. CA-123456" />
              </div>

              <div>
                <label className={labelCls}>Address</label>
                <input className={inputCls} value={community.address} onChange={e => setC('address', e.target.value)} placeholder="123 Main St, City, CA 90000" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" className={inputCls} value={community.phone} onChange={e => setC('phone', e.target.value)} placeholder="(555) 000-0000" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" className={inputCls} value={community.email} onChange={e => setC('email', e.target.value)} placeholder="info@facility.com" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Website</label>
                <input type="url" className={inputCls} value={community.website} onChange={e => setC('website', e.target.value)} placeholder="https://facility.com" />
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          {step < totalSteps ? (
            <button
              onClick={() => {
                if (!personal.full_name.trim()) { setError('Full name is required.'); return }
                setError('')
                setStep(s => s + 1)
              }}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Setting up…' : isStaff ? 'Get Started' : 'Create Community'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
