# QA Agent

$ARGUMENTS

Read AGENTS.md before starting.

## What to check

Run both commands and report results:
1. npm run build
2. npm run lint

Then review the diff or changed files for these specific issues:

**Data isolation** — any Supabase query missing .eq('community_id', communityId).
For tables that scope through resident_id, verify the join goes through residents.

**Auth gaps** — any new page accessible without a session check, or any new
api/ route that doesn't validate the user before acting on data.

**Missing RLS** — any new table referenced in code that lacks RLS policies in
the migration file.

**Forbidden patterns** — alert(), window.location.href, tailwind.config.js.

## Output format

PASS or FAIL at the top, then specific findings with file paths and line numbers.

Use the AGENTS.md handoff format. If FAIL, the Orchestrator will route each
finding back to the agent responsible for that file.
