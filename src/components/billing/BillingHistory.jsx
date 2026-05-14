import { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { supabase } from '../../lib/supabase'
import { useCommunity } from '../../context/CommunityContext'
import { useProfile } from '../../context/ProfileContext'

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

function generatePDF(record, resident, communityName) {
  {
    const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(24, 95, 165)
      doc.text(communityName || 'The Haven', 14, 20)
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text('BILLING STATEMENT', 14, 30)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Resident: ${[resident.first_name, resident.last_name].filter(Boolean).join(' ')}`, 14, 42)
      doc.text(`Room: ${resident.room_number || '—'}`, 14, 50)
      doc.text(`Billing Month: ${record.billing_month}`, 14, 58)
      doc.text(`Status: ${record.status?.toUpperCase()}`, 14, 66)
      doc.text('Due on receipt', 14, 74)

      doc.autoTable({
        startY: 84,
        head: [['Description', 'Amount']],
        body: [
          ['Base Rate', `$${Number(record.base_rate).toFixed(2)}`],
          ['Level of Care', `$${Number(record.level_of_care_charge).toFixed(2)}`],
          ['Medication Management', `$${Number(record.medication_management_fee).toFixed(2)}`],
          [`Ancillary Charges${record.ancillary_description ? ` (${record.ancillary_description})` : ''}`, `$${Number(record.ancillary_charges).toFixed(2)}`],
          ['TOTAL', `$${Number(record.total_amount).toFixed(2)}`],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [24, 95, 165] },
        footStyles: { fontStyle: 'bold' },
      })

      if (record.notes) {
        const y = doc.lastAutoTable.finalY + 10
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.text(`Notes: ${record.notes}`, 14, y)
      }

      doc.save(`statement_${resident.last_name || 'resident'}_${record.billing_month}.pdf`)
  }
}

export default function BillingHistory({ residentId, resident }) {
  const { communityId, isAdmin, community } = useCommunity()
  const { profile } = useProfile()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [leaseRate, setLeaseRate] = useState(null) // null = not yet fetched, false = no lease
  const [form, setForm] = useState({
    billing_month: new Date().toISOString().slice(0, 7),
    base_rate: '',
    level_of_care_charge: '',
    medication_management_fee: '',
    ancillary_charges: '',
    ancillary_description: '',
    notes: '',
    status: 'draft',
  })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  const totalAmount = [
    parseFloat(form.base_rate) || 0,
    parseFloat(form.level_of_care_charge) || 0,
    parseFloat(form.medication_management_fee) || 0,
    parseFloat(form.ancillary_charges) || 0,
  ].reduce((a, b) => a + b, 0)

  async function fetchRecords() {
    const { data } = await supabase
      .from('billing_records')
      .select('*')
      .eq('resident_id', residentId)
      .order('billing_month', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [residentId]) // eslint-disable-line

  async function openAdd() {
    setEditRecord(null)
    setLeaseRate(null)
    setShowModal(true)
    // Fetch lease record to pre-populate base_rate
    const { data: lease } = await supabase
      .from('lease_terms')
      .select('monthly_rate')
      .eq('resident_id', residentId)
      .maybeSingle()
    const rate = lease?.monthly_rate ?? false
    setLeaseRate(rate)
    setForm({
      billing_month: new Date().toISOString().slice(0, 7),
      base_rate: rate !== false ? String(rate) : '',
      level_of_care_charge: '',
      medication_management_fee: '',
      ancillary_charges: '',
      ancillary_description: '',
      notes: '',
      status: 'draft',
    })
  }

  function openEdit(r) {
    setEditRecord(r)
    setForm({
      billing_month: r.billing_month || '',
      base_rate: r.base_rate || '',
      level_of_care_charge: r.level_of_care_charge || '',
      medication_management_fee: r.medication_management_fee || '',
      ancillary_charges: r.ancillary_charges || '',
      ancillary_description: r.ancillary_description || '',
      notes: r.notes || '',
      status: r.status || 'draft',
    })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const payload = {
      community_id: communityId,
      resident_id: residentId,
      created_by_name: authorName,
      billing_month: form.billing_month,
      base_rate: parseFloat(form.base_rate) || 0,
      level_of_care_charge: parseFloat(form.level_of_care_charge) || 0,
      medication_management_fee: parseFloat(form.medication_management_fee) || 0,
      ancillary_charges: parseFloat(form.ancillary_charges) || 0,
      ancillary_description: form.ancillary_description.trim() || null,
      total_amount: totalAmount,
      status: form.status,
      notes: form.notes.trim() || null,
    }
    let error
    if (editRecord) {
      ;({ error } = await supabase.from('billing_records').update(payload).eq('id', editRecord.id))
    } else {
      ;({ error } = await supabase.from('billing_records').insert(payload))
    }
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
    setShowModal(false)
    await fetchRecords()
  }

  async function changeStatus(record, newStatus) {
    const { error } = await supabase.from('billing_records').update({ status: newStatus }).eq('id', record.id)
    if (error) {
      console.error(error)
      alert('Something went wrong. Please try again.')
      return
    }
    await fetchRecords()
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading billing…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Billing History</h3>
        {isAdmin && (
          <button onClick={openAdd} className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Generate Statement
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm font-medium">No billing statements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{r.billing_month}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status] || STATUS_COLORS.draft}`}>{r.status}</span>
                </div>
                <p className="text-lg font-bold text-slate-800">${Number(r.total_amount).toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                <div>Base Rate: <span className="text-slate-700">${Number(r.base_rate).toFixed(2)}</span></div>
                <div>Level of Care: <span className="text-slate-700">${Number(r.level_of_care_charge).toFixed(2)}</span></div>
                <div>Med Management: <span className="text-slate-700">${Number(r.medication_management_fee).toFixed(2)}</span></div>
                <div>Ancillary: <span className="text-slate-700">${Number(r.ancillary_charges).toFixed(2)}</span></div>
              </div>
              {r.ancillary_description && <p className="text-xs text-slate-400 mb-2">Ancillary: {r.ancillary_description}</p>}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => generatePDF(r, resident, community?.name)} className="text-xs text-[#185FA5] font-medium hover:text-[#0C447C] transition-colors">Export PDF</button>
                {isAdmin && (
                  <>
                    <span className="text-slate-200">|</span>
                    <button onClick={() => openEdit(r)} className="text-xs text-slate-500 font-medium hover:text-slate-700 transition-colors">Edit</button>
                    {r.status === 'draft' && <><span className="text-slate-200">|</span><button onClick={() => changeStatus(r, 'sent')} className="text-xs text-blue-500 font-medium hover:text-blue-700 transition-colors">Mark Sent</button></>}
                    {r.status === 'sent' && <><span className="text-slate-200">|</span><button onClick={() => changeStatus(r, 'paid')} className="text-xs text-emerald-500 font-medium hover:text-emerald-700 transition-colors">Mark Paid</button></>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">{editRecord ? 'Edit Statement' : 'Generate Statement'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Billing Month</label>
                  <input type="month" value={form.billing_month} onChange={e => setForm(f => ({ ...f, billing_month: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              {[
                { key: 'base_rate', label: 'Base Rate ($)' },
                { key: 'level_of_care_charge', label: 'Level of Care ($)' },
                { key: 'medication_management_fee', label: 'Medication Management ($)' },
                { key: 'ancillary_charges', label: 'Ancillary Charges ($)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                  <input type="number" step="0.01" min="0" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} placeholder="0.00" />
                  {key === 'base_rate' && !editRecord && (
                    <p className="text-xs text-slate-400 mt-1">
                      {leaseRate === null
                        ? 'Checking lease record…'
                        : leaseRate !== false
                        ? 'Pre-filled from lease record'
                        : 'No lease on file — enter manually'}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ancillary Description</label>
                <input value={form.ancillary_description} onChange={e => setForm(f => ({ ...f, ancillary_description: e.target.value }))} className={inputCls} placeholder="Describe ancillary charges…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes…" />
              </div>
              <div className="bg-[#E6F1FB] rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Total Amount</p>
                <p className="text-xl font-bold text-[#185FA5]">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : editRecord ? 'Save Changes' : 'Create Statement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
