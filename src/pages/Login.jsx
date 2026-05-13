import { useState } from 'react'
import { supabase } from '../lib/supabase'
import HavenLogo from '../components/layout/HavenLogo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ backgroundColor: '#042C53' }}>

      {/* Bubble effects */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%', top: '-200px', left: '-150px',
        background: 'rgba(56,152,255,0.55)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 650, height: 650,
        borderRadius: '50%', bottom: '-200px', right: '-150px',
        background: 'rgba(56,152,255,0.55)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 350, height: 350,
        borderRadius: '50%', top: '25%', right: '8%',
        background: 'rgba(120,190,255,0.4)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300,
        borderRadius: '50%', bottom: '20%', left: '5%',
        background: 'rgba(56,152,255,0.45)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 200, height: 200,
        borderRadius: '50%', top: '10%', right: '25%',
        background: 'rgba(160,210,255,0.3)',
        filter: 'blur(30px)', pointerEvents: 'none',
      }} />

      {/* Content */}
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <HavenLogo markHeight={40} textSize={30} variant="white" />
          <p className="text-sm mt-3" style={{ color: '#85B7EB' }}>Staff access only</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
