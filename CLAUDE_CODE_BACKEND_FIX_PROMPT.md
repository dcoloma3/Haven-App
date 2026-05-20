# Haven — Backend hardening prompt for Claude Code

> Paste this whole file into Claude Code as the task brief. It assumes Claude Code has access to this repo at `/Users/dominickcoloma/haven-app` and can run `npm` scripts. It does NOT assume Claude Code can run SQL against production — every SQL change is meant to be reviewed by me before running in the Supabase SQL editor.

---

## Context

The Haven app is a multi-tenant senior-living management platform (React 19 + Vite + Supabase). One Supabase project hosts every customer community. Tenant isolation is supposed to come from Row Level Security on the `community_id` column of each table, but a recent audit found it doesn't actually work — every visible RLS policy is `using (true) with check (true)`, which means any authenticated user can read/write any row in any community via the JS client. Manual `.eq('community_id', communityId)` filters on the frontend are the only thing currently keeping tenants apart, and they're applied to only 52 of 213 queries.

There are also ~23 tables that exist in the live Supabase database (the app queries them) but have no `.sql` migration checked into the repo, plus several columns on `communities`, `residents`, and `profiles` that are referenced by code but not in any migration. If the database had to be rebuilt from scratch using the repo, the app wouldn't run.

The full audit lives at `Haven_Health_Check.docx` in the working folder.

## Goal

Produce a single, reviewable PR that:

1. Reconstructs the actual current schema and checks it into the repo.
2. Replaces every `using (true)` RLS policy with a tenant-scoped policy, with a super-admin escape hatch.
3. Wraps trial signup in a real Postgres transaction so partial signups can't leak.
4. Patches the smaller backend bugs called out below.
5. Provides a runbook for me to apply each migration in order, with rollback SQL for every step.

Treat production as read-only for this task. Every `.sql` file you produce must be idempotent (uses `if exists` / `if not exists`, `create or replace`, `drop policy if exists`) and must include a `-- ROLLBACK` section at the bottom.

---

## Step 1 — Dump the real schema

The repo has 7 migration files (`supabase-schema.sql` + `supabase-migration-*.sql`) but the code references 34 tables. Find the gap.

1. List every table queried by the JS source:

   ```bash
   grep -rhoE "\.from\(['\"][a-z_]+['\"]\)" src --include="*.jsx" --include="*.js" | sort -u
   ```

2. Cross-reference against tables defined in the existing `.sql` files. The 11 tables that ARE defined: `residents`, `medications`, `emergency_contacts`, `lease_terms`, `communities`, `community_members`, `community_invites`, `super_admins`, `admin_invites`, `medication_administrations`, `waitlist` (partial). Every other queried table is undocumented.

3. Ask me to run `pg_dump --schema-only --no-owner --no-acl` against the production Supabase database, paste the output back, and check it into the repo as `supabase-schema-full.sql`. **Do not generate this from guesswork** — the live schema is the source of truth.

4. While I'm preparing that dump, scan the codebase for every column read or written on the tables below and produce a "columns expected by code" report so we can diff against the real schema once it arrives:

   - `communities` — code uses `plan`, `trial_start_date`, `trial_end_date`, `resident_count_at_signup`, `total_beds` (none in migrations)
   - `residents` — code uses `status`, `removal_reason` (not in migrations)
   - `profiles` — code uses `profile_completed` (not in migrations)

   Find any others I missed.

## Step 2 — Tenant-scoped RLS

Write a new migration file `supabase-migration-rls-tenant-scope.sql` that:

1. Drops the `using (true) with check (true)` policies on every table that has a `community_id` column (directly or transitively via `resident_id`).

2. Creates a helper SQL function so policies don't have to repeat the subquery:

   ```sql
   create or replace function auth.user_community_ids() returns setof uuid
   language sql stable security definer as $$
     select community_id from public.community_members where user_id = auth.uid()
   $$;

   create or replace function auth.is_super_admin() returns boolean
   language sql stable security definer as $$
     select exists (
       select 1 from public.super_admins
       where email = auth.email()
     )
   $$;
   ```

