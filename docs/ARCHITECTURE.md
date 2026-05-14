# The Haven — Architecture Reference

> A technical map of how the app is structured. Use this when adding new features, debugging routing issues, or onboarding.

---

## Overview

The Haven is a single-page application (SPA) with:
- **React 19 + Vite** on the frontend
- **Supabase** handling auth, database, and row-level security
- **React Router v6** for client-side routing
- **Tailwind CSS v4** for styling
- **Vercel** for hosting

There is no backend API server — the frontend communicates directly with Supabase via the JS client. All data security is enforced via Supabase Row Level Security (RLS) policies.

---

## Entry Points

```
index.html         → loads Inter font, mounts <div id="root">
src/main.jsx       → ReactDOM.createRoot, wraps App in Router + context providers
src/App.jsx        → defines all routes, ProtectedRoute component
```

---

## Routing

All routes are defined in `src/App.jsx`.

### Public Routes
| Path | Component | Notes |
|---|---|---|
| `/login` | `Login.jsx` | Unauthenticated landing |

### Protected Routes (require auth)
| Path | Component | Role |
|---|---|---|
| `/` | `Dashboard.jsx` | All authenticated users |
| `/residents` | residents/ | All |
| `/medications` | medications/ | All |
| `/dispense` | `Dispense.jsx` | All |
| `/vitals` | `VitalSigns.jsx` | All |
| `/incidents` | `Incidents.jsx` | All |
| `/maintenance` | `Maintenance.jsx` | All |
| `/certifications` | `Certifications.jsx` | All |
| `/staff` | `StaffDirectory.jsx` | All |
| `/schedule` | `Schedule.jsx` | All |
| `/shifts` | `ShiftLog.jsx` | All |
| `/billing` | `Billing.jsx` | All |
| `/occupancy` | `Occupancy.jsx` | All |
| `/activities` | `Activities.jsx` | All |
| `/transportation` | `Transportation.jsx` | All |
| `/calendar` | `Calendar.jsx` | All |
| `/family` | `FamilyView.jsx` | All |
| `/profile` | `MyProfile.jsx` | All |
| `/settings` | `FacilitySettings.jsx` | Admin |
| `/superadmin` | `SuperAdmin.jsx` | Super Admin only |
| `/community` | `CommunityPicker.jsx` | Multi-community users |

### ProtectedRoute Logic
1. If no Supabase session → redirect to `/login`
2. If no `communityId` in context AND user has multiple communities → redirect to `/community`
3. If no `communityId` AND user has exactly one community → auto-select it
4. Otherwise → render the page

**Known gotcha:** Never call `setCommunityId(null)` immediately before `navigate('/superadmin')`. It triggers the ProtectedRoute logic on the current page and causes an unintended redirect. Use a 50ms `setTimeout` or navigate first.

---

## Context Providers

Three React contexts wrap the app:

### CommunityContext (`src/context/CommunityContext.jsx`)
- `communityId` — the currently active community's UUID
- `setCommunityId()` — switch communities
- `memberships` — array of all communities the user belongs to

### ProfileContext (`src/context/ProfileContext.jsx`)
- `profile` — the logged-in user's profile object (name, avatar, role, etc.)
- `isSuperAdmin` — boolean

### FacilityContext (`src/context/FacilityContext.jsx`)
- Facility-level settings for the active community
- Name, timezone, contact info, etc.

---

## Layout System

Every page (except Login and CommunityPicker) is wrapped in `<Layout>`:

```
Layout.jsx
├── Navbar.jsx          (always shown — top bar)
├── Sidebar.jsx         (desktop only, w-52, fixed left)
├── <main>              (offset right by pl-52 on desktop)
│   └── {children}      (the page content, max-w-5xl, centered)
└── MobileNav.jsx       (mobile only, fixed bottom tab bar)
```

### Responsive breakpoint
- `useIsMobile()` hook checks `window.innerWidth < 768px`
- Mobile: bottom nav tabs, no sidebar, `pb-28` to clear the nav
- Desktop: sidebar, `pl-52` offset, `pb-8`

---

## Supabase Pattern

Every page that fetches data follows this pattern:

```jsx
const { communityId } = useCommunity()
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)

async function fetchData() {
  const { data } = await supabase
    .from('table_name')
    .select('*')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false })
  setData(data || [])
  setLoading(false)
}

useEffect(() => { fetchData() }, [communityId])
```

**Always filter by `community_id`** — this is the RLS policy anchor. Missing this filter will either return no data (RLS blocks it) or return cross-community data (if RLS is misconfigured).

---

## Adding a New Page

1. Create `src/pages/NewPage.jsx`
2. Wrap content in `<Layout>`
3. Add the route to `App.jsx`
4. Add nav item to `Sidebar.jsx` and `MobileNav.jsx`
5. Follow the standard header pattern (see `CLAUDE.md`)
6. Add an entry to `docs/ROADMAP.md`

---

## Environment Variables

Stored in `.env` at the project root (never committed to git):

```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon key]
```

Vite exposes these as `import.meta.env.VITE_*`.

---

## Build & Deploy

```bash
# Local dev
npm run dev

# Production build
npm run build

# Deploy (auto via Vercel on push to main)
git push origin main
```

Vercel config is in `vercel.json` — it rewrites all paths to `index.html` for SPA routing.

---

## Key Decisions & Why

| Decision | Reason |
|---|---|
| No backend API server | Supabase handles auth + DB directly; reduces complexity |
| Tailwind v4 | Latest version; `@theme` directive replaces config file |
| RLS on all tables | Security enforced at DB level, not just frontend |
| One file per page | Keeps things simple; share logic via context or hooks |
| Skeleton loading over spinners | Better perceived performance; matches content shape |
| Inter font via CDN | No extra npm package; fast to iterate |
| Mobile-first layout | Staff use phones at work; mobile UX is primary |
