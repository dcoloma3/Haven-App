# The Haven — Claude Briefing Document

> Read this file at the start of every session. It contains everything needed to work on this project without asking repeated questions.

---

## What Is This App?

**The Haven** is a senior living facility management platform built for community owners and administrators. It handles resident management, medications, staff, certifications, incidents, maintenance, billing, and more — all in one place.

- **Owner:** Dominick Coloma (domcoloma@gmail.com)
- **Business model:** Multi-community SaaS — one owner can manage multiple communities
- **Target users:** Community admins, staff, family members, and the platform owner (super admin)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 (uses `@theme` directive, no `tailwind.config.js`) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Routing | React Router v6 |
| Hosting | Vercel |
| Font | Inter (Google Fonts, loaded in `index.html`) |

**Important Tailwind v4 note:** Custom animations go in `@theme` inside `index.css`. There is no `tailwind.config.js`. Blob animations are defined as `@keyframes` in `index.css` and applied via inline `style={{ animation: '...' }}`.

---

## Brand & Design

See `docs/BRAND.md` for the full style guide. Quick reference:

- **Primary blue:** `#185FA5`
- **Dark blue (hover):** `#0C447C`
- **Light blue (accent):** `#378ADD`
- **Background:** `bg-slate-50`
- **Cards:** `bg-white border border-slate-200 rounded-2xl`
- **Font:** Inter (weights: 400, 500, 600, 700, 800)

### Design Philosophy
- Clean, modern, clinical-but-warm aesthetic
- Glassmorphism on auth screens (`backdrop-filter: blur(24px)`)
- Skeleton loading states instead of spinners
- Subtle micro-interactions: `hover:-translate-y-1`, `active:scale-95`
- Mobile-first — the app is used heavily on phones by staff

---

## Project File Structure

```
haven-app/
├── CLAUDE.md                  ← You are here
├── docs/                      ← Reference docs (brand, architecture, roadmap)
├── index.html                 ← Google Fonts loaded here
├── src/
│   ├── index.css              ← Global styles, keyframes, Tailwind theme
│   ├── main.jsx               ← App entry point
│   ├── App.jsx                ← Router, ProtectedRoute logic
│   ├── assets/                ← Static assets
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.jsx     ← Main wrapper (Navbar + Sidebar/MobileNav + main)
│   │   │   ├── Navbar.jsx     ← Top bar, community switcher, user dropdown
│   │   │   ├── Sidebar.jsx    ← Desktop left nav
│   │   │   └── MobileNav.jsx  ← Bottom tab bar on mobile
│   │   └── ui/
│   │       └── Skeleton.jsx   ← Skeleton loading components
│   ├── context/
│   │   ├── CommunityContext.jsx  ← Active community ID, membership list
│   │   ├── FacilityContext.jsx   ← Facility-level settings
│   │   └── ProfileContext.jsx    ← Logged-in user profile
│   ├── hooks/
│   │   └── useIsMobile.js     ← Returns true if viewport < 768px
│   ├── lib/
│   │   └── supabase.js        ← Supabase client (reads from .env)
│   └── pages/                 ← One file per route
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── SuperAdmin.jsx      ← Owner-only panel
│       ├── CommunityPicker.jsx ← Multi-community switcher
│       ├── Certifications.jsx
│       ├── StaffDirectory.jsx
│       ├── Incidents.jsx
│       ├── Maintenance.jsx
│       ├── Schedule.jsx
│       ├── ShiftLog.jsx
│       ├── Billing.jsx
│       ├── Occupancy.jsx
│       ├── VitalSigns.jsx
│       ├── Dispense.jsx
│       ├── MedicationHistory.jsx
│       ├── Activities.jsx
│       ├── Transportation.jsx
│       ├── Calendar.jsx
│       ├── FamilyView.jsx
│       ├── MyProfile.jsx
│       ├── FacilitySettings.jsx
│       └── ... (more in subdirectories)
```

---

## Auth & Roles

- **Authentication:** Supabase Auth (email + password)
- **Roles:** `admin`, `staff`, `family` — stored in `community_members` table
- **Super admin:** Determined by a `superadmins` table; has access to `/superadmin` Owner Panel
- **Route protection:** `ProtectedRoute` in `App.jsx` checks auth + community membership
- **Multi-community:** One user can be admin of multiple communities; `CommunityPicker` lets them switch

### Known Navigation Rule
When navigating to `/superadmin`, do NOT call `setCommunityId(null)` before `navigate()`. It causes a race condition where ProtectedRoute intercepts and redirects to `/community`. Use a 50ms `setTimeout` delay or navigate first.

---

## Database (Supabase)

Connection is via environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are stored in `.env` (not committed to git). See `docs/SUPABASE.md` for table schemas.

Key tables:
- `communities` — each facility
- `community_members` — user ↔ community relationships + roles
- `residents` — resident profiles
- `medications` — resident medication records
- `staff_certifications` — staff licenses and certs
- `incidents` — incident reports
- `maintenance_requests` — facility maintenance

All tables use **Row Level Security (RLS)**. Policies restrict access by `community_id` matched against the user's `community_members` record.

---

## Conventions & Rules

### DO
- Use `rounded-2xl` for cards, `rounded-xl` for inputs and buttons
- Use `text-sm` as the default body text size
- Use `#185FA5` for primary actions, `red-500` for destructive actions
- Use the `Skeleton` components from `src/components/ui/Skeleton.jsx` for loading states
- Wrap every page in `<Layout>` from `components/layout/Layout.jsx`
- Keep all page logic self-contained in the page file unless reused elsewhere

### DON'T
- Don't use `alert()` — replace with toast notifications (planned)
- Don't use `window.location.href` for navigation — use React Router's `navigate()`
- Don't add `tailwind.config.js` — we're on v4
- Don't skip the `community_id` filter on any Supabase query
- Don't commit `.env` files

---

## Component Patterns

### Standard page header
```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-slate-800">Page Title</h1>
    <p className="text-sm text-slate-500 mt-1">Short description</p>
  </div>
  <button className="bg-[#185FA5] hover:bg-[#0C447C] text-white rounded-xl px-4 py-2.5 text-sm font-semibold ...">
    + Add Item
  </button>
</div>
```

### Standard card
```jsx
<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
  ...
</div>
```

### Standard input
```jsx
<input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent" />
```

### Modal pattern
- Full-screen overlay: `fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50`
- Slides up from bottom on mobile, centered on desktop
- Sticky header + scrollable body + sticky footer buttons

---

## Roadmap

See `docs/ROADMAP.md` for the full feature list with status.

---

## How to Run Locally

```bash
cd /Users/dominickcoloma/haven-app
npm run dev
```

Preview proxy runs from `/Users/dominickcoloma/resident-manager/` pointing to port 5173.

---

## Git

The project is tracked with git. Always commit meaningful chunks of work with descriptive messages. Never commit `.env`.
