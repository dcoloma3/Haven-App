# The Haven — Changelog

> A running log of all meaningful changes made to the app, newest first.
> Add an entry every time a feature ships, a bug is fixed, or a design change is made.

---

## Format

```
## [Date] — Short title
**Type:** Feature | Bug Fix | Design | Refactor | Docs
**Files changed:** list key files

Description of what changed and why.
```

---

## 2026-05-14 — Project Organization & Documentation

**Type:** Docs
**Files created:** `CLAUDE.md`, `docs/BRAND.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/SUPABASE.md`, `docs/CHANGELOG.md`

Created a full documentation structure for the project. `CLAUDE.md` at the root serves as Claude's briefing document for every new session. The `docs/` folder contains the brand style guide, architecture reference, product roadmap, database schema reference, and this changelog.

---

## 2026-05-14 — Login Screen Redesign

**Type:** Design
**Files changed:** `src/pages/Login.jsx`, `src/index.css`

Complete visual overhaul of the login screen. Replaced plain white form with a dark animated background featuring 5 floating blob gradients, a dot-grid overlay, and a glassmorphic card (`backdrop-filter: blur(24px)`). Added a gradient sign-in button with a blue glow effect. Updated tagline to "Modern care, beautifully managed".

---

## 2026-05-14 — Skeleton Loading States

**Type:** Design / Feature
**Files created:** `src/components/ui/Skeleton.jsx`
**Files changed:** `src/pages/Dashboard.jsx`

Created a reusable `Skeleton.jsx` component with three variants: `Skeleton` (base), `StatCardSkeleton`, and `ResidentCardSkeleton`. Replaced the Dashboard's plain "Loading…" text with a skeleton grid that matches the shape of the actual content, improving perceived performance.

---

## 2026-05-14 — Inter Font Integration

**Type:** Design
**Files changed:** `index.html`, `src/index.css`

Added Inter font family via Google Fonts CDN. Applied globally to the `body` element in `index.css`. This replaces the system font stack with a modern, highly legible typeface consistent with the app's design direction.

---

## 2026-05-14 — Dashboard Stat Card Redesign

**Type:** Design
**Files changed:** `src/pages/Dashboard.jsx`

Redesigned the four stat cards on the Dashboard. Each card now features a colored icon container alongside the metric number, replacing the previous number-only layout. Added subtle hover lift effect (`hover:-translate-y-0.5 hover:shadow-md`).

---

## 2026-05-14 — Button Gradients & Micro-Interactions

**Type:** Design
**Files changed:** `src/pages/Dashboard.jsx`

Updated the primary "+ Add" button to use a gradient (`#185FA5 → #2d8fe8`) with a blue glow box-shadow. Added `active:scale-95` press animation and `hover:-translate-y-1 hover:shadow-lg` lift effect to resident cards. Border highlight on hover changed to `#378ADD`.

---

## 2026-05-14 — Owner Panel Navigation Bug Fix

**Type:** Bug Fix
**Files changed:** `src/components/layout/Navbar.jsx`

Fixed a race condition where clicking "Owner Panel" would redirect to the Community Picker instead of the SuperAdmin page. Root cause: `setCommunityId(null)` was being called before `navigate('/superadmin')`, causing ProtectedRoute to detect `communityId=null` and redirect. Fix: removed `setCommunityId(null)` from `exitToOwnerPanel()` and used a 50ms `setTimeout` delay on the OWNER pill button.
