import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function ResidentForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    room_number: '',
    move_in_date: '',
    physician: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
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
    const { data, error } = await supabase
      .from('residents')
      .insert([{ ...form, full_name }])
      .select()
      .single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Add Resident</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
              <input
                value={form.middle_name}
                onChange={e => set('middle_name', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => set('date_of_birth', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
              <input
                value={form.room_number}
                onChange={e => set('room_number', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Move-in Date</label>
              <input
                type="date"
                value={form.move_in_date}
                onChange={e => set('move_in_date', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Physician</label>
              <input
                value={form.physician}
                onChange={e => set('physician', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : 'Save Resident'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
