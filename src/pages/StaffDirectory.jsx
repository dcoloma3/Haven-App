import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'
import CertInput from '../components/ui/CertInput'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

function formatDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function RoleBadge({ role }) {
  return role === 'admin'
    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E6F1FB] text-[#185FA5]">Admin</span>
    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Staff</span>
}

function StaffCard({ staff, onClick }) {
  return (
    <button
      onClick={() => onClick(staff)}
      className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-[#378ADD] transition-all"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm flex items-center justify-center flex-shrink-0">
          {initials(staff.full_name)}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-slate-800 truncate">{staff.full_name || <span className="italic text-slate-400">No name set</span>}</p>
          <div className="mt-0.5">
            <RoleBadge role={staff.role} />
          </div>
        </div>
      </div>

      {staff.phone && <p className="text-xs text-slate-500 mb-1.5">{staff.phone}</p>}
      {staff.hire_date && <p className="text-xs text-slate-400 mb-1.5">Hired {formatDate(staff.hire_date)}</p>}

      {staff.certifications?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {staff.certifications.slice(0, 3).map(c => (
            <span key={c} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{c}</span>
          ))}
          {staff.certifications.length > 3 && (
            <span className="text-xs text-slate-400">+{staff.certifications.length - 3} more</span>
          )}
        </div>
      )}
    </button>
  )
}

function StaffModal({ staff, onClose, onSaved, onDeleted }) {
  const isEditing = !!staff
  const [form, setForm] = useState({
    full_name: staff?.full_name ?? '',
    email: staff?.email ?? '',
    role: staff?.role ?? 'staff',
    phone: staff?.phone ?? '',
    emergency_contact: staff?.emergency_contact ?? '',
    hire_date: staff?.hire_date ?? '',
    certifications: staff?.certifications ?? [],
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSave() {
    setSaving(true)
    setError('')
    const payload = {
      full_name: form.full_name || null,
      email: form.email || null,
      role: form.role,
      phone: form.phone || null,
      emergency_contact: form.emergency_contact || null,
      hire_date: form.hire_date || null,
      certifications: form.certifications,
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (isEditing) {
      ;({ data, error } = await supabase.from('profiles').update(payload).eq('id', staff.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('profiles').insert([payload]).select().single())
    }

    setSaving(false)
    if (error) { setError(error.message); return }
    onSaved(data)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('profiles').delete().eq('id', staff.id)
    onDeleted(staff.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">
            {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="tel" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
              <input type="date" className={inputCls} value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact</label>
              <input className={inputCls} value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Name · phone" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Certifications</label>
            <CertInput value={form.certifications} onChange={certs => set('certifications', certs)} />
          </div>

          {!isEditing && (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              After saving, this person can sign up at the login page using the email above — their profile will link automatically.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {isEditing && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Remove
            </button>
          )}
          {isEditing && confirmDelete && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Remove this member?</span>
              <button onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50">
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
            </div>
          )}

          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Staff Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StaffDirectory() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('full_name')
      .then(({ data }) => { setStaff(data ?? []); setLoading(false) })
  }, [])

  function handleSaved(saved) {
    setStaff(prev => {
      const next = prev.find(s => s.id === saved.id)
        ? prev.map(s => s.id === saved.id ? saved : s)
        : [...prev, saved]
      return next.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
    })
    setShowAdd(false)
    setEditing(null)
  }

  function handleDeleted(id) {
    setStaff(prev => prev.filter(s => s.id !== id))
    setEditing(null)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Staff</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-[#185FA5] hover:bg-[#0C447C] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Staff Member
        </button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}

      {!loading && staff.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg">No staff members yet</p>
          <p className="text-sm mt-1">Click "Add Staff Member" to get started.</p>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(s => (
            <StaffCard key={s.id} staff={s} onClick={setEditing} />
          ))}
        </div>
      )}

      {showAdd && (
        <StaffModal
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {editing && (
        <StaffModal
          staff={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </Layout>
  )
}
