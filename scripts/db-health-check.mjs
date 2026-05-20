/**
 * Database Health Check Agent
 *
 * Runs nightly via GitHub Actions. Queries Supabase for data integrity issues
 * and emails a summary report to the admin using Resend.
 *
 * Required environment variables (set in GitHub Secrets):
 *   SUPABASE_URL            — your Supabase project URL
 *   SUPABASE_SERVICE_KEY    — service role key (Settings → API in Supabase dashboard)
 *   RESEND_API_KEY          — from resend.com
 *   ALERT_EMAIL             — where to send the report (e.g. domcoloma@gmail.com)
 */

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const ALERT_EMAIL = process.env.ALERT_EMAIL

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY || !ALERT_EMAIL) {
  console.error('Missing required environment variables. Check GitHub Secrets.')
  process.exit(1)
}

const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function query(path, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${params}`, { headers })
  if (!res.ok) throw new Error(`Supabase query failed: ${path} — ${res.status} ${await res.text()}`)
  return res.json()
}

async function runChecks() {
  const issues = []
  const warnings = []
  const stats = {}

  console.log('Running database health checks…')

  // ─── 1. Medications with no matching resident ──────────────────────────────
  try {
    // Fetch all medication resident_ids, then check against residents table
    const meds = await query('medications', '?select=id,medication_name,resident_id,community_id')
    const residents = await query('residents', '?select=id')
    const residentIds = new Set(residents.map(r => r.id))
    const orphanMeds = meds.filter(m => m.resident_id && !residentIds.has(m.resident_id))
    stats.totalMedications = meds.length
    if (orphanMeds.length > 0) {
      issues.push({
        check: 'Orphaned medications',
        count: orphanMeds.length,
        detail: `${orphanMeds.length} medication(s) reference a resident_id that no longer exists.`,
        examples: orphanMeds.slice(0, 3).map(m => `"${m.medication_name}" (med id: ${m.id})`).join(', '),
      })
    }
  } catch (e) { warnings.push(`Could not check orphaned medications: ${e.message}`) }

  // ─── 2. Residents with no community_id ────────────────────────────────────
  try {
    const unscoped = await query('residents', '?select=id,full_name,first_name,last_name&community_id=is.null')
    stats.unscopedResidents = unscoped.length
    if (unscoped.length > 0) {
      issues.push({
        check: 'Residents missing community_id',
        count: unscoped.length,
        detail: `${unscoped.length} resident(s) have no community_id — they are invisible to all facilities.`,
        examples: unscoped.slice(0, 3).map(r => r.full_name || `${r.first_name} ${r.last_name}` || r.id).join(', '),
      })
    }
  } catch (e) { warnings.push(`Could not check unscoped residents: ${e.message}`) }

  // ─── 3. medication_administrations with no matching medication ─────────────
  try {
    const admins = await query('medication_administrations', '?select=id,medication_id,administered_date')
    const meds = await query('medications', '?select=id')
    const medIds = new Set(meds.map(m => m.id))
    const orphanAdmins = admins.filter(a => a.medication_id && !medIds.has(a.medication_id))
    stats.totalAdministrations = admins.length
    if (orphanAdmins.length > 0) {
      issues.push({
        check: 'Orphaned administration records',
        count: orphanAdmins.length,
        detail: `${orphanAdmins.length} administration record(s) reference a medication that no longer exists. These pollute med history.`,
        examples: orphanAdmins.slice(0, 3).map(a => `${a.administered_date} (med id: ${a.medication_id})`).join(', '),
      })
    }
  } catch (e) { warnings.push(`Could not check orphaned administrations: ${e.message}`) }

  // ─── 4. Medications where community_id doesn't match resident's community ──
  try {
    const meds = await query('medications', '?select=id,medication_name,resident_id,community_id')
    const residents = await query('residents', '?select=id,community_id')
    const residentCommunityMap = new Map(residents.map(r => [r.id, r.community_id]))
    const mismatch = meds.filter(m => {
      const residentCommunity = residentCommunityMap.get(m.resident_id)
      return residentCommunity && m.community_id && residentCommunity !== m.community_id
    })
    if (mismatch.length > 0) {
      issues.push({
        check: 'Medication / resident community mismatch',
        count: mismatch.length,
        detail: `${mismatch.length} medication(s) have a community_id that doesn't match their resident's community_id. These will be invisible in the Dispense tab.`,
        examples: mismatch.slice(0, 3).map(m => `"${m.medication_name}" (med id: ${m.id})`).join(', '),
      })
    }
  } catch (e) { warnings.push(`Could not check community mismatches: ${e.message}`) }

  // ─── 5. community_members with no matching profile ─────────────────────────
  try {
    const members = await query('community_members', '?select=id,user_id,role,community_id')
    const profiles = await query('profiles', '?select=user_id')
    const profileIds = new Set(profiles.map(p => p.user_id))
    const noProfile = members.filter(m => !profileIds.has(m.user_id))
    if (noProfile.length > 0) {
      warnings.push(`${noProfile.length} community member(s) have no profile record — they may see a broken app state.`)
    }
  } catch (e) { warnings.push(`Could not check member profiles: ${e.message}`) }

  // ─── 6. Active residents with no medications (informational) ───────────────
  try {
    const activeResidents = await query('residents', '?select=id,full_name,first_name,last_name&status=eq.active')
    const meds = await query('medications', '?select=resident_id')
    const residentIdsWithMeds = new Set(meds.map(m => m.resident_id))
    const noMeds = activeResidents.filter(r => !residentIdsWithMeds.has(r.id))
    stats.activeResidents = activeResidents.length
    stats.activeResidentsWithNoMeds = noMeds.length
  } catch (e) { warnings.push(`Could not check resident medication coverage: ${e.message}`) }

  // ─── 7. Trials expiring in next 3 days ────────────────────────────────────
  try {
    const soon = new Date()
    soon.setDate(soon.getDate() + 3)
    const communities = await query('communities', `?select=id,name,trial_end_date&plan=eq.trial&trial_end_date=lte.${soon.toISOString()}`)
    if (communities.length > 0) {
      warnings.push(`${communities.length} trial(s) expiring in the next 3 days: ${communities.map(c => c.name).join(', ')}`)
    }
  } catch (e) { warnings.push(`Could not check expiring trials: ${e.message}`) }

  return { issues, warnings, stats }
}

async function sendEmail(subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Haven Health Monitor <monitor@havencare.app>',
      to: [ALERT_EMAIL],
      subject,
      html,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error: ${res.status} — ${body}`)
  }
  return res.json()
}

