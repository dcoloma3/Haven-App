# Haven — Migration Runbook

## Overview
This runbook covers the migrations required to:
1. Harden tenant isolation via RLS
2. Make trial signup atomic
3. Add missing FK cascade rules
4. Document and add missing schema columns

**Production is read-only during this process.** Paste each file into the Supabase SQL Editor in order. Each migration is idempotent — safe to re-run if interrupted.

---

## Step 1: Tenant-scoped RLS policies
**File:** `supabase-migration-rls-tenant-scope.sql`

**What it does:** Replaces all `using (true)` open policies with community-scoped policies across 33 tables. Creates two helper functions in the `auth` schema (`auth.user_community_ids()` and `auth.is_super_admin()`) that power all downstream checks. Staff get read/write on clinical tables (vital signs, incidents, medication administrations, ADL records, PRN). Admins get write access on configuration tables (residents, medications, billing, etc.). `family_access` is intentionally left with a permissive SELECT because FamilyView.jsx uses token-based auth, not Supabase session auth.

**Pre-check:**
```sql
-- Confirm current policies are open (should see 'using (true)' rows)
select tablename, policyname, qual from pg_policies where schemaname='public' limit 20;
```

**Test after applying:**
```sql
-- Run as a regular staff user — should see only their community's rows
select count(*) from residents;
select auth.is_super_admin();
```

Use `scripts/test-rls.sql` for a full smoke test. Run it as a regular user and compare counts with a super-admin run.

**Rollback:** Run the `-- ROLLBACK` section at the bottom of the migration file (the commented-out block of `drop policy` and `drop function` statements).

---

## Step 2: Atomic trial signup RPC
**File:** `supabase-migration-trial-signup-rpc.sql`

**What it does:** Creates a `public.complete_trial(...)` Postgres function that atomically inserts a new community, adds the user as admin, and upserts their profile — all in one transaction. This replaces the 3-step JS sequence in `src/lib/trial.js` that was vulnerable to partial failures (e.g., community created but profile insert failed). The JS file has been updated to call this RPC instead.

**Pre-check:**
```sql
-- Confirm function does not already exist
select to_regproc('public.complete_trial');
-- Returns null if not present
```

**Test after applying:**
```sql
-- Should return the function
select to_regproc('public.complete_trial');
-- Check grants
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'complete_trial';
```

**Rollback:** `drop function if exists public.complete_trial(uuid, text, text, text, text, int);`

---

## Step 3: FK cascade rules
**File:** `supabase-migration-fk-cascades.sql`

**What it does:** Drops and recreates four foreign key constraints with `ON DELETE CASCADE`:
- `family_access.resident_id` → `residents(id)`
- `family_access.community_id` → `communities(id)`
- `notification_settings.community_id` → `communities(id)`
- `community_invites.community_id` → `communities(id)`

Without cascade, deleting a community or resident would fail if these child rows exist, or silently leave orphan rows depending on DB defaults.

**Pre-check:**
```sql
-- List current FK constraints on these tables
select conname, confdeltype
from pg_constraint
where conrelid in ('family_access'::regclass, 'notification_settings'::regclass, 'community_invites'::regclass)
  and contype = 'f';
-- confdeltype 'a' = NO ACTION, 'c' = CASCADE
```

**Rollback:** Run the commented-out rollback block at the bottom of the file, which recreates the FKs without cascade.

---

## Step 4: PRN administrations table
**File:** `supabase-migration-prn-administrations.sql`

**Note:** Only run if `prn_administrations` doesn't already exist. Check first:
```sql
select to_regclass('public.prn_administrations');
-- Returns null if table doesn't exist
```

**What it does:** Creates the `prn_administrations` table with proper FKs to `medications`, `residents`, `communities`, and `auth.users`. Enables RLS with staff-scoped read/write policies (scoped through `resident_id`). This is the canonical table for PRN (as-needed) doses, as queried by `Dispense.jsx` and `ResidentMedHistory.jsx`.

**Known inconsistency:** `MedicationList.jsx` currently writes PRN doses to `medication_administrations` instead of this table. That is tracked separately and fixed as part of the `handleGiveNow` patch in Task 12.

**Rollback:** `drop table if exists prn_administrations;`

---

## Step 5: Missing columns
**File:** `supabase-migration-missing-columns.sql`

**What it does:** Adds columns to `communities`, `residents`, `profiles`, `medications`, and `medication_administrations` that are referenced in the codebase but have no migration file. All statements use `IF NOT EXISTS` so they are safe to run against production even if the columns already exist.

**Pre-check:**
```sql
-- Spot-check one column
select column_name from information_schema.columns
where table_name = 'communities' and column_name = 'plan';
```

**Rollback:** Run the commented-out `drop column` statements at the bottom of the file.

---

## Step 6 (Optional): Orphan community cleanup
**File:** `supabase-cleanup-orphan-communities.sql`

**Do NOT run immediately.** Schedule this for off-peak hours or configure as a pg_cron job. It deletes communities created over 24 hours ago with no members. This handles abandoned trial signups where the user created a community but never completed onboarding.

Example pg_cron schedule (run at 3 AM UTC daily):
```sql
select cron.schedule('cleanup-orphan-communities', '0 3 * * *',
  $$delete from communities
    where created_at < now() - interval '1 day'
      and not exists (
        select 1 from community_members where community_id = communities.id
      )$$
);
```

---

## Schema dump (fresh install only)
`supabase-schema-full.sql` — **Skip on existing production.** Only use when bootstrapping a new Supabase project from scratch. A fresh dump from the production DB is needed here; file is a placeholder until provided.
