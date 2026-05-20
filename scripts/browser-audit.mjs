/**
 * Phase 2 — Live Browser Auditor
 *
 * Uses Playwright to log into the live app, navigate every key page,
 * capture screenshots + console errors + failed network requests, then
 * sends screenshots to Claude for visual/design analysis.
 * Emails a full report via Resend.
 *
 * Required env vars (GitHub Secrets):
 *   AUDIT_EMAIL        — test account email (e.g. auditor@havencare.app)
 *   AUDIT_PASSWORD     — test account password
 *   ANTHROPIC_API_KEY  — for visual screenshot analysis
 *   RESEND_API_KEY     — for email delivery
 *   ALERT_EMAIL        — where to send the report
 *   PRODUCTION_URL     — e.g. https://the-haven-app.vercel.app
 */

import { chromium } from '@playwright/test'
import Anthropic from '@anthropic-ai/sdk'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SCREENSHOTS_DIR = resolve(ROOT, 'audit-screenshots')

const {
  AUDIT_EMAIL,
  AUDIT_PASSWORD,
  ANTHROPIC_API_KEY,
  RESEND_API_KEY,
  ALERT_EMAIL,
  PRODUCTION_URL = 'https://the-haven-app.vercel.app',
} = process.env

if (!AUDIT_EMAIL || !AUDIT_PASSWORD || !RESEND_API_KEY || !ALERT_EMAIL) {
  console.error('Missing required environment variables.')
  process.exit(1)
}

mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

// Pages to audit — path, friendly name, and what to check
const PAGES = [
  { path: '/', name: 'Marketing', description: 'public landing page' },
  { path: '/login', name: 'Login', description: 'login page' },
  { path: '/dashboard', name: 'Dashboard', description: 'main dashboard with resident cards and stat chips', requiresAuth: true },
  { path: '/dispense', name: 'Dispense', description: 'medication dispensing timeline with time slots and resident rows', requiresAuth: true },
  { path: '/incidents', name: 'Incidents', description: 'incident report list', requiresAuth: true },
  { path: '/vitals', name: 'Vital Signs', description: 'vital signs table for all residents', requiresAuth: true },
  { path: '/shift-log', name: 'Shift Log', description: 'shift handoff notes', requiresAuth: true },
  { path: '/staff', name: 'Staff Directory', description: 'staff list and invite flow', requiresAuth: true },
  { path: '/activities', name: 'Activities', description: 'activity calendar and attendance', requiresAuth: true },
  { path: '/occupancy', name: 'Occupancy', description: 'occupancy dashboard and prospect pipeline', requiresAuth: true },
]

async function analyzeScreenshot(screenshotPath, pageName, pageDescription) {
  if (!anthropic) return null
  try {
    const imageData = readFileSync(screenshotPath)
    const base64 = imageData.toString('base64')
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: base64 },
          },
          {
            type: 'text',
            text: `This is a screenshot of the "${pageName}" page (${pageDescription}) of Haven, a senior living facility management app.

Review it for:
1. Visual bugs (misaligned elements, overlapping text, broken layouts)
2. Design inconsistencies (wrong colors, odd spacing, truncated content)
3. Empty states that look broken vs. intentional
4. Anything that looks unfinished or confusing to a facility staff member

Respond in 3 bullet points max. Be specific and concise. If everything looks good, say "No visual issues detected." Don't describe what you see — only flag problems.`,
          },
        ],
      }],
    })
    return response.content[0].text
  } catch (e) {
    return `Visual analysis unavailable: ${e.message}`
  }
}

// ─── Main audit run ─────────────────────────────────────────────────────────

const pageResults = []
const globalIssues = []
let browser, context, page

