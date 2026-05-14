import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function FamilyView() {
  const { token } = useParams()
  const [state, setState] = useState('loading') // loading | invalid | loaded
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      // Find the access record
      const { data: access } = await supabase
        .from('family_access')
        .select('*, residents(*)')
        .eq('access_token', token)
        .eq('is_active', true)
        .single()

      if (!access) { setState('invalid'); return }

      // Update last accessed
      await supabase.from('family_access').update({ last_accessed_at: new Date().toISOString() }).eq('id', access.id)

      const resident = access.residents
      const now = new Date().toISOString()

      const [{ data: appointments }, { data: admins }, { data: meds }, { data: shiftNotes }, { data: incidents }] = await Promise.all([
        supabase.from('appointments').select('*').eq('resident_id', resident.id).gte('appointment_date', new Date().toISOString().split('T')[0]).order('appointment_date').limit(5),
        supabase.from('medication_administrations').select('medication_id, administered_date, status').eq('resident_id', resident.id).gte('administered_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]),
        supabase.from('medications').select('id').eq('resident_id', resident.id),
        supabase.from('shift_notes').select('*').eq('resident_id', resident.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('incidents').select('id, incident_date, status, incident_type').eq('resident_id', resident.id).order('incident_date', { ascending: false }).limit(3),
      ])

      // Compute med compliance
      const adminCount = (admins || []).filter(a => a.status === 'administered' || !a.status).length
      const totalScheduled = (admins || []).length
      const compliance = totalScheduled > 0 ? Math.round((adminCount / totalScheduled) * 100) : null

      setData({
        access,
        resident,
        appointments: appointments || [],
        compliance,
        totalScheduled,
        shiftNotes: shiftNotes || [],
        incidents: incidents || [],
      })
      setState('loaded')
    }
    load()
  }, [token])

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#E6F1FB] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-[#E6F1FB] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Link Invalid</h1>
          <p className="text-sm text-slate-500">This link is invalid or has been revoked. Please contact the facility for a new link.</p>
        </div>
      </div>
    )
  }

  const { resident, appointments, compliance, shiftNotes, incidents } = data
  const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ') || 'Resident'

  return (
    <div className="min-h-screen bg-[#E6F1FB]">
      {/* Header */}
      <div className="bg-[#185FA5] text-white px-4 py-4">
        <div className="max-w-lg mx-auto">
          <p className="text-xs opacity-75 mb-1">The Haven — Family Portal</p>
          <h1 className="text-xl font-bold">Welcome, {data.access.family_member_name}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Resident card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#185FA5] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {resident.first_name?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{fullName}</h2>
              <p className="text-sm text-slate-500">Room {resident.room_number || '—'}</p>
            </div>
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">Upcoming Appointments</h3>
          </div>
          {appointments.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400">No upcoming appointments</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map(a => (
                <div key={a.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{a.title || a.appointment_type}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(a.appointment_date).toLocaleDateString()}{a.appointment_time ? ` at ${a.appointment_time}` : ''}</p>
                  {a.provider && <p className="text-xs text-slate-400">{a.provider}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medication compliance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Medication Compliance (Last 7 Days)</h3>
          {compliance === null ? (
            <p className="text-sm text-slate-400">No medication data available</p>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-3xl font-bold text-[#185FA5]">{compliance}%</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${compliance >= 90 ? 'bg-emerald-100 text-emerald-700' : compliance >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {compliance >= 90 ? 'Excellent' : compliance >= 70 ? 'Good' : 'Needs Attention'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-[#185FA5] h-2 rounded-full transition-all" style={{ width: `${compliance}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Recent shift notes */}
        {shiftNotes.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">Recent Updates from Staff</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {shiftNotes.map(n => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm text-slate-700">{n.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.author_name} · {new Date(n.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent incidents */}
        {incidents.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-700">Recent Incident Reports</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {incidents.map(i => (
                <div key={i.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{i.incident_type || 'Incident'}</p>
                    <p className="text-xs text-slate-400">{new Date(i.incident_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                    i.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    i.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {i.status || 'Reported'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-center pb-8 text-xs text-slate-400">
        Powered by The Haven
      </div>
    </div>
  )
}
