import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { initialsFromName } from '../../lib/administering'

// Admin-managed roster of caregivers who can administer meds on a shared device,
// including people who don't have an app login. Selectable in the Dispense tab's
// "Administering as" bar; their initials appear on the MAR.
export default function CaregiverRoster({ communityId }) {
  const [caregivers, setCaregivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false) // table not migrated yet
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (!communityId) return
    let alive = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    supabase
      .from('community_caregivers')
      .select('id, name, initials, active')
      .eq('community_id', communityId)
      .order('name')
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { setUnavailable(true); setLoading(false); return }
        setCaregivers(data ?? [])
        setLoading(false)
      })
    return () => { alive = false }
  }, [communityId])

  async function addCaregiver() {
    const name = newName.trim()
    if (!name || saving) return
    setSaving(true)
    const { data, error } = await supabase
      .from('community_caregivers')
      .insert([{ community_id: communityId, name, initials: initialsFromName(name), active: true }])
      .select().single()
    setSaving(false)
    if (!error && data) {
      setCaregivers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
    }
  }

  async function saveRename(cg) {
    const name = editName.trim()
    if (!name) { setEditingId(null); return }
    const { data } = await supabase
      .from('community_caregivers')
      .update({ name, initials: initialsFromName(name) })
      .eq('id', cg.id).select().single()
    if (data) setCaregivers(prev => prev.map(c => c.id === cg.id ? data : c))
    setEditingId(null)
  }

  async function toggleActive(cg) {
    const { data } = await supabase
      .from('community_caregivers')
      .update({ active: !cg.active })
      .eq('id', cg.id).select().single()
    if (data) setCaregivers(prev => prev.map(c => c.id === cg.id ? data : c))
  }

  if (unavailable) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl mt-4 px-4 py-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Caregivers</p>
        <p className="text-sm text-slate-500">
          Caregiver roster isn't enabled yet — the database update for this feature hasn't been applied.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-4">
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Caregivers</p>
        <p className="text-xs text-slate-400 mt-0.5">
          People who can administer meds on a shared device — including staff without an app login.
          Selectable in Dispense; their initials appear on the MAR.
        </p>
      </div>

      {/* Add */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-100">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCaregiver() }}
          placeholder="Add caregiver name…"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
        />
        <button
          onClick={addCaregiver}
          disabled={!newName.trim() || saving}
          className="bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-40 text-white text-sm font-semibold px-4 rounded-lg transition-colors"
        >
          Add
        </button>
      </div>

      {loading && <p className="px-4 py-4 text-sm text-slate-400">Loading…</p>}

      {!loading && caregivers.length === 0 && (
        <p className="px-4 py-4 text-sm text-slate-400">No caregivers yet. Add one above.</p>
      )}

      {caregivers.map((cg, i) => (
        <div key={cg.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-slate-100' : ''} ${!cg.active ? 'opacity-50' : ''}`}>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#185FA5]/10 text-[#185FA5] text-xs font-bold flex-shrink-0">
            {cg.initials || initialsFromName(cg.name)}
          </span>
          {editingId === cg.id ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveRename(cg); if (e.key === 'Escape') setEditingId(null) }}
              onBlur={() => saveRename(cg)}
              className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          ) : (
            <span className="flex-1 text-sm text-slate-700">
              {cg.name}{!cg.active && <span className="text-xs text-slate-400 ml-2">(inactive)</span>}
            </span>
          )}
          <button
            onClick={() => { setEditingId(cg.id); setEditName(cg.name) }}
            className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Rename
          </button>
          <button
            onClick={() => toggleActive(cg)}
            className="text-xs font-medium px-2 py-1 text-slate-500 hover:text-slate-800"
          >
            {cg.active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      ))}
    </div>
  )
}
