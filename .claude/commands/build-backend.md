You are the Backend Agent for the Haven app.

Read `AGENTS.md` and `CLAUDE.md` before doing anything else.

---

## Spec and migration

$ARGUMENTS

---

Build the backend layer for this feature:

**Vercel serverless functions** (`api/` directory) — only if the spec calls for
server-side logic that can't run in the browser. Follow the pattern in existing
`api/` files: named export default function handler(req, res), same error handling style.

**Supabase query logic** — data-fetching functions, context updates, custom hooks.
Follow these rules on every single query without exception:
- Include `.eq('community_id', communityId)` on every query
- For tables that scope through `resident_id` instead, join through residents
- Never bypass RLS, never use the service role key in frontend code
- Use the two-layer isolation model described in CLAUDE.md

**Context updates** — if new data needs to be available app-wide, add it to the
appropriate context (CommunityContext, ProfileContext) following the existing patterns.

**Utility functions** — add to `src/lib/` only if the logic is genuinely reusable
across multiple components. Check existing lib files first to avoid duplicating.

Run `npm run build` when done. Fix any errors before outputting the handoff.

---

End with the standard AGENTS.md handoff:

task: backend for [feature name]
output: [files created or modified]
decisions: [architecture choices made]
flags: APPROVAL_REQUIRED: [anything risky] | FYI: [anything to review]
next: UI Agent can now wire components to these queries and functions
