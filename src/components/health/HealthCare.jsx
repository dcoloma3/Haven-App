import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'
const MOBILITY_OPTIONS = ['Walker', 'Wheelchair', 'Cane', 'None']
const LEVEL_OF_CARE_OPTIONS = ['Independent', 'Assisted', 'Memory Care']
const FALL_RISK_OPTIONS = ['Low', 'Medium', 'High']

const FALL_RISK_COLORS = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-red-100 text-red-700',
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  )
}

const EMPTY_FORM = {
  allergies: '',
  diagnoses: '',
  level_of_care: '',
  fall_risk: '',
  diet_restrictions: '',
  mobility_aids: [],
  dnr_on_file: null,
  hospital_preferences: '',
}

export default function HealthCare({ residentId }) {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('health_care')
      .select('*')
      .eq('resident_id', residentId)
      .maybeSingle()
      .then(({ data }) => { setRecord(data); setLoading(false) })
  }, [residentId])

  function startEdit() {
    setForm({
      allergies: record?.allergies ?? '',
      diagnoses: record?.diagnoses ?? '',
      level_of_care: record?.level_of_care ?? '',
      fall_risk: record?.fall_risk ?? '',
      diet_restrictions: record?.diet_restrictions ?? '',
      mobility_aids: record?.mobility_aids ?? [],
      dnr_on_file: record?.dnr_on_file ?? null,
      hospital_preferences: record?.hospital_preferences ?? '',
    })
    setError('')
    setEditing(true)
  }

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function toggleMobilityAid(aid) {
    setForm(f => {
      const current = f.mobility_aids ?? []
      return {
        ...f,
        mobility_aids: current.includes(aid)
          ? current.filter(a => a !== aid)
          : [...current, aid],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const payload = {
      resident_id: residentId,
      allergies: form.allergies || null,
      diagnoses: form.diagnoses || null,
      level_of_care: form.level_of_care || null,
      fall_risk: form.fall_risk || null,
      diet_restrictions: form.diet_restrictions || null,
      mobility_aids: form.mobility_aids.length > 0 ? form.mobility_aids : null,
      dnr_on_file: form.dnr_on_file,
      hospital_preferences: form.hospital_preferences || null,
    }

    let data, error
    if (record) {
      ;({ data, error } = await supabase.from('health_care').update(payload).eq('id', record.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('health_care').insert([payload]).select().single())
    }

    setSaving(false)
    if (error) { setError(error.message); return }
    setRecord(data)
    setEditing(false)
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading…</p>

  if (!editing) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-medium text-slate-700">Health & Care</h2>
          <button onClick={startEdit} className="text-sm text-[#185FA5] hover:text-[#0C447C] transition-colors">
            {record ? 'Edit' : 'Add Health Info'}
          </button>
        </div>

        {!record ? (
          <p className="text-sm text-slate-400">No health & care information on file.</p>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Allergies" value={record.allergies} />
            <Field label="Diagnoses / Medical History" value={record.diagnoses} />

            <div>
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Level of Care</dt>
              <dd className="text-sm text-slate-800">{record.level_of_care || '—'}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Fall Risk</dt>
              <dd>
                {record.fall_risk ? (
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${FALL_RISK_COLORS[record.fall_risk]}`}>
                    {record.fall_risk}
                  </span>
                ) : '—'}
              </dd>
            </div>

            <Field label="Diet Restrictions" value={record.diet_restrictions} />

            <div>
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Mobility Aids</dt>
              <dd className="text-sm text-slate-800">
                {record.mobility_aids?.length ? record.mobility_aids.join(', ') : '—'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">DNR / Advance Directive on File</dt>
              <dd>
                {record.dnr_on_file === null ? (
                  <span className="text-sm text-slate-800">—</span>
                ) : (
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${record.dnr_on_file ? 'bg-[#E6F1FB] text-[#185FA5]' : 'bg-slate-100 text-slate-600'}`}>
                    {record.dnr_on_file ? 'Yes' : 'No'}
                  </span>
                )}
              </dd>
            </div>

            <Field label="Hospital Preferences" value={record.hospital_preferences} />
          </dl>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <h2 className="font-medium text-slate-700 mb-5">{record ? 'Edit Health & Care' : 'Add Health & Care'}</h2>
      <div className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Medication, food, environmental…" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Diagnoses / Medical History</label>
          <textarea className={`${inputCls} resize-none`} rows={3} value={form.diagnoses} onChange={e => set('diagnoses', e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Level of Care</label>
            <select className={inputCls} value={form.level_of_care} onChange={e => set('level_of_care', e.target.value)}>
              <option value="">— Select —</option>
              {LEVEL_OF_CARE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fall Risk Level</label>
            <select className={inputCls} value={form.fall_risk} onChange={e => set('fall_risk', e.target.value)}>
              <option value="">— Select —</option>
              {FALL_RISK_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Diet Restrictions</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.diet_restrictions} onChange={e => set('diet_restrictions', e.target.value)} placeholder="e.g. Low sodium, diabetic, pureed…" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Mobility Aids</label>
          <div className="flex flex-wrap gap-3">
            {MOBILITY_OPTIONS.map(aid => (
              <label key={aid} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mobility_aids.includes(aid)}
                  onChange={() => toggleMobilityAid(aid)}
                  className="rounded border-slate-300 text-[#185FA5] focus:ring-[#185FA5]"
                />
                <span className="text-sm text-slate-700">{aid}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">DNR / Advance Directive on File</label>
          <div className="flex gap-6">
            {[true, false].map(val => (
              <label key={String(val)} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dnr_on_file"
                  checked={form.dnr_on_file === val}
                  onChange={() => set('dnr_on_file', val)}
                  className="border-slate-300 text-[#185FA5] focus:ring-[#185FA5]"
                />
                <span className="text-sm text-slate-700">{val ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Preferences</label>
          <input className={inputCls} value={form.hospital_preferences} onChange={e => set('hospital_preferences', e.target.value)} placeholder="Preferred hospital name" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={() => setEditing(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#185FA5] hover:bg-[#0C447C] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
