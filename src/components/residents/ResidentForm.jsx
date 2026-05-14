import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function CameraIcon() {
  return (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

/* ── "What's Next?" screen shown after successful save ── */
function WhatsNext({ resident, onClose }) {
  const navigate = useNavigate()

  function goTo(tab) {
    navigate(`/residents/${resident.id}`, { state: { openTab: tab } })
    onClose()
  }

  const steps = [
    {
      tab: 'Medications',
      icon: (
        <svg className="w-5 h-5 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="9" width="18" height="6" rx="3" /><line x1="12" y1="9" x2="12" y2="15" />
        </svg>
      ),
      label: 'Add Medications',
      desc: 'Set up scheduled and PRN meds',
    },
    {
      tab: 'Contacts',
      icon: (
        <svg className="w-5 h-5 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      label: 'Add Emergency Contacts',
      desc: 'Family members and responsible parties',
    },
    {
      tab: 'Health & Care',
      icon: (
        <svg className="w-5 h-5 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      label: 'Health & Care Info',
      desc: 'Diagnoses, allergies, and care level',
    },
    {
      tab: 'Profile',
      icon: (
        <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
      label: 'View Full Profile',
      desc: 'See all details and tabs',
      secondary: true,
    },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Resident added!</h2>
            <p className="text-sm text-slate-500">What would you like to do next?</p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map(s => (
            <button
              key={s.tab}
              onClick={() => goTo(s.tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                s.secondary
                  ? 'border border-slate-200 hover:bg-slate-50'
                  : 'border border-[#185FA5]/20 bg-[#E6F1FB] hover:bg-[#d1e8f8]'
              }`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${s.secondary ? 'bg-slate-100' : 'bg-white'}`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${s.secondary ? 'text-slate-700' : 'text-[#185FA5]'}`}>{s.label}</p>
                <p className="text-xs text-slate-500">{s.desc}</p>
              </div>
              <svg className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
        >
          Done for now
        </button>
      </div>
    </div>
  )
}

/* ── Main form ── */
export default function ResidentForm({ onClose, onSaved }) {
  const { communityId } = useCommunity()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    room_number: '',
    care_level: '',
    move_in_date: '',
    physician: '',
    notes: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedResident, setSavedResident] = useState(null) // triggers WhatsNext

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError('First name or last name is required.')
      return
    }
    setSaving(true)
    const full_name = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

    const { data, error: insertErr } = await supabase
      .from('residents')
      .insert([{ ...form, full_name, community_id: communityId }])
      .select()
      .single()

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    // Upload photo if selected
    if (photoFile && data) {
      const ext = photoFile.name.split('.').pop().toLowerCase() || 'jpg'
      const path = `${data.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('resident-avatars')
        .upload(path, photoFile, { upsert: true })

      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('resident-avatars')
          .getPublicUrl(path)
        const urlWithBuster = `${publicUrl}?t=${Date.now()}`
        const { data: updated } = await supabase
          .from('residents')
          .update({ avatar_url: urlWithBuster })
          .eq('id', data.id)
          .select()
          .single()
        if (updated) {
          onSaved(updated)
          setSavedResident(updated)
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    onSaved(data)
    setSavedResident(data)
  }

  // Show "What's Next" after save
  if (savedResident) {
    return <WhatsNext resident={savedResident} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Add Resident</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Photo upload */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center overflow-hidden transition-colors group"
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <CameraIcon />
                  <span className="text-[10px] font-medium text-slate-500">Add Photo</span>
                </div>
              )}
            </button>
            <p className="text-xs text-slate-400">Optional — you can add it later</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} placeholder="Jane" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Middle</label>
              <input value={form.middle_name} onChange={e => set('middle_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
              <input value={form.room_number} onChange={e => set('room_number', e.target.value)} className={inputCls} placeholder="e.g. 1" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Care Level</label>
            <select value={form.care_level} onChange={e => set('care_level', e.target.value)} className={inputCls}>
              <option value="">Select care level…</option>
              <option value="AL">Assisted Living (AL)</option>
              <option value="IL">Independent Living (IL)</option>
              <option value="MC">Memory Care (MC)</option>
              <option value="SNF">Skilled Nursing (SNF)</option>
              <option value="Hospice">Hospice</option>
              <option value="Respite">Respite</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Move-in Date</label>
              <input type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Physician</label>
              <input value={form.physician} onChange={e => set('physician', e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className={inputCls + ' resize-none'}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : 'Save Resident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
