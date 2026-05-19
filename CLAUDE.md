# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What Is This App?

**The Haven** is a multi-tenant senior living facility management SaaS. One Supabase project hosts every customer community. Features include resident management, medication dispensing, incidents, billing, activities, staff scheduling, and a family portal.

- **Owner:** Dominick Coloma (domcoloma@gmail.com)
- **Live URL:** https://the-haven-app.vercel.app
- **Supabase project:** gpclfdnkvkffpjccurqh.supabase.co

---

## Commands

```bash
npm run dev       # local dev server (Vite, port 5173)
npm run build     # production build — run before committing UI changes
npm run lint      # ESLint check
npm run preview   # preview production build locally
```

Deploy is automatic — `git push origin main` triggers Vercel.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 — uses `@theme` in `index.css`, **no** `tailwind.config.js` |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Routing | React Router v6 |
| Hosting | Vercel |
| Font | Inter (loaded via Google Fonts in `index.html`) |

---

## Architecture

### No backend server
The frontend calls Supabase directly. There is no API layer. All auth and data access go through `@supabase/supabase-js`.

### Entry point chain
```
index.html → src/main.jsx → src/App.jsx (routes + ProtectedRoute)
```
`main.jsx` wraps the app in three context providers: `CommunityProvider`, `ProfileProvider`, `FacilityProvider`.

### Layout system
Every page (except Login and CommunityPicker) wraps its content in `<Layout>` from `src/components/layout/Layout.jsx`. Layout renders `Navbar` + `Sidebar` (desktop) or `MobileNav` (mobile) + `{children}`.

### Routing
All routes live in `src/App.jsx`. `ProtectedRoute` checks:
1. Supabase session exists → else redirect to `/login`
2. `communityId` is set → else redirect to `/community` (multi-community picker)

**Critical gotcha:** Never call `setCommunityId(null)` before `navigate('/superadmin')`. It causes ProtectedRoute to intercept. Navigate first, then clear in a `setTimeout`.

---

## Multi-Tenancy & Security

### Two-layer isolation model
Every query uses **both** layers:

1. **App-level filter:** `.eq('community_id', communityId)` on every Supabase query. Never omit this.
2. **Database-level RLS:** Every table has tenant-scoped policies using helper functions:
   - `public.user_community_ids()` — returns community IDs the current user belongs to
   - `public.is_super_admin()` — true for emails in the `super_admins` table

### CommunityContext (`src/context/CommunityContext.jsx`)
Manages the active community. Key behavior:
- On every `load()`, the stored `localStorage` value is **validated** against the user's actual `community_members` rows. A stale value from a previous user is discarded.
- On `SIGNED_IN` auth event, `localStorage` is cleared before `load()` runs.
- `communityId` is available via `useCommunity()` throughout the app.

### Tables without direct `community_id`
Some tables scope through `resident_id` instead: `health_care`, `emergency_contacts`, `lease_terms`, `medication_administrations`, `resident_photos`. RLS on these joins through `residents.community_id`.

### Super admin
Determined by presence in the `super_admins` table (checked by email). RLS is intentionally **disabled** on `super_admins` and `admin_invites` — they are only accessed via service-role context or the super admin panel.

---

## Medication Flow (Critical)

Medications must have **both** `resident_id` and `community_id` set to function correctly.

- **Adding meds:** `MedicationList.jsx` → `MedicationModal` pulls `communityId` from `useCommunity()` and includes it in every insert. If `community_id` is null, the medication is invisible to the Dispense tab.
- **Dispense tab:** Fetches medications with `.eq('community_id', communityId)`, then filters by `scheduled_times.length > 0` and `residents.status !== 'inactive'`. PRN medications (`frequency_type = 'prn'`) appear in the PRN tab only, not the routine tab.
- **Frequency logic:** `src/lib/medStatus.js` exports `isMedDueOnDate()` — the single source of truth for whether a med appears on a given date. Used by both Dispense and Dashboard.
- **Administration keys:** `adminKey(medicationId, time)` returns `"uuid::HH:MM"` — used as the Map key for tracking given/not-given state in Dispense.

### Dispense UI structure
Time slots → Resident rows (collapsed by default) → Medication rows with Given / Refused / Withheld buttons. State:
- `expandedTimes: Set<time>` — which time slots are open
- `expandedResidents: Set<"time::residentId">` — which resident rows are open within a time slot

---

## Key Shared Utilities

| File | Purpose |
|---|---|
| `src/lib/supabase.js` | Supabase client (reads from `.env`) |
| `src/lib/medStatus.js` | `adminKey()`, `isMedDueOnDate()`, `computeResidentStatus()`, `RING_COLOR`, `ringBoxShadow()` |
| `src/lib/colors.js` | `RESIDENT_COLORS`, `getColor(colorName)` — resident avatar color palette |
| `src/lib/trial.js` | Trial signup via `supabase.rpc('complete_trial', ...)` — atomic Postgres transaction |
| `src/lib/incidentPDF.js` | jsPDF-based incident report generator |
| `src/hooks/useIsMobile.js` | Returns `true` if `window.innerWidth < 768px` |
| `src/hooks/useUnsavedChanges.js` | Warns on page unload if form is dirty |

---

## Brand & Design

- **Primary blue:** `#185FA5` — primary actions, focus rings
- **Hover blue:** `#0C447C`
- **Background:** `bg-slate-50`
- **Cards:** `bg-white border border-slate-200 rounded-2xl`
- **Inputs:** `border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent`
- **Destructive:** `red-500`
- **Default text:** `text-sm`
- Mobile-first — staff use phones; test on narrow viewports.
- Skeleton loading states (from `src/components/ui/Skeleton.jsx`) instead of spinners.

---

## Database Schema

Full schema lives in `supabase-schema-full.sql`. Migration files:
- `supabase-migration-rls-tenant-scope.sql` — all RLS policies
- `supabase-migration-trial-signup-rpc.sql` — `complete_trial()` RPC
- `supabase-migration-fk-cascades.sql` — FK cascade rules
- `supabase-migration-medication-not-given.sql` — not-given tracking table
- `supabase-migration-missing-columns.sql` — `residents.move_out_date`

Apply new migrations in the Supabase SQL Editor. All migration files are idempotent (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`) and include a `-- ROLLBACK` section.

### Key tables
- `communities` — one row per facility; has `plan`, `trial_start_date`, `trial_end_date`
- `community_members` — user ↔ community with `role` (`admin` | `staff`)
- `residents` — `community_id`, `status` (`active` | `inactive`), `color` (for avatar bg)
- `medications` — must have both `resident_id` AND `community_id`; `scheduled_times text[]`; `frequency_type` (`daily` | `specific_days` | `every_x_days` | `one_time` | `prn`)
- `medication_administrations` — no direct `community_id`; scoped via `resident_id`
- `prn_administrations` — stores `medication_name` + `dose` as text (not a FK to medications)
- `profiles` — one per auth user; `user_id` has unique constraint; `onboarding_complete`, `profile_completed`

---

## Conventions

- Every Supabase query must include `.eq('community_id', communityId)` — or scope through `resident_id` for tables without a direct `community_id` column.
- No `alert()` — use inline error state or toast (react-hot-toast planned).
- No `window.location.href` — use React Router's `navigate()`.
- No `tailwind.config.js` — custom animations go in `@theme` inside `index.css`, applied via inline `style={{ animation: '...' }}`.
- Orphan files were cleaned up in May 2026: `ResidentList.jsx`, `SuperAdminBar.jsx`, `LeaseForm.jsx`, `GettingStartedChecklist.jsx` — do not recreate unless intentionally re-wiring.
