-- ─────────────────────────────────────────────────────────────────────────────
-- Administering caregiver attribution
--
-- Lets the Dispense tab record WHO administered a med (the caregiver selected on
-- a shared device) separately from WHICH account operated the app. Supports
-- caregivers who don't have an app login via a per-community roster.
--
-- Safe to run multiple times (idempotent). Additive only — nothing is dropped.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Caregiver roster — selectable administering staff, incl. those without logins
create table if not exists community_caregivers (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid not null,
  name         text not null,
  initials     text,
  active       boolean default true not null,
  created_at   timestamptz default now()
);

create index if not exists idx_community_caregivers_community
  on community_caregivers(community_id);

-- 2. Attribution columns on each administration-record table.
--    administered_by stays = the logged-in account (audit trail).
--    administered_by_name  = snapshot of the caregiver who actually administered.
--    administered_by_caregiver_id = roster link (null for accounts / typed names).
alter table medication_administrations
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

alter table prn_administrations
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

alter table medication_not_given
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

-- 3. RLS — scope the roster to its community, same pattern as other tables.
alter table community_caregivers enable row level security;

drop policy if exists "caregivers_select" on community_caregivers;
create policy "caregivers_select" on community_caregivers
  for select using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_insert" on community_caregivers;
create policy "caregivers_insert" on community_caregivers
  for insert with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_update" on community_caregivers;
create policy "caregivers_update" on community_caregivers
  for update using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_delete" on community_caregivers;
create policy "caregivers_delete" on community_caregivers
  for delete using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (run only to undo this migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- alter table medication_administrations drop column if exists administered_by_name;
-- alter table medication_administrations drop column if exists administered_by_caregiver_id;
-- alter table prn_administrations drop column if exists administered_by_name;
-- alter table prn_administrations drop column if exists administered_by_caregiver_id;
-- alter table medication_not_given drop column if exists administered_by_name;
-- alter table medication_not_given drop column if exists administered_by_caregiver_id;
-- drop table if exists community_caregivers;