3. For each tenant-scoped table, creates four policies (select / insert / update / delete) shaped like:

   ```sql
   create policy "community read" on residents
     for select to authenticated
     using (
       community_id in (select auth.user_community_ids())
       or auth.is_super_admin()
     );

   create policy "community write — admin only" on residents
     for all to authenticated
     using (
       (community_id in (select auth.user_community_ids())
         and exists (select 1 from community_members
                     where user_id = auth.uid()
                       and community_id = residents.community_id
                       and role = 'admin'))
       or auth.is_super_admin()
     )
     with check (
       (community_id in (select auth.user_community_ids())
         and exists (select 1 from community_members
                     where user_id = auth.uid()
                       and community_id = residents.community_id
                       and role = 'admin'))
       or auth.is_super_admin()
     );
   ```

   Adjust the read/write split per table — staff need read+write on `medication_administrations`, `vital_signs`, `shift_notes`, `incidents` (their daily workflow), but only admins should write to `residents`, `medications`, `lease_terms`, `billing_records`, `staff_certifications`, `communities`. Use your judgment and call out anything ambiguous in a comment.

4. For tables that don't carry `community_id` directly (e.g. `vital_signs`, `medication_administrations`, `emergency_contacts`, `care_plans`), scope through the resident:

   ```sql
   using (
     resident_id in (
       select id from residents
       where community_id in (select auth.user_community_ids())
     )
     or auth.is_super_admin()
   )
   ```

5. Special cases:

   - `family_access` — the whole point is to grant access via token, NOT auth. Keep RLS permissive on this one but document the reasoning in a comment.
   - `super_admins` and `admin_invites` — keep RLS disabled. Add a comment explaining why.
   - `profiles` — users should read+write their own row only: `using (user_id = auth.uid())`. Super admins read all.

6. Bundle a smoke-test script `scripts/test-rls.sql` that exercises the policies. I'll run it as a regular community user and then as a super admin and check the row counts match what's expected.

## Step 3 — Atomic trial signup

`src/lib/trial.js` currently does the community insert → member insert → profile upsert sequence client-side and tries to roll back by deleting the community on failure. The rollback itself can fail. Replace with a Postgres function.

1. Create `supabase-migration-trial-signup-rpc.sql`:

   ```sql
   create or replace function public.complete_trial(
     p_user_id uuid,
     p_email text,
     p_first_name text,
     p_last_name text,
     p_community_name text,
     p_resident_count int
   ) returns uuid
   language plpgsql security definer as $$
   declare
     new_community_id uuid;
   begin
     insert into communities (name, plan, trial_start_date, trial_end_date, resident_count_at_signup)
     values (p_community_name, 'trial', now(), now() + interval '14 days', p_resident_count)
     returning id into new_community_id;

     insert into community_members (community_id, user_id, role)
     values (new_community_id, p_user_id, 'admin');

     insert into profiles (user_id, email, full_name, first_name, last_name, onboarding_complete, profile_completed)
     values (p_user_id, p_email, p_first_name || ' ' || p_last_name, p_first_name, p_last_name, true, true)
     on conflict (user_id) do update set
       email = excluded.email,
       full_name = excluded.full_name,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       onboarding_complete = true,
       profile_completed = true;

     return new_community_id;
   end;
   $$;

   grant execute on function public.complete_trial(uuid, text, text, text, text, int) to authenticated;
   ```

2. Refactor `src/lib/trial.js` to call it:

   ```js
   const { data, error } = await supabase.rpc('complete_trial', {
     p_user_id: userId,
     p_email: email,
     p_first_name: firstName,
     p_last_name: lastName,
     p_community_name: communityName,
     p_resident_count: residentCount,
   })
   if (error) throw error
   return { id: data }
   ```

3. Delete the JS-level `rollback()` helper — it's no longer needed.

4. Add a nightly cleanup query in a new file `supabase-cleanup-orphan-communities.sql` (to be run on a schedule eventually):

   ```sql
   delete from communities
   where created_at < now() - interval '1 day'
     and not exists (
       select 1 from community_members where community_id = communities.id
     );
   ```

## Step 4 — Cascade rules for join-dependent tables

`src/pages/FamilyView.jsx` assumes `access.residents` is non-null. The fix is on both sides:

1. SQL migration `supabase-migration-fk-cascades.sql` — add `on delete cascade` to `family_access.resident_id`, and any other FK without a delete rule that the code currently assumes will be cleaned up. Check at least: `family_access`, `staff_certifications` (cascade from `auth.users` when a staff member is removed?), `community_invites`, `notification_settings`.

