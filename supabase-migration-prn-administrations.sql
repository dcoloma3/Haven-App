-- ============================================================
-- Migration: Ensure prn_administrations table exists
-- This table tracks PRN (as-needed) medication doses.
-- It is queried by Dispense.jsx (PRNTab) and MedicationList.jsx.
--
-- NOTE: This table ALREADY EXISTS in production with the schema
-- below. The CREATE TABLE IF NOT EXISTS is safe to run — it will
-- be a no-op against the live database. The column definitions
-- here reflect the ACTUAL production schema as of 2026-05-18.
--
-- Key differences from earlier (incorrect) migration:
--   - NO medication_id FK — PRN doses use medication_name (text) + dose (text)
--   - community_id is NOT NULL (required for RLS scoping)
--   - reason text NOT NULL (required field)
--   - NO administered_by_name — use administered_by uuid only
--   - NO admin_notes — column is named `notes`
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists prn_administrations (
  id              uuid primary key default gen_random_uuid() not null,
  resident_id     uuid not null references residents(id) on delete cascade,
  community_id    uuid not null references communities(id) on delete cascade,
  medication_name text not null,
  dose            text,
  reason          text not null,
  administered_at timestamptz default now() not null,
  administered_by uuid references auth.users(id),
  notes           text,
  created_at      timestamptz default now()
);

alter table prn_administrations enable row level security;

-- RLS policies: staff r/w, scoped directly by community_id
drop policy if exists "prn_administrations_select" on prn_administrations;
create policy "prn_administrations_select" on prn_administrations
  for select to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_insert" on prn_administrations;
create policy "prn_administrations_insert" on prn_administrations
  for insert to authenticated
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_update" on prn_administrations;
create policy "prn_administrations_update" on prn_administrations
  for update to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  )
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_delete" on prn_administrations;
create policy "prn_administrations_delete" on prn_administrations
  for delete to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists prn_administrations;
