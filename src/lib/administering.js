import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// "Administering as" — tracks which caregiver is currently giving meds on a
// shared device, and attaches that attribution to administration records.
//
// administered_by stays = the logged-in account (audit trail). The selected
// caregiver's NAME (and roster id, if any) is stored alongside it so the MAR
// can show who actually administered each dose.
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PREFIX = 'haven_administering_'

// Read the active caregiver for a community from localStorage.
// Shape: { caregiverId: string|null, name: string }  (null caregiverId = account or typed)
export function getActiveCaregiver(communityId) {
  if (!communityId) return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + communityId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveCaregiver(communityId, value) {
  if (!communityId) return
  try {
    if (value) localStorage.setItem(KEY_PREFIX + communityId, JSON.stringify(value))
    else localStorage.removeItem(KEY_PREFIX + communityId)
  } catch { /* ignore storage errors (private mode, etc.) */ }
}

// Build the attribution fields for an administration insert.
// `accountUserId` is the logged-in account (audit). `active` is the selected caregiver.
export function attributionFields(active, accountUserId) {
  return {
    administered_by: accountUserId ?? null,
    administered_by_name: active?.name?.trim() || null,
    administered_by_caregiver_id: active?.caregiverId ?? null,
  }
}

// Insert that survives the pre-migration window: if the new attribution columns
// don't exist yet, it retries without them so dispensing never breaks.
export async function insertWithAttribution(table, payload) {
  let res = await supabase.from(table).insert([payload]).select().single()
  if (res.error) {
    const msg = (res.error.message || '') + (res.error.details || '')
    if (/administered_by_name|administered_by_caregiver_id|schema cache|column/i.test(msg)) {
      const base = { ...payload }
      delete base.administered_by_name
      delete base.administered_by_caregiver_id
      res = await supabase.from(table).insert([base]).select().single()
    }
  }
  return res
}

// Load the caregiver roster for a community. Resilient: returns [] if the table
// doesn't exist yet (before the migration is applied).
export async function loadCaregiverRoster(communityId) {
  if (!communityId) return []
  const { data, error } = await supabase
    .from('community_caregivers')
    .select('id, name, initials, active')
    .eq('community_id', communityId)
    .eq('active', true)
    .order('name')
  if (error) return []
  return data ?? []
}

// "Maria Salonga" → "M.S"  ·  "Cher" → "CH"
export function initialsFromName(name) {
  const n = (name || '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}.${parts[parts.length - 1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}
