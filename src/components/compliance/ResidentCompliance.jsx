import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'
import {
  DOC_TYPES, DOC_CATEGORIES, computeDocStatus, getRequiredDocs, STATUS_CONFIG,
} from '../../lib/complianceDocs'
import { generateCompliancePDF } from '../../lib/compliancePDF'
import { localDateStr } from '../../lib/dateUtils'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent bg-white'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.missing
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

// ── Compliance Item Edit Modal ────────────────────────────────────────────────

function ComplianceItemModal({ item, docKey, resident, communityId, onClose, onSaved }) {
  const { profile } = useProfile()
  const def = DOC_TYPES[docKey]

  const [form, setForm] = useState({
    is_applicable:   item?.is_applicable  ?? true,
    date_completed:  item?.date_completed ?? '',
    expiration_date: item?.expiration_date ?? '',
    signed_by:       item?.signed_by ?? '',
    notes:           item?.notes ?? '',
    needs_reexecution: item?.needs_reexecution ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  // Auto-compute expiration from date_completed if doc type has expiryDays
  function handleDateCompleted(val) {
    set('date_completed', val)
    if (val && def?.expires && def?.expiryDays) {
      const exp = new Date(val)
      exp.setDate(exp.getDate() + def.expiryDays)
      set('expiration_date', localDateStr(exp))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    const changedBy = profile?.full_name || profile?.email || 'Staff'
    const previousValues = item ? {
      is_applicable: item.is_applicable,
      status: item.status,
      date_completed: item.date_completed,
      expiration_date: item.expiration_date,
      signed_by: item.signed_by,
      notes: item.notes,
    } : null

    // Compute status
    const fakeItem = {
      is_applicable: form.is_applicable,
      date_completed: form.date_completed || null,
      expiration_date: form.expiration_date || null,
    }
    const status = computeDocStatus(fakeItem)

    const payload = {
      community_id:    communityId,
      resident_id:     resident.id,
      doc_type:        docKey,
      is_applicable:   form.is_applicable,
      status,
      date_completed:  form.date_completed || null,
      expiration_date: form.expiration_date || null,
      signed_by:       form.signed_by || null,
      notes:           form.notes || null,
      needs_reexecution: form.needs_reexecution,
      updated_at:      new Date().toISOString(),
      updated_by_id:   profile?.user_id ?? null,
      updated_by_name: changedBy,
    }
    if (!item) {
      payload.created_by_id   = profile?.user_id ?? null
      payload.created_by_name = changedBy
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from('resident_compliance_items')
      .upsert(payload, { onConflict: 'resident_id,doc_type' })
      .select()
      .single()

    if (upsertErr) { setError(upsertErr.message); setSaving(false); return }

    // Append audit log
    await supabase.from('compliance_audit_log').insert({
      community_id:       communityId,
      resident_id:        resident.id,
      compliance_item_id: upserted.id,
      doc_type:           docKey,
      action:             item ? 'updated' : 'created',
      changed_by_id:      profile?.user_id ?? null,
      changed_by_name:    changedBy,
      previous_values:    previousValues,
      new_values:         {
        is_applicable: form.is_applicable,
        status,
        date_completed: form.date_completed || null,
        expiration_date: form.expiration_date || null,
        signed_by: form.signed_by || null,
        notes: form.notes || null,
      },
    })

    setSaving(false)
    onSaved(upserted)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="font-semibold text-slate-800 text-sm truncate">{def?.label}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{DOC_CATEGORIES[def?.category]?.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none flex-shrink-0">&times;</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Applicable toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={form.is_applicable}
                onChange={e => set('is_applicable', e.target.checked)}
              />
              <div className={`w-10 h-5.5 rounded-full transition-colors ${form.is_applicable ? 'bg-[#185FA5]' : 'bg-slate-300'}`} style={{ height: '22px', width: '40px' }} />
              <div className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${form.is_applicable ? 'translate-x-[18px]' : ''}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Applicable to this resident</span>
          </label>

          {form.is_applicable && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date Completed</label>
                  <input
                    type="date"
                    value={form.date_completed}
                    onChange={e => handleDateCompleted(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {def?.expires && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={form.expiration_date}
                      onChange={e => set('expiration_date', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Signed By</label>
                <input
                  value={form.signed_by}
                  onChange={e => set('signed_by', e.target.value)}
                  placeholder="Name or title"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  placeholder="Optional notes…"
                  className={inputCls + ' resize-none'}
                />
              </div>

              {docKey === 'LIC_604A' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.needs_reexecution}
                    onChange={e => set('needs_reexecution', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-amber-700 font-medium">⚠ Needs re-execution (COO)</span>
                </label>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category Section ─────────────────────────────────────────────────────────

function CategorySection({ categoryKey, docKeys, itemMap, resident, onEdit }) {
  const [open, setOpen] = useState(true)
  const category = DOC_CATEGORIES[categoryKey]

  // Count statuses for the header summary
  const counts = useMemo(() => {
    const c = { on_file: 0, expiring_soon: 0, expired: 0, missing: 0, not_applicable: 0 }
    docKeys.forEach(key => {
      const item = itemMap[key]
      const status = item ? computeDocStatus(item) : 'missing'
      c[status] = (c[status] || 0) + 1
    })
    return c
  }, [docKeys, itemMap])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700">{category.label}</h3>
          <span className="text-xs text-slate-400">{docKeys.length} docs</span>
        </div>
        <div className="flex items-center gap-2">
          {counts.expired > 0 && (
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {counts.expired} expired
            </span>
          )}
          {counts.expiring_soon > 0 && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {counts.expiring_soon} expiring
            </span>
          )}
          {counts.missing > 0 && (
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
              {counts.missing} missing
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {docKeys.map(key => {
            const item = itemMap[key]
            const def = DOC_TYPES[key]
            const status = item ? computeDocStatus(item) : 'missing'
            const days = item?.expiration_date ? daysUntil(item.expiration_date) : null
            const reExec = key === 'LIC_604A' && item?.needs_reexecution

            return (
              <div
                key={key}
                className={`flex items-center gap-3 px-5 py-3 ${status === 'not_applicable' ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium text-slate-700 ${status === 'not_applicable' ? 'line-through' : ''}`}>
                      {def?.label}
                    </p>
                    {reExec && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        ⚠ Re-execute
                      </span>
                    )}
                  </div>
                  {item?.date_completed && status !== 'not_applicable' && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Completed {fmtDate(item.date_completed)}
                      {item.expiration_date && ` · Expires ${fmtDate(item.expiration_date)}`}
                      {days !== null && days <= 60 && days >= 0 && (
                        <span className={`ml-1 font-medium ${days <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                          ({days}d left)
                        </span>
                      )}
                      {item.signed_by && ` · Signed by ${item.signed_by}`}
                    </p>
                  )}
                  {item?.notes && status !== 'not_applicable' && (
                    <p className="text-xs text-slate-400 italic mt-0.5 truncate">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusChip status={status} />
                  <button
                    onClick={() => onEdit(key, item)}
                    className="text-xs text-[#185FA5] hover:text-[#0B3D6E] font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ResidentCompliance({ residentId, resident, onResidentUpdate }) {
  const { communityId } = useCommunity()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [editKey, setEditKey]   = useState(null)  // doc_type key being edited
  const [editItem, setEditItem] = useState(null)  // existing item or null
  const [generatingPDF, setGeneratingPDF] = useState(false)

  // Map doc_type -> item row
  const itemMap = useMemo(() => {
    const m = {}
    items.forEach(i => { m[i.doc_type] = i })
    return m
  }, [items])

  // Group required doc keys by category
  const docsByCategory = useMemo(() => {
    const requiredKeys = getRequiredDocs(resident)
    const map = {}
    Object.keys(DOC_CATEGORIES).forEach(cat => { map[cat] = [] })
    requiredKeys.forEach(key => {
      const cat = DOC_TYPES[key]?.category
      if (cat && map[cat]) map[cat].push(key)
    })
    return map
  }, [resident])

  // Expiring within 60 days (for banner)
  const expiringItems = useMemo(() => {
    return items.filter(item => {
      if (!item.is_applicable || !item.expiration_date) return false
      const days = daysUntil(item.expiration_date)
      return days !== null && days >= 0 && days <= 60
    }).sort((a, b) => a.expiration_date.localeCompare(b.expiration_date))
  }, [items])

  useEffect(() => {
    if (!communityId || !residentId) return
    setLoading(true)
    supabase
      .from('resident_compliance_items')
      .select('*')
      .eq('resident_id', residentId)
      .eq('community_id', communityId)
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [communityId, residentId])

  function handleEdit(key, item) {
    setEditKey(key)
    setEditItem(item ?? null)
  }

  function handleSaved(updatedItem) {
    setItems(prev => {
      const exists = prev.find(i => i.doc_type === updatedItem.doc_type)
      if (exists) return prev.map(i => i.doc_type === updatedItem.doc_type ? updatedItem : i)
      return [...prev, updatedItem]
    })
  }

  async function handleGeneratePDF() {
    setGeneratingPDF(true)
    try {
      await generateCompliancePDF({ residentId, communityId, supabase, resident, items, itemMap })
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading compliance records…</p>

  return (
    <div className="space-y-5">
      {/* Expiration alert banner */}
      {expiringItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">Documents expiring within 60 days</p>
              <ul className="space-y-0.5">
                {expiringItems.map(item => {
                  const days = daysUntil(item.expiration_date)
                  const def = DOC_TYPES[item.doc_type]
                  return (
                    <li key={item.doc_type} className="text-xs text-amber-700">
                      {def?.label} — expires {fmtDate(item.expiration_date)}
                      <span className="font-semibold ml-1">({days}d)</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Condition flags — shown in Conditional category header area */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { flag: 'is_hospice',          label: 'Hospice' },
          { flag: 'has_dementia',         label: 'Dementia/Memory Care' },
          { flag: 'has_poa',              label: 'Power of Attorney' },
          { flag: 'has_conservatorship',  label: 'Conservatorship' },
        ].map(({ flag, label }) => resident[flag] && (
          <span key={flag} className="text-xs font-medium bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-full">
            {label}
          </span>
        ))}
        <span className="text-xs text-slate-400">These flags control which Category 3 documents are required.</span>
      </div>

      {/* Category accordion sections */}
      {Object.keys(DOC_CATEGORIES).map(cat => (
        <CategorySection
          key={cat}
          categoryKey={cat}
          docKeys={docsByCategory[cat] ?? []}
          itemMap={itemMap}
          resident={resident}
          onEdit={handleEdit}
        />
      ))}

      {/* Generate Cover Sheet */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleGeneratePDF}
          disabled={generatingPDF}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          {generatingPDF ? 'Generating…' : 'Generate CCLD Cover Sheet'}
        </button>
      </div>

      {/* Edit modal */}
      {editKey && (
        <ComplianceItemModal
          item={editItem}
          docKey={editKey}
          resident={resident}
          communityId={communityId}
          onClose={() => { setEditKey(null); setEditItem(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
