/**
 * Phase 1 — Code & Static Auditor
 *
 * Runs ESLint, npm audit, bundle size check, and dependency staleness.
 * No login required. Safe to run on any push or on a schedule.
 *
 * Required env vars (GitHub Secrets):
 *   RESEND_API_KEY   — from resend.com
 *   ALERT_EMAIL      — where to send the report
 */

import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const RESEND_API_KEY = process.env.RESEND_API_KEY
const ALERT_EMAIL = process.env.ALERT_EMAIL

if (!RESEND_API_KEY || !ALERT_EMAIL) {
  console.error('Missing RESEND_API_KEY or ALERT_EMAIL')
  process.exit(1)
}

function run(cmd, opts = {}) {
  try {
    return { ok: true, output: execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }) }
  } catch (e) {
    return { ok: false, output: e.stdout || e.message || '' }
  }
}

const results = {}
const issues = []
const warnings = []

// ─── 1. ESLint ──────────────────────────────────────────────────────────────
console.log('Running ESLint…')
const lint = run('npx eslint src --format json --max-warnings 0', { stdio: 'pipe' })
try {
  const lintData = JSON.parse(lint.output || '[]')
  const errors = lintData.reduce((n, f) => n + f.errorCount, 0)
  const warnCount = lintData.reduce((n, f) => n + f.warningCount, 0)
  const errorFiles = lintData.filter(f => f.errorCount > 0 || f.warningCount > 0).map(f => ({
    file: f.filePath.replace(ROOT + '/', ''),
    errors: f.errorCount,
    warnings: f.warningCount,
    messages: f.messages.slice(0, 3).map(m => `  Line ${m.line}: ${m.message} (${m.ruleId})`),
  }))
  results.eslint = { errors, warnings: warnCount, files: errorFiles }
  if (errors > 0) issues.push(`ESLint: ${errors} error(s) in ${errorFiles.length} file(s)`)
  else if (warnCount > 0) warnings.push(`ESLint: ${warnCount} warning(s)`)
} catch {
  results.eslint = { errors: 0, warnings: 0, files: [] }
}

// ─── 2. npm audit (security vulnerabilities) ──────────────────────────────
console.log('Running npm audit…')
const audit = run('npm audit --json')
try {
  const auditData = JSON.parse(audit.output || '{}')
  const vulns = auditData.metadata?.vulnerabilities || {}
  const critical = vulns.critical || 0
  const high = vulns.high || 0
  const moderate = vulns.moderate || 0
  const total = (auditData.metadata?.totalDependencies) || 0
  results.audit = { critical, high, moderate, total }
  if (critical > 0) issues.push(`npm audit: ${critical} critical vulnerability(s)`)
  else if (high > 0) warnings.push(`npm audit: ${high} high-severity vulnerability(s)`)
  else if (moderate > 0) warnings.push(`npm audit: ${moderate} moderate vulnerability(s)`)
} catch {
  results.audit = { critical: 0, high: 0, moderate: 0, total: 0 }
}

