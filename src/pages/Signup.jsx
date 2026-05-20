import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { completeTrial } from '../lib/trial'
import HavenLogo from '../components/layout/HavenLogo'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteEmail = searchParams.get('email') ?? ''
  const inviteCommunity = searchParams.get('community') ?? ''
  const isStaffInvite = !!inviteEmail

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: inviteEmail, password: '',
    communityName: '', residentCount: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkEmail, setCheckEmail] = useState(false)

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim()) return setError('Please enter your first and last name.')
    if (!form.email.trim()) return setError('Email is required.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (!isStaffInvite && !form.communityName.trim()) return setError('Community name is required.')
    if (!isStaffInvite && !form.residentCount) return setError('Please select an approximate resident count.')

    setLoading(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
          },
        },
      })
      if (authErr) throw authErr

      const userId = authData.user?.id

      if (authData.session && userId) {
        if (isStaffInvite) {
          // Staff invite — onboarding handles joining the community
          navigate('/onboarding', { replace: true })
        } else {
          // Facility owner — set up trial immediately
          await completeTrial({
            userId,
            email: form.email.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            communityName: form.communityName.trim(),
            residentCount: parseInt(form.residentCount),
          })
          navigate('/dashboard', { replace: true })
        }
      } else if (userId) {
        if (isStaffInvite) {
          // Staff invite with email confirmation — just show check email screen
          setCheckEmail(true)
          setLoading(false)
        } else {
          // Facility owner with email confirmation — store setup data
          localStorage.setItem('haven_trial_pending', JSON.stringify({
            communityName: form.communityName.trim(),
            residentCount: parseInt(form.residentCount),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
          }))
          setCheckEmail(true)
          setLoading(false)
        }
      } else {
        throw new Error('Something went wrong. Please try again.')
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 bg-[#E6F1FB] rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Check your email</h2>
          <p className="text-sm text-slate-500 mb-1">We sent a confirmation link to</p>
          <p className="text-sm font-semibold text-slate-800 mb-4">{form.email}</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Click the link to activate your account and start your 14-day free trial. Your community will be ready to go right after.
          </p>
          <p className="text-xs text-slate-400 mt-5">Didn't get it? Check your spam folder.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8">
        <div className="mb-6">
          <HavenLogo />
        </div>

        {isStaffInvite ? (
          <div className="mb-6 flex items-start gap-3 bg-[#E6F1FB] border border-[#185FA5]/20 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-[#185FA5] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#185FA5]">You've been invited to join {inviteCommunity || 'a community'}</p>
              <p className="text-xs text-[#185FA5]/80 mt-0.5">Create your account below to get started.</p>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-800 mb-1">Start your free trial</h1>
            <p className="text-sm text-slate-500">14 days free · No credit card · Up to 6 residents</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>First name <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className={labelCls}>Last name <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                placeholder="Smith"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              className={`${inputCls} ${isStaffInvite ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              value={form.email}
              onChange={e => !isStaffInvite && set('email', e.target.value)}
              readOnly={isStaffInvite}
              placeholder="jane@facility.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className={labelCls}>Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {!isStaffInvite && (
            <>
              <div>
                <label className={labelCls}>Community / Facility name <span className="text-red-500">*</span></label>
                <input
                  className={inputCls}
                  value={form.communityName}
                  onChange={e => set('communityName', e.target.value)}
                  placeholder="Sunrise Senior Living"
                />
              </div>

              <div>
                <label className={labelCls}>Approximate number of residents <span className="text-red-500">*</span></label>
                <select
                  className={inputCls}
                  value={form.residentCount}
                  onChange={e => set('residentCount', e.target.value)}
                >
                  <option value="">Select a range…</option>
                  <option value="6">1–6 residents</option>
                  <option value="12">7–12 residents</option>
                  <option value="18">13–18 residents</option>
                  <option value="30">19–30 residents</option>
                  <option value="50">31–50 residents</option>
                  <option value="100">51–100 residents</option>
                  <option value="200">100+ residents</option>
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
          >
            {loading
              ? (isStaffInvite ? 'Creating account…' : 'Setting up your trial…')
              : (isStaffInvite ? 'Create account →' : 'Start free trial →')}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-[#185FA5] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
