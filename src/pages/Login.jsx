import { useState } from 'react'
import { supabase } from '../lib/supabase'
import HavenLogo from '../components/layout/HavenLogo'

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password reset email sent! Check your inbox.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (mode === 'signup') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      setLoading(true)
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { first_name: firstName, last_name: lastName, full_name: fullName } },
      })
      if (!error && data?.user) {
        await supabase.from('profiles').upsert({
          user_id: data.user.id, email, full_name: fullName,
          first_name: firstName, last_name: lastName, profile_completed: false,
        }, { onConflict: 'user_id' })
      }
      setLoading(false)
      if (error) { setError(error.message) } else { setSuccess('Account created! Check your email to confirm, then sign in.'); switchMode('login') }
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const inputCls = 'w-full bg-white/80 border border-white/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/70 focus:bg-white transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020f1f 0%, #042C53 45%, #0a3d6b 100%)' }}>

      {/* Animated blobs */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-250px', left: '-200px', background: 'radial-gradient(circle, rgba(37,99,235,0.5) 0%, rgba(56,152,255,0.3) 60%, transparent 100%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'blobFloat1 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 750, height: 750, borderRadius: '50%', bottom: '-250px', right: '-200px', background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(56,152,255,0.25) 60%, transparent 100%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'blobFloat2 13s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', top: '20%', right: '10%', background: 'radial-gradient(circle, rgba(99,179,237,0.35) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', animation: 'blobFloat3 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', bottom: '15%', left: '8%', background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none', animation: 'blobFloat4 11s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', top: '8%', right: '28%', background: 'radial-gradient(circle, rgba(147,210,255,0.25) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none', animation: 'blobFloat5 9s ease-in-out infinite' }} />

      {/* Subtle dot grid overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

      {/* Content */}
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <HavenLogo markHeight={44} textSize={34} variant="white" />
          <p className="text-sm mt-3 font-medium tracking-wide" style={{ color: 'rgba(147,198,255,0.85)' }}>
            {mode === 'forgot' ? 'Reset your password' : mode === 'signup' ? 'Create your Haven account' : 'Modern care, beautifully managed'}
          </p>
        </div>

        {mode === 'forgot' ? (
          <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }} className="rounded-3xl shadow-2xl p-6 space-y-4">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Enter your email and we'll send you a link to reset your password.</p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" autoFocus />
            </div>
            {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2">{error}</p>}
            {success && <p className="text-sm text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-2">{success}</p>}
            <button onClick={handleForgot} disabled={loading} className="w-full font-semibold rounded-xl py-3 text-sm text-white transition-all active:scale-95 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)', boxShadow: '0 4px 20px rgba(24,95,165,0.5)' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button onClick={() => switchMode('login')} className="w-full text-center text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.45)' }}>← Back to Sign In</button>
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} className="flex rounded-2xl p-1 mb-4">
              <button onClick={() => switchMode('login')} className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-[#042C53] shadow-lg' : 'text-white/60 hover:text-white/90'}`}>Sign In</button>
              <button onClick={() => switchMode('signup')} className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'signup' ? 'bg-white text-[#042C53] shadow-lg' : 'text-white/60 hover:text-white/90'}`}>Create Account</button>
            </div>

            <form onSubmit={handleSubmit} style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }} className="rounded-3xl shadow-2xl p-6 space-y-4">

              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>First Name</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="Alex" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Last Name</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Smith" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} className={inputCls + ' pr-10'} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} tabIndex={-1}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls + ' pr-10'} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} tabIndex={-1}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2">{error}</p>}
              {success && <p className="text-sm text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-2">{success}</p>}

              <button type="submit" disabled={loading} className="w-full font-semibold rounded-xl py-3 text-sm text-white transition-all active:scale-95 disabled:opacity-50 mt-1" style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)', boxShadow: '0 4px 24px rgba(24,95,165,0.55)' }}>
                {loading ? (mode === 'signup' ? 'Creating account…' : 'Signing in…') : (mode === 'signup' ? 'Create Account' : 'Sign In')}
              </button>

              {mode === 'login' && (
                <button type="button" onClick={() => switchMode('forgot')} className="w-full text-center text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Forgot your password?
                </button>
              )}
            </form>

            <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>Trusted by care communities everywhere</p>
          </>
        )}
      </div>
    </div>
  )
}
