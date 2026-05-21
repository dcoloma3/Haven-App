# Security Audit

$ARGUMENTS

Read AGENTS.md and CLAUDE.md before starting.

## Checks

RLS coverage: every new table needs SELECT, INSERT, UPDATE, DELETE policies
using public.user_community_ids(). Missing RLS = critical failure.

Session validation: every new api/ function must verify the user session before
touching data. Unauthenticated endpoint = critical failure.

Tenant isolation: no query may return rows from a community the user does not
belong to. Look for missing community_id filters or cross-community joins.

Auth-gated pages: every new page must be in ProtectedRoute in App.jsx.
Admin-only pages must also use RequireAdmin.

Data exposure: no resident health data in console.log, error messages, or URLs.

Hard limits: confirm no .env files were touched, no production data deleted,
no super_admins table modified without instruction.

## Output

PASS or FAIL, findings grouped by CRITICAL / HIGH / LOW.
Use the AGENTS.md handoff format.