2. Frontend defensive guard in `FamilyView.jsx` around line 38:

   ```js
   const resident = access.residents
   if (!resident) { setState('invalid'); return }
   ```

## Step 5 — Fix the PRN "Give Now" unique-constraint workaround

`src/components/medications/MedicationList.jsx` line 705 writes `scheduled_time = current HH:MM` to work around `medication_administrations.unique(medication_id, scheduled_time, administered_date)`. Two PRN doses in the same minute collide silently.

1. Confirm `prn_administrations` table exists in the live schema (the code queries it but never inserts). If it doesn't, create it in `supabase-migration-prn-administrations.sql`:

   ```sql
   create table if not exists prn_administrations (
     id uuid primary key default gen_random_uuid(),
     medication_id uuid not null references medications(id) on delete cascade,
     resident_id uuid not null references residents(id) on delete cascade,
     administered_at timestamptz not null default now(),
     administered_by uuid references auth.users(id),
     admin_notes text,
     created_at timestamptz default now()
   );
   alter table prn_administrations enable row level security;
   -- Reuse the same policy shape as Step 2
   ```

2. Update `handleGiveNow()` in `MedicationList.jsx` to write to `prn_administrations` for PRN meds and `medication_administrations` only for scheduled meds.

3. Update any read path that surfaces PRN history to query the new table.

## Step 6 — Smaller frontend cleanups that depend on the schema work

After the SQL settles, do these in the same PR:

- Strip the manual `.eq('community_id', communityId)` filter from queries where RLS now enforces it. Search every `.from(...)` call and decide per-call: if RLS covers it, the filter is redundant noise; if RLS doesn't (e.g., `family_access` token route), keep the filter.
- Replace `window.location.href` with `navigate()` in `src/pages/Onboarding.jsx` (lines 149, 175, 181).
- Delete the 4 orphan files: `src/components/residents/ResidentList.jsx`, `src/components/layout/SuperAdminBar.jsx`, `src/components/lease/LeaseForm.jsx`, `src/components/onboarding/GettingStartedChecklist.jsx`. If LeaseForm should actually exist, wire it into `LeaseDetails.jsx` instead of deleting.
- Move the `function loadDoses()` declaration above its `useEffect` caller in `MedicationList.jsx` (around lines 677–692).
- Replace the placeholder `+1 (XXX) XXX-XXXX` phone number in `src/pages/TrialExpired.jsx` with a TODO comment that includes the Google Voice item from `TASKS.md`.

## Step 7 — Migration runbook

Produce a `MIGRATION_RUNBOOK.md` at the repo root with the exact order I should paste files into the Supabase SQL editor:

1. `supabase-schema-full.sql` (only if I'm rebuilding from scratch — skip on existing prod)
2. `supabase-migration-rls-tenant-scope.sql`
3. `supabase-migration-trial-signup-rpc.sql`
4. `supabase-migration-fk-cascades.sql`
5. `supabase-migration-prn-administrations.sql` (only if the table doesn't already exist)

Each step needs:

- A one-line description of what it does.
- A "test before merging" check I can run (typically a `select` showing the new policy / function exists).
- The `-- ROLLBACK` SQL I'd run to undo it.

## Verification

Before opening the PR:

- `npm run lint` should not introduce new errors (it's already at 76 — keep it at 76 or lower).
- `npm run build` must succeed.
- Manually trace one read path end-to-end (Dispense page → `medications` table) and confirm the new RLS would still let a staff user see meds for their community.
- Open `supabase-migration-rls-tenant-scope.sql` and `supabase-migration-trial-signup-rpc.sql` in the PR description as code blocks so I can review them in GitHub without checking out the branch.

## Things to ask me before touching

- The exact list of tables and their `community_id`/`resident_id` columns (Step 1 dump output).
- Whether staff should be allowed to write to `incidents` or only admins. I haven't decided.
- Whether `family_access` tokens should expire (currently the code only checks `is_active`).
- Whether to drop the unused `medication_not_given` table or whether it's planned for future use.

Do NOT run any SQL against production. Every change is meant to land in a `.sql` file I review and paste manually.
