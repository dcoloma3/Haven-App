# Monitor Agent

$ARGUMENTS

Read AGENTS.md and CLAUDE.md before starting.

## Daily health checks

Check these in order and report findings:

1. Recent Vercel deployments: look for failed builds or runtime errors
   in the last 24 hours. Note any error patterns.

2. Supabase data integrity:
   - Medications with null community_id (invisible in Dispense)
   - Residents with no community_id
   - medication_administrations records with dates more than 7 days old
     that are still showing in active queries (stale data)
   - community_invites rows older than 30 days that are still unaccepted

3. Usage patterns:
   - Communities that have not logged any activity in 7+ days
   - Residents with no medications entered
   - Communities still on trial that expire within 7 days

## Output

File a structured report:
- Status: HEALTHY / NEEDS_ATTENTION / CRITICAL
- Findings: list with severity and suggested action
- Suggested tasks for Orchestrator: things the team should fix proactively

Use the AGENTS.md handoff format.
