/*
-- Run in Supabase SQL editor:
create table notification_log (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade,
  resident_id uuid references residents(id) on delete cascade nullable,
  created_at timestamptz default now(),
  notification_type text not null,
  recipient_name text,
  recipient_contact text,
  message text,
  status text not null default 'pending',
  sent_at timestamptz
);
create table notification_settings (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references communities(id) on delete cascade unique,
  notify_on_incident boolean not null default true,
  notify_on_missed_meds boolean not null default false,
  notify_on_appointment boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notification_log enable row level security;
alter table notification_settings enable row level security;
create policy "community members can view notification log" on notification_log
  for all using (community_id in (select community_id from community_members where user_id = auth.uid()));
create policy "community admins can manage notification settings" on notification_settings
  for all using (community_id in (select community_id from community_members where user_id = auth.uid() and role = 'admin'));
*/

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useCommunity } from '../context/CommunityContext'
import { useProfile } from '../context/ProfileContext'
import Layout from '../components/layout/Layout'

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  sent: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

export default function NotificationLog() {
  const { communityId, isAdmin } = useCommunity()
  const { profile } = useProfile()
  const [logs, setLogs] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveMsgType, setSaveMsgType] = useState('success')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showManualModal, setShowManualModal] = useState(false)
  const [savingLog, setSavingLog] = useState(false)
  const [manualForm, setManualForm] = useState({ notification_type: 'Call', recipient_name: '', recipient_contact: '', message: '', status: 'sent' })
  const [settingsForm, setSettingsForm] = useState({ notify_on_incident: true, notify_on_missed_meds: false, notify_on_appointment: true })

  const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent'

  async function load() {
    const [{ data: logsData }, { data: settingsData }] = await Promise.all([
      supabase.from('notification_log').select('*').eq('community_id', communityId).order('created_at', { ascending: false }),
      isAdmin ? supabase.from('notification_settings').select('*').eq('community_id', communityId).single() : Promise.resolve({ data: null }),
    ])
    setLogs(logsData || [])
    if (settingsData) {
      setSettings(settingsData)
      setSettingsForm({ notify_on_incident: settingsData.notify_on_incident, notify_on_missed_meds: settingsData.notify_on_missed_meds, notify_on_appointment: settingsData.notify_on_appointment })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [communityId]) // eslint-disable-line

  async function saveSettings() {
    setSavingSettings(true)
    const payload = { community_id: communityId, ...settingsForm, updated_at: new Date().toISOString() }
    let error
    if (settings) {
      ;({ error } = await supabase.from('notification_settings').update(payload).eq('id', settings.id))
    } else {
      ;({ error } = await supabase.from('notification_settings').insert(payload))
    }
    if (error) {
      console.error(error)
      setSaveMsgType('error')
      setSaveMsg('Something went wrong. Please try again.')
      setSavingSettings(false)
      return
    }
    setSavingSettings(false)
    setSaveMsgType('success')
    setSaveMsg('Settings saved.')
    setTimeout(() => setSaveMsg(''), 3000)
    await load()
  }

  async function logManual() {
    if (!manualForm.recipient_name.trim()) return
    setSavingLog(true)
    const _authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Staff'
    const { error } = await supabase.from('notification_log').insert({
      community_id: communityId,
      notification_type: manualForm.notification_type,
      recipient_name: manualForm.recipient_name.trim(),
      recipient_contact: manualForm.recipient_contact.trim() || null,
      message: manualForm.message.trim() || null,
      status: manualForm.status,
      sent_at: manualForm.status === 'sent' ? new Date().toISOString() : null,
    })
    if (error) {
      console.error(error)
      setSaveMsgType('error')
      setSaveMsg('Something went wrong. Please try again.')
      setSavingLog(false)
      return
    }
    setSavingLog(false)
    setShowManualModal(false)
    setSaveMsgType('success')
    setSaveMsg('Notification logged.')
    setTimeout(() => setSaveMsg(''), 3000)
    setManualForm({ notification_type: 'Call', recipient_name: '', recipient_contact: '', message: '', status: 'sent' })
    await load()
  }

  const filtered = logs.filter(l => {
    if (filterType !== 'all' && l.notification_type !== filterType) return false
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    return true
  })

  const KNOWN_TYPES = ['Call', 'Text', 'Email', 'In Person', 'Other']
  const extraTypes = [...new Set(logs.map(l => l.notification_type))].filter(t => !KNOWN_TYPES.includes(t))
  const types = [...KNOWN_TYPES, ...extraTypes]

  return (
    <Layout>
      {/* Banner: automated notifications not yet active */}
      <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
        <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800">Automated notifications are not active</p>
          <p className="text-xs text-amber-700 mt-0.5">This log is for manually recording communications only. Automated email/SMS is a planned feature and not yet enabled.</p>
        </div>
      </div>

      {saveMsg && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm mb-4 ${saveMsgType === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          <span>{saveMsg}</span>
          <button onClick={() => setSaveMsg('')} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notification Log</h1>
          <p className="text-sm text-slate-500 mt-1">Manual communication records</p>
        </div>
        <button onClick={() => setShowManualModal(true)} className="bg-[#042C53] hover:bg-[#0B3D6E] text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Manual Notification
        </button>
      </div>

      {/* Settings (admin only) */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-slate-700 text-sm">Notification Settings</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">Automated notifications require connecting a Supabase Edge Function with Resend or Twilio. Contact your developer to enable sending.</p>
          </div>
          {[
            { key: 'notify_on_incident', label: 'Notify family on new incident report' },
            { key: 'notify_on_missed_meds', label: 'Notify family on missed medications' },
            { key: 'notify_on_appointment', label: 'Notify family on upcoming appointments' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm[key]}
                onChange={e => setSettingsForm(f => ({ ...f, [key]: e.target.checked }))}
                className="rounded accent-[#185FA5]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
          <button onClick={saveSettings} disabled={savingSettings} className="bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors">
            {savingSettings ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]">
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5]">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-slate-500 text-sm">No notifications logged yet</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(l.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{l.notification_type}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-700">{l.recipient_name || '—'}</p>
                    {l.recipient_contact && <p className="text-xs text-slate-400">{l.recipient_contact}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{l.message || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[l.status] || STATUS_COLORS.pending}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Manual Log Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowManualModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-slate-800 text-lg">Log Manual Notification</h2>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                <select value={manualForm.notification_type} onChange={e => setManualForm(f => ({ ...f, notification_type: e.target.value }))} className={inputCls}>
                  <option>Call</option>
                  <option>Text</option>
                  <option>Email</option>
                  <option>In Person</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Recipient Name <span className="text-red-500">*</span></label>
                <input value={manualForm.recipient_name} onChange={e => setManualForm(f => ({ ...f, recipient_name: e.target.value }))} className={inputCls} placeholder="Who was contacted?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Info</label>
                <input value={manualForm.recipient_contact} onChange={e => setManualForm(f => ({ ...f, recipient_contact: e.target.value }))} className={inputCls} placeholder="Phone or email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Message / Summary</label>
                <textarea value={manualForm.message} onChange={e => setManualForm(f => ({ ...f, message: e.target.value }))} rows={3} className={inputCls + ' resize-none'} placeholder="What was communicated?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={manualForm.status} onChange={e => setManualForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                  <option value="sent">Sent / Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setShowManualModal(false)} className="flex-1 border border-slate-300 text-slate-700 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={logManual} disabled={!manualForm.recipient_name.trim() || savingLog} className="flex-1 bg-[#042C53] hover:bg-[#0B3D6E] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                {savingLog ? 'Saving…' : 'Log Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