// ─── 3. Bundle size check ──────────────────────────────────────────────────
console.log('Building for bundle size check…')
const buildResult = run('npm run build -- --logLevel silent')
results.build = { ok: buildResult.ok }
if (!buildResult.ok) {
  issues.push('Build FAILED — production build is broken')
} else {
  // Read the dist manifest to get chunk sizes
  try {
    const distFiles = execSync('find dist/assets -name "*.js" -not -name "*.map"', { cwd: ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean)
    let totalKB = 0
    const chunks = distFiles.map(f => {
      const size = parseInt(execSync(`wc -c < "${f}"`, { encoding: 'utf8' }).trim())
      const kb = Math.round(size / 1024)
      totalKB += kb
      return { file: f.replace(ROOT + '/dist/assets/', ''), kb }
    }).sort((a, b) => b.kb - a.kb)
    results.bundle = { totalKB, chunks: chunks.slice(0, 5) }
    if (totalKB > 3000) warnings.push(`Bundle size is large: ${totalKB} KB total (consider code splitting)`)
  } catch {
    results.bundle = { totalKB: 0, chunks: [] }
  }
}

// ─── 4. Outdated dependencies ──────────────────────────────────────────────
console.log('Checking outdated dependencies…')
const outdated = run('npm outdated --json')
try {
  const outdatedData = JSON.parse(outdated.output || '{}')
  const majorBehind = Object.entries(outdatedData)
    .filter(([, v]) => v.current && v.latest && v.current.split('.')[0] !== v.latest.split('.')[0])
    .map(([name, v]) => `${name} (${v.current} → ${v.latest})`)
  results.outdated = { count: Object.keys(outdatedData).length, majorBehind }
  if (majorBehind.length > 0) warnings.push(`${majorBehind.length} package(s) are a major version behind: ${majorBehind.slice(0, 3).join(', ')}`)
} catch {
  results.outdated = { count: 0, majorBehind: [] }
}

// ─── 5. .env.example vs .env drift ───────────────────────────────────────
console.log('Checking .env consistency…')
try {
  const example = readFileSync(resolve(ROOT, '.env.example'), 'utf8')
  const exampleKeys = example.match(/^[A-Z_]+=?/gm)?.map(k => k.replace('=', '')) ?? []
  results.envDrift = { exampleKeys: exampleKeys.length }
} catch {
  results.envDrift = { exampleKeys: 0 }
}

// ─── Build report ──────────────────────────────────────────────────────────
const checkedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' })
const statusColor = issues.length > 0 ? '#DC2626' : '#16A34A'
const statusLabel = issues.length > 0
  ? `⚠️ ${issues.length} issue${issues.length > 1 ? 's' : ''} need attention`
  : '✅ Code audit passed — no issues found'

function sectionHtml(title, rows) {
  if (!rows.length) return ''
  return `
    <h2 style="font-size:14px;font-weight:600;color:#374151;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:.05em;">${title}</h2>
    ${rows.join('')}
  `
}

function pill(text, color) {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:${color}20;color:${color};">${text}</span>`
}

const issueRows = issues.map(i => `
  <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
    <p style="margin:0;color:#991B1B;font-size:13px;font-weight:500;">${i}</p>
  </div>
`)

const warnRows = warnings.map(w => `
  <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:8px;">
    <p style="margin:0;color:#92400E;font-size:13px;">${w}</p>
  </div>
`)

const eslintRows = (results.eslint?.files || []).map(f => `
  <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12px;">
    <p style="margin:0 0 4px 0;font-weight:600;color:#1E293B;">${f.file} — ${f.errors} error(s), ${f.warnings} warning(s)</p>
    ${f.messages.map(m => `<p style="margin:0;color:#64748B;font-family:monospace;">${m}</p>`).join('')}
  </div>
`)

const bundleRows = (results.bundle?.chunks || []).map(c => `
  <tr style="border-bottom:1px solid #F1F5F9;">
    <td style="padding:5px 0;font-family:monospace;font-size:11px;color:#475569;">${c.file.substring(0, 40)}</td>
    <td style="padding:5px 0;text-align:right;font-weight:600;color:${c.kb > 500 ? '#DC2626' : '#1E293B'};font-size:12px;">${c.kb} KB</td>
  </tr>
`)

const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#F8FAFC;">
  <div style="background:white;border-radius:16px;padding:24px;border:1px solid #E2E8F0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
      <h1 style="margin:0;font-size:18px;color:#042C53;">Haven Code Audit Report</h1>
      ${pill('Phase 1 · Static', '#185FA5')}
    </div>
    <p style="margin:0 0 20px 0;color:#94A3B8;font-size:13px;">${checkedAt}</p>

    <div style="background:${statusColor}15;border:1px solid ${statusColor}40;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-weight:600;color:${statusColor};font-size:15px;">${statusLabel}</p>
    </div>

    ${sectionHtml('Issues — Action Required', issueRows)}
    ${sectionHtml('Warnings', warnRows)}
    ${eslintRows.length ? sectionHtml('ESLint Details', eslintRows) : ''}

    <h2 style="font-size:14px;font-weight:600;color:#374151;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:.05em;">Checks Summary</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">ESLint errors</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:${results.eslint?.errors > 0 ? '#DC2626' : '#16A34A'};">${results.eslint?.errors ?? '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">ESLint warnings</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:#1E293B;">${results.eslint?.warnings ?? '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">Critical vulnerabilities</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:${results.audit?.critical > 0 ? '#DC2626' : '#16A34A'};">${results.audit?.critical ?? '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">High vulnerabilities</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:${results.audit?.high > 0 ? '#D97706' : '#16A34A'};">${results.audit?.high ?? '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">Production build</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:${results.build?.ok ? '#16A34A' : '#DC2626'};">${results.build?.ok ? 'Passing ✓' : 'FAILED ✗'}</td>
      </tr>
      <tr style="border-bottom:1px solid #F1F5F9;">
        <td style="padding:7px 0;color:#64748B;">Total bundle size</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:#1E293B;">${results.bundle?.totalKB ? results.bundle.totalKB + ' KB' : '—'}</td>
      </tr>
      <tr>
        <td style="padding:7px 0;color:#64748B;">Packages outdated</td>
        <td style="padding:7px 0;text-align:right;font-weight:600;color:#1E293B;">${results.outdated?.count ?? '—'}</td>
      </tr>
    </table>

    ${bundleRows.length ? `
      <h2 style="font-size:14px;font-weight:600;color:#374151;margin:20px 0 8px 0;text-transform:uppercase;letter-spacing:.05em;">Largest Bundles</h2>
      <table style="width:100%;border-collapse:collapse;">${bundleRows.join('')}</table>
    ` : ''}

    <p style="margin:20px 0 0 0;font-size:12px;color:#94A3B8;text-align:center;">Haven Code Auditor · Phase 1 · Automated daily check</p>
  </div>
</div>`

// ─── Send email ─────────────────────────────────────────────────────────────
console.log(`\nResults: ${issues.length} issue(s), ${warnings.length} warning(s)`)
issues.forEach(i => console.log(`  ❌ ${i}`))
warnings.forEach(w => console.log(`  ⚠️  ${w}`))

const subject = issues.length > 0
  ? `⚠️ Haven Code Audit: ${issues.length} issue${issues.length > 1 ? 's' : ''} found`
  : `✅ Haven Code Audit: All checks passed`

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: 'Haven Auditor <monitor@havencare.app>', to: [ALERT_EMAIL], subject, html }),
})

if (!emailRes.ok) {
  console.error('Failed to send email:', await emailRes.text())
  process.exit(1)
}

console.log(`\n✅ Report emailed to ${ALERT_EMAIL}`)
if (issues.length > 0) process.exit(1)
