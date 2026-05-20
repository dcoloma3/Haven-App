import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/layout/Layout'
import IncidentForm from '../components/incidents/IncidentForm'
import { useCommunity } from '../context/CommunityContext'
import { generateIncidentPDF } from '../lib/incidentPDF'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { localDateStr } from '../lib/dateUtils'

const TYPE_LABELS = {
  fall: 'Fall',
  injury: 'Injury',
  medication_error: 'Medication Error',
  behavioral: 'Behavioral',
  elopement: 'Elopement',
  property_damage: 'Property Damage',
  other: 'Other',
}

const TYPE_COLORS = {
  fall: 'bg-orange-100 text-orange-700',
  injury: 'bg-red-100 text-red-700',
  medication_error: 'bg-purple-100 text-purple-700',
  behavioral: 'bg-amber-100 text-amber-700',
  elopement: 'bg-pink-100 text-pink-700',
  property_damage: 'bg-slate-100 text-slate-600',
  other: 'bg-gray-100 text-gray-600',
}

const SEVERITY_COLORS = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-violet-100 text-violet-700',
  closed: 'bg-slate-100 text-slate-500',
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function fmtTime(t) {
  if (!t) return ''
  const [h, mi] = t.split(':')
  const hour = parseInt(h)
  return ` · ${hour % 12 || 12}:${mi} ${hour >= 12 ? 'PM' : 'AM'}`
}

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{children}</span>
}