function buildEmailHtml({ issues, warnings, stats, checkedAt }) {
  const statusColor = issues.length > 0 ? '#DC2626' : '#16A34A'
  const statusLabel = issues.length > 0 ? `⚠️ ${issues.length} issue${issues.length > 1 ? 's' : ''} found` : '✅ All checks passed'

  const issueRows = issues.map(i => `
    <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
      <p style="margin:0 0 4px 0;font-weight:600;color:#991B1B;font-size:14px;">${i.check} — ${i.count} record${i.count > 1 ? 's' : ''}</p>
      <p style="margin:0 0 4px 0;color:#374151;font-size:13px;">${i.detail}</p>
      ${i.examples ? `<p style="margin:0;color:#6B7280;font-size:12px;font-family:monospace;">Examples: ${i.examples}</p>` : ''}
    </div>
  `).join('')

  const warningRows = warnings.map(w => `
    <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 16px;margin-bottom:8px;">
      <p style="margin:0;color:#92400E;font-size:13px;">${w}</p>
    </div>
  `).join('')

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#F8FAFC;">
      <div style="background:white;border-radius:16px;padding:24px;border:1px solid #E2E8F0;">
        <h1 style="margin:0 0 4px 0;font-size:20px;color:#042C53;">Haven Database Health Report</h1>
        <p style="margin:0 0 20px 0;color:#94A3B8;font-size:13px;">${checkedAt}</p>

        <div style="background:${statusColor}15;border:1px solid ${statusColor}40;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <p style="margin:0;font-weight:600;color:${statusColor};font-size:16px;">${statusLabel}</p>
        </div>

        ${issues.length > 0 ? `<h2 style="font-size:15px;color:#374151;margin:0 0 10px 0;">Issues (action required)</h2>${issueRows}` : ''}
        ${warnings.length > 0 ? `<h2 style="font-size:15px;color:#374151;margin:16px 0 10px 0;">Warnings</h2>${warningRows}` : ''}

        <h2 style="font-size:15px;color:#374151;margin:16px 0 10px 0;">Stats</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${Object.entries(stats).map(([k, v]) => `
            <tr style="border-bottom:1px solid #F1F5F9;">
              <td style="padding:6px 0;color:#64748B;">${k.replace(/([A-Z])/g, ' $1').toLowerCase()}</td>
              <td style="padding:6px 0;text-align:right;font-weight:600;color:#1E293B;">${v}</td>
            </tr>
          `).join('')}
        </table>

        <p style="margin:20px 0 0 0;font-size:12px;color:#94A3B8;text-align:center;">
          Haven Health Monitor · Automated nightly check
        </p>
      </div>
    </div>
  `
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const { issues, warnings, stats } = await runChecks()
const checkedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' })

console.log(`\nResults: ${issues.length} issue(s), ${warnings.length} warning(s)`)
issues.forEach(i => console.log(`  ❌ ${i.check}: ${i.count}`))
warnings.forEach(w => console.log(`  ⚠️  ${w}`))
console.log('Stats:', stats)

// Always send the report (green = all clear, red = issues found)
const subject = issues.length > 0
  ? `⚠️ Haven DB Health: ${issues.length} issue${issues.length > 1 ? 's' : ''} found`
  : `✅ Haven DB Health: All checks passed`

const html = buildEmailHtml({ issues, warnings, stats, checkedAt })

try {
  await sendEmail(subject, html)
  console.log(`\nReport emailed to ${ALERT_EMAIL}`)
} catch (e) {
  console.error('Failed to send email:', e.message)
  process.exit(1)
}

if (issues.length > 0) {
  console.error('\nExiting with code 1 due to data integrity issues.')
  process.exit(1)
}
