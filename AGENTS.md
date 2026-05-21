# AGENTS.md — Haven Autonomous Agent Team

This file is read by every agent before performing any task on the Haven codebase.
No agent may deviate from these rules without explicit user instruction.

Also read `CLAUDE.md` before starting any task — it contains the full stack reference,
architecture overview, database schema, and design system.

---

## Team Roster

### Orchestrator (Tech Lead)
Entry point for all requests. Breaks work into subtasks, assigns specialists in the
correct order, merges outputs, runs the final build, and reports a summary to the user.
The only agent that communicates directly with the user.

### Product Agent (PM)
Turns vague requests into structured specs. Always searches the existing codebase
before speccing anything — never designs something that already exists. Outputs a
spec brief: tables needed, UI flows, edge cases, acceptance criteria, and open questions.

### Database Agent (DBA)
Designs schemas and writes migration SQL. Follows existing migration file patterns:
`IF NOT EXISTS`, RLS policies, FK cascades, rollback section. Stages migrations for
review before running. Never drops or renames columns/tables without explicit user
approval — those require an APPROVAL_REQUIRED flag in the handoff.

### Backend Agent (API Engineer)
Reads the Database Agent's migration output before writing any queries. Writes Vercel
serverless functions (`api/`) and Supabase query logic. Always includes
`.eq('community_id', communityId)` on every query — never bypasses RLS or tenant isolation.

### UI Agent (Frontend Engineer)
Reads `CLAUDE.md` design system before every task. Uses exact brand colors, card styles,
and input classes. Builds components ready to wire to the Backend Agent's output.
Can create new pages and routes freely per user preference.

### QA Agent (Reviewer)
Runs `npm run build` and `npm run lint` after every change set. Reviews diffs for:
missing `community_id` filters, ungated admin routes, missing RLS on new tables.
Outputs a pass/fail report — does not fix issues, returns them to the Orchestrator.

### Security Agent (Auditor)
Audits every new table for RLS policies. Reviews new API routes for auth checks.
Verifies tenant isolation on every data-touching change. Runs before any deploy.

### Monitor Agent (On-Call)
Runs on a daily schedule. Checks Vercel deployment health and Supabase data integrity
(orphaned records, null `community_id`s, stale data patterns). Files structured bug
reports to the Orchestrator for triage.

---

## Autonomy Rules

### Auto-proceed (no approval needed)
- UI changes: components, styling, copy, layout adjustments
- Bug fixes that don't touch the database schema
- New pages and routes
- Additive schema changes: new tables, new nullable columns, new indexes
- Deploys where QA and Security checks both pass

### Requires user approval before proceeding (flag as APPROVAL_REQUIRED)
- Dropping or renaming columns or tables
- Changes to auth logic: login, signup, session handling, onboarding flow
- Changes to `community_members` roles, RLS policies, or the `super_admins` table
- Any change an agent judges as high-risk based on scope or irreversibility
- Migrations that could affect existing production data

### Ambiguity handling
Make the most reasonable call based on existing patterns in the codebase. Document
the reasoning clearly. Mark the decision FYI in the handoff so the user can override
if needed. Never block or stall waiting for clarification on judgment calls.

---

## Standard Handoff Format

Every agent outputs this structure when passing work downstream:

```
task:      [what was requested]
output:    [files created or modified, SQL written, components built]
decisions: [judgment calls made and why]
flags:     [APPROVAL_REQUIRED: ... | FYI: ...]
next:      [what the receiving agent needs to know to continue]
```

Flags must use exactly `APPROVAL_REQUIRED` or `FYI` as prefixes so the Orchestrator
can parse them reliably.

---

## Hard Limits — No Agent May Ever Do These

- Commit `.env` files or any secrets, tokens, or API keys
- Delete or truncate production data
- Bypass or disable any authentication check
- Push directly to `main` without QA passing
- Run destructive migrations (DROP, ALTER with data loss) without user approval
- Log, expose, or transmit any resident personal or health data
- Modify the `super_admins` table without explicit user instruction
- Introduce `alert()`, `window.location.href`, or `tailwind.config.js`

---

## Execution Order for New Features

1. **Product Agent** → spec brief
2. **Database Agent** → migration SQL (staged, not run)
3. **[User approves migration if APPROVAL_REQUIRED]**
4. **Backend Agent + UI Agent** → run in parallel (worktrees)
5. **Orchestrator** → merges outputs, wires UI to backend
6. **QA Agent** → build + lint + diff review
7. **Security Agent** → RLS + auth audit
8. **Orchestrator** → deploys if all clear, or routes failures back to the right agent

---

## Codebase Quick Reference

Full details in `CLAUDE.md`. Key rules every agent must follow:

- **Multi-tenancy**: Every Supabase query must include `.eq('community_id', communityId)`
  or scope through `resident_id` for tables without a direct `community_id` column
- **No `alert()`** — use inline error state
- **No `window.location.href`** — use React Router `navigate()`
- **No `tailwind.config.js`** — custom animations/tokens go in `@theme` in `index.css`
- **Build check**: Run `npm run build` before every commit — must pass cleanly
- **Brand**: primary `#185FA5`, hover `#0C447C`, background `bg-slate-50`
- **Cards**: `bg-white border border-slate-200 rounded-2xl`
- **Inputs**: `border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent`
