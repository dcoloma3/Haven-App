import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function AddModal({ residentId, onClose, onSaved }) {
  const [form, setForm] = useState({ contact_name: '', relationship: '', phone_number: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('emergency_contacts')
      .insert([{ ...form, resident_id: residentId }])
      .select()
      .single()
    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(data)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Add Emergency Contact</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <input className={inputCls} value={form.relationship} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input type="tel" className={inputCls} value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContactList({ residentId }) {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase
      .from('emergency_contacts')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at')
      .then(({ data }) => { setContacts(data ?? []); setLoading(false) })
  }, [residentId])

  async function handleDelete(contactId) {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId)
    if (error) { alert('Failed to delete contact. Please try again.'); return }
    setContacts(prev => prev.filter(c => c.id !== contactId))
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium text-slate-700">Emergency Contacts</h2>
        <button onClick={() => setShowForm(true)} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">+ Add</button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && contacts.length === 0 && (
        <p className="text-sm text-slate-400">No emergency contacts listed.</p>
      )}

      {!loading && contacts.length > 0 && (
        <div className="divide-y divide-slate-100">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{contact.contact_name}</p>
                <p className="text-xs text-slate-400">
                  {[contact.relationship, contact.phone_number].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <button onClick={() => handleDelete(contact.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors ml-4 flex-shrink-0">Delete</button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddModal
          residentId={residentId}
          onClose={() => setShowForm(false)}
          onSaved={data => { setContacts(prev => [...prev, data]); setShowForm(false) }}
        />
      )}
    </div>
  )
}
