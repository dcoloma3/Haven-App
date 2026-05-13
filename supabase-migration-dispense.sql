-- Add scheduled times to medications
-- Stored as an array of 'HH:MM' strings e.g. {'07:00','14:00','21:00'}
alter table medications add column if not exists scheduled_times text[] default '{}';

-- Track medication administrations (who gave what, when)
create table if not exists medication_administrations (
  id               uuid primary key default gen_random_uuid(),
  medication_id    uuid not null references medications(id) on delete cascade,
  resident_id      uuid not null references residents(id) on delete cascade,
  scheduled_time   text not null,          -- e.g. '07:00'
  administered_date date not null,         -- e.g. '2026-05-13'
  administered_at  timestamptz default now(),
  administered_by  uuid references auth.users(id),
  created_at       timestamptz default now(),
  -- one record per medication per time slot per day
  unique(medication_id, scheduled_time, administered_date)
);

alter table medication_administrations enable row level security;
create policy "staff access" on medication_administrations
  for all to authenticated using (true) with check (true);

-- Add notes field to medications
alter table medications add column if not exists notes text;
