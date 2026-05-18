-- ============================================================
-- Migration: Ensure prn_administrations table exists
-- This table tracks PRN (as-needed) medication doses.
-- It is queried by Dispense.jsx and ResidentMedHistory.jsx.
--
-- NOTE: MedicationList.jsx currently writes PRN doses to
-- medication_administrations instead of this table — that
-- inconsistency is tracked separately. This migration ensures
-- the canonical PRN table exists with the correct schema.
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists prn_administrations (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references medications(id) on delete cascade,
  resident_id uuid not null references residents(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,
  administered_at timestamptz not null default now(),
  administered_by uuid references auth.users(id),
  administered_by_name text,
  admin_notes text,
  created_at timestamptz default now()
);

alter table prn_administrations enable row level security;

-- RLS policies: staff r/w, scoped through resident_id
drop policy if exists "prn_administrations_select" on prn_administrations;
create policy "prn_administrations_select" on prn_administrations
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select auth.user_community_ids())
    )
    or auth.is_super_admin()
  );

drop policy if exists "prn_administrations_insert" on prn_administrations;
create policy "prn_administrations_insert" on prn_administrations
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select auth.user_community_ids())
    )
    or auth.is_super_admin()
  );

drop policy if exists "prn_administrations_update" on prn_administrations;
create policy "prn_administrations_update" on prn_administrations
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select auth.user_community_ids())
    )
    or auth.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select auth.user_community_ids())
    )
    or auth.is_super_admin()
  );

drop policy if exists "prn_administrations_delete" on prn_administrations;
create policy "prn_administrations_delete" on prn_administrations
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select auth.user_community_ids())
    )
    or auth.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists prn_administrations;
