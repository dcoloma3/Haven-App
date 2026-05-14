# The Haven — Brand Style Guide

> This document defines the visual identity and voice of The Haven. All design decisions in the app and any marketing materials should reference this file.

---

## Brand Identity

**Name:** The Haven
**Tagline:** *Modern care, beautifully managed*
**Supporting line:** *Trusted by care communities everywhere*

**Brand personality:**
- Trustworthy and professional
- Warm and human — not cold or corporate
- Modern and tech-forward
- Clear and easy to understand (staff are busy, not tech experts)

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|---|---|---|
| Haven Blue | `#185FA5` | Primary buttons, active states, links, focus rings |
| Haven Dark Blue | `#0C447C` | Hover state on primary buttons |
| Haven Light Blue | `#378ADD` | Accent, hover borders on cards |

### Neutral Colors (Tailwind slate)

| Name | Value | Usage |
|---|---|---|
| Background | `bg-slate-50` / `#F8FAFC` | Page background |
| Card background | `bg-white` | Cards, modals, panels |
| Border | `border-slate-200` | Card borders, dividers |
| Subtle border | `border-slate-100` | Inner dividers |
| Body text | `text-slate-800` | Headings, primary text |
| Secondary text | `text-slate-500` | Subtitles, metadata |
| Muted text | `text-slate-400` | Placeholder, timestamps |
| Input border | `border-slate-300` | Form inputs |

### Semantic Colors

| Status | Background | Text | Usage |
|---|---|---|---|
| Success / Valid | `bg-emerald-100` | `text-emerald-700` | Valid certs, active residents |
| Warning | `bg-amber-100` | `text-amber-700` | Expiring soon, caution states |
| Danger / Error | `bg-red-100` | `text-red-700` | Expired, errors, destructive |
| Info | `bg-blue-100` | `text-blue-700` | Informational badges |

### Login / Auth Screen

The login screen uses a dark gradient background to create a premium first impression:

```
Background: linear-gradient(135deg, #020f1f 0%, #042C53 45%, #0a3d6b 100%)
Blob accent 1: rgba(37, 99, 235, 0.5) → rgba(56, 152, 255, 0.3)
Blob accent 2: rgba(99, 102, 241, 0.45) → rgba(139, 92, 246, 0.25)
Blob accent 3: rgba(14, 165, 233, 0.4) → rgba(56, 189, 248, 0.2)
Glass card: rgba(255, 255, 255, 0.07) with backdrop-filter: blur(24px)
```

---

## Typography

**Font Family:** Inter (Google Fonts)
- Loaded in `index.html` via Google Fonts CDN
- Weights used: 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Type Scale

| Role | Class | Size |
|---|---|---|
| Page title | `text-2xl font-bold text-slate-800` | 24px |
| Section heading | `text-lg font-semibold text-slate-800` | 18px |
| Card heading | `text-sm font-semibold text-slate-700` | 14px |
| Body text | `text-sm text-slate-800` | 14px |
| Secondary text | `text-sm text-slate-500` | 14px |
| Small / meta | `text-xs text-slate-400` | 12px |
| Button | `text-sm font-semibold` | 14px |

---

## Spacing & Layout

- **Page max width:** `max-w-5xl` (desktop), full width on mobile
- **Page padding:** `px-4 py-5 sm:px-6`
- **Card padding:** `px-4 py-4` (standard), `p-6` (modal/prominent cards)
- **Gap between cards:** `space-y-4` or `space-y-5`
- **Sidebar width:** `w-52` (208px) on desktop

---

## Border Radius

| Element | Class |
|---|---|
| Page cards | `rounded-2xl` |
| Buttons | `rounded-xl` |
| Inputs | `rounded-lg` |
| Badge / pill | `rounded-full` |
| Icon containers | `rounded-xl` |

---

## Shadows

| State | Class |
|---|---|
| Default card | none (border only) |
| Hover card | `hover:shadow-md` or `hover:shadow-lg` |
| Modal | `shadow-xl` |
| Button glow (primary) | `box-shadow: 0 4px 24px rgba(24,95,165,0.45)` |

---

## Interactive States

| Element | Hover | Active |
|---|---|---|
| Primary button | `hover:bg-[#0C447C]` | `active:scale-95` |
| Resident card | `hover:-translate-y-1 hover:shadow-lg hover:border-[#378ADD]` | — |
| Stat card | `hover:-translate-y-0.5 hover:shadow-md` | — |
| Nav item | `hover:bg-slate-100` | `bg-[#185FA5] text-white` (active) |

---

## Component Patterns

### Buttons

**Primary action:**
```
background: linear-gradient(135deg, #185FA5 0%, #2d8fe8 100%)
box-shadow: 0 4px 24px rgba(24,95,165,0.45)
classes: text-white font-semibold rounded-xl py-2.5 px-4 text-sm active:scale-95
```

**Secondary / cancel:**
```
classes: border border-slate-300 text-slate-700 rounded-xl py-2.5 hover:bg-slate-50
```

**Destructive:**
```
classes: bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 font-semibold
```

### Status Badges
```
Valid:         bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold
Expiring Soon: bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold
Expired:       bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold
```

---

## Voice & Tone

**Do use:**
- Clear, direct language ("Add Resident", "Save Changes")
- Friendly but professional tone
- Short labels — staff are reading on small screens while busy
- Helpful empty states ("No certifications found. Add one to get started.")

**Don't use:**
- Jargon or overly technical language
- Negative phrasing ("Failed to load") — prefer positive ("Something went wrong. Please try again.")
- Long sentences in UI labels

---

## Logo

> Logo files will live in `src/assets/logo/` once created.

**Planned formats:**
- `logo.svg` — Full color, for light backgrounds
- `logo-white.svg` — White version, for dark backgrounds (login screen)
- `logo-icon.svg` — Icon only (no wordmark), for favicon and small spaces
- `logo@2x.png` — High-res PNG for email and print

**Usage rules:**
- Never stretch or distort the logo
- Maintain clear space around the logo equal to the height of the "H"
- Never place the colored logo on a dark background — use the white version

---

## Marketing Voice

**One-liner:** The Haven makes running your senior living community effortless.

**Elevator pitch:** The Haven is an all-in-one management platform for senior care communities. From medications and certifications to billing and family communication — everything your team needs, beautifully organized and always at hand.

**Key value props:**
1. Everything in one place — no more spreadsheets
2. Built for care teams — simple enough for staff, powerful enough for owners
3. Real-time visibility — always know what's happening at your community
4. Multi-community ready — manage one facility or ten from the same account
