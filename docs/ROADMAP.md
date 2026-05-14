# The Haven — Product Roadmap

> Track what's been built, what's in progress, and what's coming next.
> Update this file whenever a feature ships or a new idea is added.

---

## Status Legend
- ✅ **Done** — Shipped and working
- 🚧 **In Progress** — Currently being built
- 📋 **Planned** — Decided, not started
- 💡 **Idea** — Considering, not committed

---

## Core Features

### Residents
- ✅ Resident list with search and filters
- ✅ Resident detail page
- ✅ Add / edit / archive residents
- ✅ Room assignment
- ✅ Profile photo
- ✅ Emergency contacts
- 📋 Move-in / move-out workflow
- 📋 Resident document uploads (care plans, legal docs)

### Medications
- ✅ Medication list per resident
- ✅ Dispense log (record medication administration)
- ✅ Medication history view
- ✅ Frequency scheduling
- 📋 Medication refill alerts
- 💡 eMAR (electronic medication administration record) export

### Health & Vitals
- ✅ Vital signs tracking (blood pressure, temp, weight, etc.)
- ✅ ADL (Activities of Daily Living) tracking
- 📋 Trend charts for vitals over time
- 💡 Care plan integration

### Staff
- ✅ Staff directory
- ✅ Staff certifications tracker (with expiry alerts)
- ✅ Shift log
- ✅ Schedule
- 📋 Staff document storage
- 💡 Payroll export

### Incidents
- ✅ Incident reporting
- ✅ Incident log with filters
- 📋 Incident report PDF export
- 💡 Regulatory reporting templates

### Maintenance
- ✅ Maintenance request submission
- ✅ Request status tracking
- 📋 Vendor management
- 💡 Preventive maintenance schedules

### Billing & Occupancy
- ✅ Billing records
- ✅ Occupancy tracking
- 📋 Invoice generation
- 💡 Payment processing integration

### Activities & Transportation
- ✅ Activities calendar
- ✅ Transportation log
- ✅ Calendar view
- 💡 Family-facing activity schedule

### Family Communication
- ✅ Family view (read-only portal)
- 📋 Family notification system
- 💡 Family messaging

### Administration
- ✅ Facility settings
- ✅ Community picker (multi-community)
- ✅ Super Admin / Owner Panel
- ✅ Onboarding flow
- 📋 Audit log

---

## Design & UX Improvements

### Completed
- ✅ Inter font (modern typography)
- ✅ Animated login screen (dark gradient + floating blobs + glassmorphic card)
- ✅ Skeleton loading states (Dashboard)
- ✅ Stat card icons with colored backgrounds
- ✅ Button gradients + micro-interactions (`active:scale-95`, `hover:-translate-y-1`)
- ✅ Mobile-responsive layout (bottom nav, sidebar on desktop)
- ✅ Page transition animation (`animate-page-in`)
- ✅ Owner Panel navigation bug fix (race condition)

### Planned Design Work
- 📋 Toast notification system (replace all `alert()` calls)
- 📋 Sidebar active indicator polish + icon spacing
- 📋 Desktop layout expansion (`max-w-5xl` → `max-w-7xl`)
- 📋 Consistent color system / semantic tokens across all pages
- 📋 Empty state illustrations (SVG spot art)
- 📋 Logo / brand mark in Navbar
- 📋 Skeleton loading on all pages (not just Dashboard)
- 💡 Dark mode

---

## Infrastructure & Technical

- ✅ Supabase Auth + RLS
- ✅ Multi-community support
- ✅ Vercel deployment
- ✅ React Router v6 SPA routing
- 📋 Git commit discipline + organized history
- 📋 Error boundary components
- 💡 Unit tests (Vitest)
- 💡 End-to-end tests (Playwright)
- 💡 PWA support (installable on mobile home screen)

---

## Business & Marketing

- 💡 Marketing landing page (separate from app)
- 💡 Pricing page
- 💡 Demo / trial community setup
- 💡 Email onboarding sequence
- 💡 Help documentation / knowledge base

---

## Version History

| Date | What shipped |
|---|---|
| 2026-05-14 | Login screen redesign, skeleton loading, Inter font, stat card icons, button interactions |
| 2026-05-14 | Owner Panel navigation bug fix |
| 2026-05-14 | Project organization: CLAUDE.md, docs/ folder created |
| — | Initial app build (residents, medications, staff, incidents, maintenance, billing) |
