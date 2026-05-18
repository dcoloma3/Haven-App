-- ============================================================
-- Migration: Create medication_not_given table
-- This table does NOT exist in production. It is queried by
-- Dispense.jsx to track scheduled medication doses that were
-- not administered (refused, held, absent, etc.).
--
-- Dispense.jsx inserts: medication_id, resident_id, community_id,
-- scheduled_time, administered_date, reason, notes, recorded_by.
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists medication_not_given (
  id                uuid primary key default gen_random_uuid() not null,
  community_id      uuid references communities(id) on delete cascade,
  resident_id       uuid references residents(id) on delete cascade,
  medication_id     uuid references medications(id) on delete cascade,
  scheduled_time    text not null,
  administered_date date not null,
  reason            text not null,
  notes             text,
  not_given_by_name text,
  recorded_by       uuid references auth.users(id),
  created_at        timestamptz default now()
);

create index if not exists medication_not_given_medication_date_idx
  on medication_not_given (medication_id, administered_date);

alter table medication_not_given enable row level security;

-- RLS policies: staff r/w, scoped by community_id
drop policy if exists "medication_not_given_select" on medication_not_given;
create policy "medication_not_given_select" on medication_not_given
  for select to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or auth.is_super_admin()
  );

drop policy if exists "medication_not_given_insert" on medication_not_given;
create policy "medication_not_given_insert" on medication_not_given
  for insert to authenticated
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or auth.is_super_admin()
  );

drop policy if exists "medication_not_given_update" on medication_not_given;
create policy "medication_not_given_update" on medication_not_given
  for update to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or auth.is_super_admin()
  )
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or auth.is_super_admin()
  );

drop policy if exists "medication_not_given_delete" on medication_not_given;
create policy "medication_not_given_delete" on medication_not_given
  for delete to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or auth.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists medication_not_given;
