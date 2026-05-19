-- Consolidated migration: all columns referenced in the frontend but missing from the DB.
-- Safe to run multiple times (all use IF NOT EXISTS / CREATE OR REPLACE).

-- ── residents ─────────────────────────────────────────────────────────────────
-- physician_phone: used in ResidentProfile.jsx (read + write) and faceSheetPDF.js
alter table residents add column if not exists physician_phone text;

-- updated_at: shown on resident cards in Dashboard.jsx
alter table residents add column if not exists updated_at timestamptz default now();

-- Auto-update updated_at whenever a residents row is modified
create or replace function update_residents_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists residents_updated_at_trigger on residents;
create trigger residents_updated_at_trigger
  before update on residents
  for each row execute function update_residents_updated_at();

-- ── medication_not_given ──────────────────────────────────────────────────────
-- Full table for tracking refused/withheld/held doses in the Dispense tab.
-- (Already referenced in Dispense.jsx; this creates it idempotently.)
create table if not exists medication_not_given (
  id               uuid primary key default gen_random_uuid(),
  medication_id    uuid references medications(id) on delete cascade,
  resident_id      uuid references residents(id) on delete cascade,
  community_id     uuid references communities(id),
  scheduled_time   text not null,
  administered_date date not null,
  reason           text not null,
  notes            text,
  recorded_by      uuid,
  recorded_at      timestamptz default now()
);

create index if not exists medication_not_given_med_date_idx
  on medication_not_given(medication_id, administered_date);

alter table medication_not_given enable row level security;

drop policy if exists "medication_not_given_all" on medication_not_given;
create policy "medication_not_given_all" on medication_not_given
  for all using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- alter table residents drop column if exists physician_phone;
-- alter table residents drop column if exists updated_at;
-- drop trigger if exists residents_updated_at_trigger on residents;
-- drop function if exists update_residents_updated_at();
-- drop table if exists medication_not_given;
