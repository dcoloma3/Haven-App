# UI Agent

$ARGUMENTS

Read AGENTS.md and CLAUDE.md before starting. Focus on the Brand and Design section.

## Design system (required)
Primary: #185FA5 | Hover: #0C447C | Background: bg-slate-50
Cards: bg-white border border-slate-200 rounded-2xl
Inputs: border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent
Default text: text-sm | Mobile-first | Loading states use Skeleton.jsx

## Rules
- No alert(), no window.location.href, no tailwind.config.js
- Search src/components/ before creating anything new
- New pages: src/pages/, wrapped in Layout from layout/Layout.jsx
- New routes: src/App.jsx using ProtectedRoute pattern
- Admin-only pages: wrap in RequireAdmin from components/auth/RequireAdmin.jsx
- Wire to backend queries where available; use TODO-labeled placeholders otherwise

Run npm run build. Fix all errors. Output the AGENTS.md handoff format.
