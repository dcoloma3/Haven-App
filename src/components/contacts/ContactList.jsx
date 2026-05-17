import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

const EMPTY_FORM = { contact_name: '', relationship: '', phone_number: '', email: '', is_primary: false, is_poa: false }

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
    </svg>
  )
}

function ContactModal({ residentId, contact, onClose, onSaved }) {
  const isEdit = Boolean(contact)
  const [form, setForm] = useState(isEdit ? { ...contact } : { ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.contact_name?.trim()) { setError('Contact name is required.'); return }
    setSaving(true)
    setError('')

    // If marking primary, clear other primary contacts first
    if (form.is_primary) {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .eq('resident_id', residentId)
        .neq('id', contact?.id ?? '00000000-0000-0000-0000-000000000000')
    }

    // If marking POA, clear other POA contacts first
    if (form.is_poa) {
      await supabase
        .from('emergency_contacts')
        .update({ is_poa: false })
        .eq('resident_id', residentId)
        .neq('id', contact?.id ?? '00000000-0000-0000-0000-000000000000')
    }

    const payload = {
      contact_name: form.contact_name.trim(),
      relationship: form.relationship || null,
      phone_number: form.phone_number || null,
      email: form.email || null,
      is_primary: Boolean(form.is_primary),
      is_poa: Boolean(form.is_poa),
    }

    let data, err
    if (isEdit) {
      const res = await supabase
        .from('emergency_contacts')
        .update(payload)
        .eq('id', contact.id)
        .select()
        .single()
      data = res.data; err = res.error
    } else {
      const res = await supabase
        .from('emergency_contacts')
        .insert([{ ...payload, resident_id: residentId }])
        .select()
        .single()
      data = res.data; err = res.error
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data, isEdit)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
            <input required className={inputCls} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>

          {/* Relationship + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <input className={inputCls} value={form.relationship ?? ''} onChange={e => set('relationship', e.target.value)} placeholder="e.g. Daughter" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input type="tel" className={inputCls} value={form.phone_number ?? ''} onChange={e => set('phone_number', e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" className={inputCls} value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="contact@example.com" />
          </div>

          {/* Toggles */}
          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(form.is_primary)}
                onChange={e => set('is_primary', e.target.checked)}
                className="w-4 h-4 accent-[#185FA5] rounded"
              />
              <span className="text-sm text-slate-700">Primary Contact</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(form.is_poa)}
                onChange={e => set('is_poa', e.target.checked)}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <span className="text-sm text-slate-700">Healthcare POA</span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contact'}
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
  const [editingContact, setEditingContact] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    supabase
      .from('emergency_contacts')
      .select('*')
      .eq('resident_id', residentId)
      .order('created_at')
      .then(({ data }) => { setContacts(data ?? []); setLoading(false) })
  }, [residentId])

  // Sort: primary first, then POA, then rest
  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    if (a.is_poa && !b.is_poa) return -1
    if (!a.is_poa && b.is_poa) return 1
    return 0
  })

  async function handleDelete(contactId) {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    setDeleteError('')
    const { error } = await supabase.from('emergency_contacts').delete().eq('id', contactId)
    if (error) { setDeleteError('Failed to delete contact. Please try again.'); return }
    setContacts(prev => prev.filter(c => c.id !== contactId))
  }

  function handleSaved(data, isEdit) {
    if (isEdit) {
      // When editing, if the saved contact is now primary/poa, clear those flags on others locally
      setContacts(prev => prev.map(c => {
        if (c.id === data.id) return data
        return {
          ...c,
          is_primary: data.is_primary ? false : c.is_primary,
          is_poa: data.is_poa ? false : c.is_poa,
        }
      }))
      setEditingContact(null)
    } else {
      setContacts(prev => {
        const updated = prev.map(c => ({
          ...c,
          is_primary: data.is_primary ? false : c.is_primary,
          is_poa: data.is_poa ? false : c.is_poa,
        }))
        return [...updated, data]
      })
      setShowForm(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-medium text-slate-700">Emergency Contacts</h2>
        <button onClick={() => setShowForm(true)} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">+ Add</button>
      </div>

      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">{deleteError}</p>
      )}

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && contacts.length === 0 && (
        <p className="text-sm text-slate-400">No emergency contacts listed.</p>
      )}

      {!loading && sorted.length > 0 && (
        <div className="divide-y divide-slate-100">
          {sorted.map(contact => (
            <div key={contact.id} className="py-3">
              {/* Badges */}
              {(contact.is_primary || contact.is_poa) && (
                <div className="flex gap-1.5 mb-1.5">
                  {contact.is_primary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-[#185FA5]">Primary</span>
                  )}
                  {contact.is_poa && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">POA</span>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{contact.contact_name}</p>
                  {contact.relationship && (
                    <p className="text-xs text-slate-400">{contact.relationship}</p>
                  )}
                  {contact.phone_number && (
                    <a href={`tel:${contact.phone_number}`} className="text-xs text-[#185FA5] hover:underline block mt-0.5">
                      {contact.phone_number}
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-xs text-[#185FA5] hover:underline block mt-0.5">
                      {contact.email}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setEditingContact(contact)}
                    className="text-slate-400 hover:text-[#185FA5] transition-colors"
                    title="Edit contact"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ContactModal
          residentId={residentId}
          contact={null}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}

      {editingContact && (
        <ContactModal
          residentId={residentId}
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