function IncidentRow({ incident, isAdmin, onEdit, onStatusChange, onDelete, onResidentClick, facilityName }) {
  const { communityId } = useCommunity()
  const [expanded, setExpanded] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const residentName = incident.resident_name || 'Unknown Resident'
  const sev = incident.severity ?? 'low'
  const status = incident.status ?? 'open'

  async function changeStatus(newStatus) {
    setUpdatingStatus(true)
    const extra = newStatus === 'reviewed' ? { reviewed_at: new Date().toISOString() } : {}
    const { data, error } = await supabase
      .from('incidents')
      .update({ status: newStatus, ...extra })
      .eq('id', incident.id)
      .eq('community_id', communityId)
      .select()
      .single()
    setUpdatingStatus(false)
    if (!error && data) onStatusChange({ ...data, resident_name: residentName, room_number: incident.room_number })
  }

  async function handleDelete() {
    await supabase.from('incidents').delete().eq('id', incident.id).eq('community_id', communityId)
    onDelete(incident.id)
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${sev === 'high' ? 'border-red-200' : 'border-slate-200'} ${expanded ? 'shadow-md' : ''}`}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full text-left px-4 py-4 flex items-start gap-3"
      >
        {/* Severity bar */}
        <div className={`w-1 rounded-full flex-shrink-0 self-stretch min-h-[44px] ${sev === 'high' ? 'bg-red-500' : sev === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />

        <div className="flex-1 min-w-0">
          {/* Resident name — clickable */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={e => { e.stopPropagation(); onResidentClick(incident.resident_id) }}
              className="font-semibold text-[#185FA5] text-sm hover:underline"
            >
              {residentName}
            </button>
            {incident.room_number && (
              <span className="text-xs text-slate-400">Room {incident.room_number}</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-sm text-slate-500">
              {fmtDate(incident.incident_date)}{fmtTime(incident.incident_time)}
            </span>
            <Badge cls={TYPE_COLORS[incident.incident_type] ?? TYPE_COLORS.other}>
              {TYPE_LABELS[incident.incident_type] ?? incident.incident_type}
            </Badge>
            <Badge cls={SEVERITY_COLORS[sev]}>
              {sev.charAt(0).toUpperCase() + sev.slice(1)}
            </Badge>
            <Badge cls={STATUS_COLORS[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>

          {incident.location && (
            <p className="text-xs text-slate-400 mt-1">📍 {incident.location}</p>
          )}
          <p className="text-sm text-slate-600 mt-1.5 line-clamp-1">{incident.description}</p>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{incident.description}</p>
          </div>

          {incident.witnesses && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Witnesses</p>
              <p className="text-sm text-slate-700">{incident.witnesses}</p>
            </div>
          )}

          {incident.immediate_action && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Immediate Action</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{incident.immediate_action}</p>
            </div>
          )}

          {/* Notifications */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl px-3 py-2.5 ${incident.physician_notified ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Physician Notified</p>
              <p className={`text-sm font-medium ${incident.physician_notified ? 'text-emerald-700' : 'text-slate-400'}`}>
                {incident.physician_notified ? '✓ Yes' : '✗ No'}
              </p>
              {incident.physician_notified && incident.physician_notified_time && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {new Date(incident.physician_notified_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${incident.family_notified ? 'bg-emerald-50' : 'bg-slate-50'}`}>
              <p className="text-xs font-semibold text-slate-500 mb-0.5">Family Notified</p>
              <p className={`text-sm font-medium ${incident.family_notified ? 'text-emerald-700' : 'text-slate-400'}`}>
                {incident.family_notified ? '✓ Yes' : '✗ No'}
              </p>
              {incident.family_notified && incident.family_notified_time && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {new Date(incident.family_notified_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>

          {incident.follow_up_required && (
            <div className="bg-amber-50 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-600 mb-0.5">⚠ Follow-Up Required</p>
              {incident.follow_up_notes && <p className="text-sm text-amber-800">{incident.follow_up_notes}</p>}
            </div>
          )}

          {incident.reported_by_name && (
            <p className="text-xs text-slate-400">Reported by {incident.reported_by_name}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => generateIncidentPDF({ incident, residentName, facilityName, roomNumber: incident.room_number })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Export PDF
            </button>

            {isAdmin && (
              <button
                onClick={() => onEdit(incident)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}

            {isAdmin && status === 'open' && (
              <button
                onClick={() => changeStatus('reviewed')}
                disabled={updatingStatus}
                className="px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Mark Reviewed
              </button>
            )}

            {isAdmin && status === 'reviewed' && (
              <button
                onClick={() => changeStatus('closed')}
                disabled={updatingStatus}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Close
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-sm">
            <h3 className="font-semibold text-slate-800 mb-2">Delete incident report?</h3>
            <p className="text-sm text-slate-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => { handleDelete(); setDeleteConfirmOpen(false) }} className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getThisMonthStart() {
  const d = new Date()
  return localDateStr(new Date(d.getFullYear(), d.getMonth(), 1))
}
function getToday() {
  return localDateStr()
}

export default function Incidents() {
  const navigate = useNavigate()
  const location = useLocation()
  const { communityId, isAdmin, community } = useCommunity()

  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIncident, setEditingIncident] = useState(null)

  // Warn before page unload when the incident form is open
  useUnsavedChanges(showForm)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (location.state?.quickAdd) setShowForm(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState(getThisMonthStart)
  const [dateTo, setDateTo] = useState(getToday)
  const [residentSearch, setResidentSearch] = useState('')

  const loadIncidents = useCallback(async () => {
    if (!communityId) return
    setLoading(true)

    // Fetch incidents + join resident info
    let q = supabase
      .from('incidents')
      .select('*, residents!inner(first_name, last_name, full_name, room_number)')
      .eq('community_id', communityId)
      .gte('incident_date', dateFrom)
      .lte('incident_date', dateTo)
      .order('incident_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    if (typeFilter !== 'all') q = q.eq('incident_type', typeFilter)

    const { data } = await q

    // Flatten resident info
    const flat = (data ?? []).map(inc => {
      const r = inc.residents ?? {}
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.full_name || 'Unknown'
      return { ...inc, resident_name: name, room_number: r.room_number, residents: undefined }
    })

    setIncidents(flat)
    setLoading(false)
  }, [communityId, statusFilter, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadIncidents()
  }, [loadIncidents])

  function handleSaved(_saved) {
    setShowForm(false)
    setEditingIncident(null)
    loadIncidents() // reload to pick up resident join data
  }

  function handleStatusChange(updated) {
    setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  function handleDelete(id) {
    setIncidents(prev => prev.filter(i => i.id !== id))
  }

  function handleEdit(inc) {
    setEditingIncident(inc)
    setShowForm(true)
  }

  function clearFilters() {
    setStatusFilter('all')
    setTypeFilter('all')
    setDateFrom(getThisMonthStart())
    setDateTo(getToday())
    setResidentSearch('')
  }

  // Stats — all counts reflect the currently loaded (filtered) dataset
  const openCount = incidents.filter(i => i.status === 'open').length
  const highCount = incidents.filter(i => i.severity === 'high').length
  const inRangeCount = incidents.length

  // Search filter (client-side for resident name)
  const filtered = residentSearch.trim()
    ? incidents.filter(i => i.resident_name?.toLowerCase().includes(residentSearch.toLowerCase()))
    : incidents

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Incident Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">{community?.name}</p>
        </div>
        <button
          onClick={() => { setEditingIncident(null); setShowForm(true) }}
          className="flex items-center gap-1.5 bg-[#042C53] hover:bg-[#0B3D6E] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-800">{inRangeCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">In Range</p>
        </div>
        <div className={`border rounded-2xl px-4 py-3 text-center ${openCount > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${openCount > 0 ? 'text-blue-700' : 'text-slate-800'}`}>{openCount}</p>
          <p className={`text-xs mt-0.5 ${openCount > 0 ? 'text-blue-500' : 'text-slate-400'}`}>Open</p>
        </div>
        <div className={`border rounded-2xl px-4 py-3 text-center ${highCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className={`text-2xl font-bold ${highCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{highCount}</p>
          <p className={`text-xs mt-0.5 ${highCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>High Severity</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 mb-5 space-y-3">
        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            />
          </div>
        </div>

        {/* Status + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="reviewed">Reviewed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resident search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by resident name…"
            value={residentSearch}
            onChange={e => setResidentSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      {loading && <p className="text-slate-400 text-sm text-center py-8">Loading…</p>}

      {!loading && incidents.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-slate-400 text-sm">No incident reports found</p>
            <button onClick={clearFilters} className="text-sm text-[#185FA5] hover:underline">Clear filters</button>
            {isAdmin && (
              <button
                onClick={() => { setEditingIncident(null); setShowForm(true) }}
                className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              >
                + New Report
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && incidents.length > 0 && (
        <p className="text-center text-slate-400 text-sm py-8">No incidents match "{residentSearch}"</p>
      )}

      <div className="space-y-3">
        {filtered.map(inc => (
          <IncidentRow
            key={inc.id}
            incident={inc}
            isAdmin={isAdmin}
            facilityName={community?.name}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onResidentClick={rid => navigate(`/residents/${rid}`)}
          />
        ))}
      </div>

      {showForm && (
        <IncidentForm
          residentId={editingIncident?.resident_id ?? null}
          residentName={editingIncident?.resident_name ?? null}
          roomNumber={editingIncident?.room_number ?? null}
          incident={editingIncident}
          onClose={() => { setShowForm(false); setEditingIncident(null) }}
          onSaved={handleSaved}
        />
      )}
    </Layout>
  )
}