try {
  console.log('Launching browser…')
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro — staff use phones
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  })
  page = await context.newPage()

  // Collect all console errors and failed network requests globally
  const consoleErrors = []
  const failedRequests = []

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() })
  })
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText, page: page.url() })
  })
  page.on('response', res => {
    if (res.status() >= 500) {
      failedRequests.push({ url: res.url(), failure: `HTTP ${res.status()}`, page: page.url() })
    }
  })

  // ── Log in ───────────────────────────────────────────────────────────────
  console.log('Logging in…')
  await page.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', AUDIT_EMAIL)
  await page.fill('input[type="password"]', AUDIT_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${PRODUCTION_URL}/dashboard`, { timeout: 15000 }).catch(() => {})

  const currentUrl = page.url()
  if (!currentUrl.includes('/dashboard')) {
    globalIssues.push(`Login failed — ended up at ${currentUrl} instead of /dashboard`)
    console.error('Login failed')
  } else {
    console.log('Login successful')
  }

  // ── Audit each page ──────────────────────────────────────────────────────
  for (const p of PAGES) {
    const result = { name: p.name, path: p.path, errors: [], warnings: [], visualAnalysis: null, screenshotFile: null }
    console.log(`\nAuditing ${p.name} (${p.path})…`)

    const pageConsoleErrors = []
    const pageFailedRequests = []

    try {
      await page.goto(`${PRODUCTION_URL}${p.path}`, { waitUntil: 'networkidle', timeout: 20000 })
      await page.waitForTimeout(1500) // let animations settle

      // Check if we got redirected away (e.g. auth guard)
      const finalUrl = page.url()
      if (p.requiresAuth && !finalUrl.includes(p.path)) {
        result.warnings.push(`Redirected to ${finalUrl.replace(PRODUCTION_URL, '')} — may indicate auth issue`)
      }

      // Check for React error boundaries (our custom crash screen)
      const crashText = await page.locator('text=Something went wrong').count()
      if (crashText > 0) result.errors.push('Page shows crash error boundary — JavaScript error occurred')

      // Check for blank/empty content
      const bodyText = await page.locator('body').innerText()
      if (bodyText.trim().length < 50) result.warnings.push('Page appears nearly empty — possible loading failure')

      // Capture screenshot
      const filename = `${p.name.toLowerCase().replace(/\s+/g, '-')}.png`
      const screenshotPath = resolve(SCREENSHOTS_DIR, filename)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      result.screenshotFile = screenshotPath
      console.log(`  Screenshot saved`)

      // AI visual analysis
      if (anthropic) {
        console.log(`  Running visual analysis…`)
        result.visualAnalysis = await analyzeScreenshot(screenshotPath, p.name, p.description)
        console.log(`  Analysis: ${result.visualAnalysis?.substring(0, 80)}…`)
      }

    } catch (e) {
      result.errors.push(`Page failed to load: ${e.message}`)
    }

    // Attach console errors that happened during this page's load
    result.consoleErrors = consoleErrors.filter(e => e.url.includes(p.path))
    result.failedRequests = failedRequests.filter(r => r.page.includes(p.path))

    pageResults.push(result)
  }

  // ── Also audit mobile vs desktop layout ─────────────────────────────────
  console.log('\nChecking desktop layout of Dashboard…')
  await context.close()
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const desktopPage = await desktopContext.newPage()

  try {
    await desktopPage.goto(`${PRODUCTION_URL}/login`, { waitUntil: 'networkidle' })
    await desktopPage.fill('input[type="email"]', AUDIT_EMAIL)
    await desktopPage.fill('input[type="password"]', AUDIT_PASSWORD)
    await desktopPage.click('button[type="submit"]')
    await desktopPage.waitForURL(`${PRODUCTION_URL}/dashboard`, { timeout: 15000 }).catch(() => {})
    await desktopPage.waitForTimeout(1500)
    await desktopPage.screenshot({ path: resolve(SCREENSHOTS_DIR, 'dashboard-desktop.png'), fullPage: false })
    console.log('Desktop screenshot saved')
  } catch (e) {
    console.warn('Desktop check failed:', e.message)
  }
  await desktopContext.close()

} finally {
  if (browser) await browser.close()
}

// ─── Build email report ─────────────────────────────────────────────────────

const allErrors = pageResults.flatMap(p => p.errors.map(e => `${p.name}: ${e}`))
const allWarnings = pageResults.flatMap(p => p.warnings.map(w => `${p.name}: ${w}`))
const allConsoleErrors = pageResults.flatMap(p => (p.consoleErrors || []).map(e => `${p.name}: ${e.text}`))
const allFailedRequests = pageResults.flatMap(p => (p.failedRequests || []).map(r => `${p.name}: ${r.url} (${r.failure})`))

const totalIssues = allErrors.length + globalIssues.length + allConsoleErrors.length
const checkedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' })

const statusColor = totalIssues > 0 ? '#DC2626' : '#16A34A'
const statusLabel = totalIssues > 0
  ? `⚠️ ${totalIssues} issue${totalIssues > 1 ? 's' : ''} found across ${pageResults.length} pages`
  : `✅ All ${pageResults.length} pages passed — no issues detected`

function issueBlock(items, color, bg, border) {
  return items.map(i => `
    <div style="background:${bg};border:1px solid ${border};border-radius:6px;padding:8px 12px;margin-bottom:6px;">
      <p style="margin:0;color:${color};font-size:13px;">${i}</p>
    </div>
  `).join('')
}

const pageRows = pageResults.map(p => {
  const statusDot = p.errors.length > 0 ? '🔴' : p.warnings.length > 0 ? '🟡' : '🟢'
  const hasVisual = p.visualAnalysis && !p.visualAnalysis.includes('No visual issues')
  return `
    <tr style="border-bottom:1px solid #F1F5F9;vertical-align:top;">
      <td style="padding:8px 0;font-weight:500;color:#1E293B;font-size:13px;">${statusDot} ${p.name}</td>
      <td style="padding:8px 0;font-family:monospace;font-size:11px;color:#64748B;">${p.path}</td>
      <td style="padding:8px 0;font-size:12px;color:${p.errors.length > 0 ? '#DC2626' : '#16A34A'};">${p.errors.length > 0 ? p.errors.length + ' error(s)' : 'OK'}</td>
      <td style="padding:8px 4px;font-size:11px;color:${hasVisual ? '#92400E' : '#64748B'};">${p.visualAnalysis ? (hasVisual ? '⚠️ See below' : '✓ Clean') : '—'}</td>
    </tr>
  `
}).join('')

const visualSections = pageResults
  .filter(p => p.visualAnalysis && !p.visualAnalysis.includes('No visual issues'))
  .map(p => `
    <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:12px 16px;margin-bottom:10px;">
      <p style="margin:0 0 6px 0;font-weight:600;color:#92400E;font-size:13px;">${p.name} — Visual issues</p>
      <p style="margin:0;color:#374151;font-size:13px;white-space:pre-wrap;">${p.visualAnalysis}</p>
    </div>
  `).join('')

const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:660px;margin:0 auto;padding:24px;background:#F8FAFC;">
  <div style="background:white;border-radius:16px;padding:24px;border:1px solid #E2E8F0;">
    <div style="margin-bottom:4px;">
      <h1 style="margin:0;font-size:18px;color:#042C53;display:inline;">Haven Browser Audit Report</h1>
      <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;background:#7C3AED20;color:#7C3AED;margin-left:8px;">Phase 2 · Live Browser</span>
    </div>
    <p style="margin:0 0 20px 0;color:#94A3B8;font-size:13px;">${checkedAt} · Mobile viewport (iPhone 14 Pro)</p>

    <div style="background:${statusColor}15;border:1px solid ${statusColor}40;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-weight:600;color:${statusColor};font-size:15px;">${statusLabel}</p>
    </div>

    ${globalIssues.length > 0 ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em;">Critical</h2>${issueBlock(globalIssues, '#991B1B', '#FEF2F2', '#FCA5A5')}` : ''}
    ${allErrors.length > 0 ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;">Page Errors</h2>${issueBlock(allErrors, '#991B1B', '#FEF2F2', '#FCA5A5')}` : ''}
    ${allConsoleErrors.length > 0 ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;">Console Errors</h2>${issueBlock(allConsoleErrors.slice(0, 10), '#92400E', '#FFFBEB', '#FCD34D')}` : ''}
    ${allFailedRequests.length > 0 ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;">Failed Network Requests</h2>${issueBlock(allFailedRequests.slice(0, 10), '#92400E', '#FFFBEB', '#FCD34D')}` : ''}
    ${allWarnings.length > 0 ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;">Warnings</h2>${issueBlock(allWarnings, '#92400E', '#FFFBEB', '#FCD34D')}` : ''}
    ${visualSections ? `<h2 style="font-size:13px;font-weight:600;color:#374151;margin:16px 0 8px;text-transform:uppercase;letter-spacing:.05em;">AI Visual Analysis</h2>${visualSections}` : ''}

    <h2 style="font-size:13px;font-weight:600;color:#374151;margin:20px 0 8px;text-transform:uppercase;letter-spacing:.05em;">Pages Audited</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="border-bottom:2px solid #E2E8F0;">
        <th style="padding:6px 0;text-align:left;color:#94A3B8;font-size:11px;font-weight:600;">PAGE</th>
        <th style="padding:6px 0;text-align:left;color:#94A3B8;font-size:11px;font-weight:600;">PATH</th>
        <th style="padding:6px 0;text-align:left;color:#94A3B8;font-size:11px;font-weight:600;">STATUS</th>
        <th style="padding:6px 0;text-align:left;color:#94A3B8;font-size:11px;font-weight:600;">VISUAL</th>
      </tr>
      ${pageRows}
    </table>

    <p style="margin:20px 0 0 0;font-size:12px;color:#94A3B8;text-align:center;">Haven App Auditor · Phase 2 · Automated daily browser check</p>
  </div>
</div>`

// ─── Send email ─────────────────────────────────────────────────────────────
console.log(`\nTotal issues: ${totalIssues} errors, ${allWarnings.length} warnings`)

const subject = totalIssues > 0
  ? `⚠️ Haven Browser Audit: ${totalIssues} issue${totalIssues > 1 ? 's' : ''} found`
  : `✅ Haven Browser Audit: All ${pageResults.length} pages clean`

const emailRes = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: 'Haven Auditor <monitor@havencare.app>', to: [ALERT_EMAIL], subject, html }),
})

if (!emailRes.ok) {
  console.error('Email failed:', await emailRes.text())
  process.exit(1)
}

console.log(`✅ Report emailed to ${ALERT_EMAIL}`)
if (totalIssues > 0) process.exit(1)
