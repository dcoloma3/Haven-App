-- ============================================================
-- Migration: resident shower schedule + completion log
-- One schedule per resident (days of week + AM/PM + preferences),
-- and a log of completed showers for check-off. Tenant-scoped by
-- community_id, mirroring bowel_movements. Idempotent.
-- ============================================================

create table if not exists shower_schedules (
  id           uuid primary key default gen_random_uuid() not null,
  resident_id  uuid not null references residents(id) on delete cascade unique,
  community_id uuid not null references communities(id) on delete cascade,
  days         int[] not null default '{}',          -- 0=Sun … 6=Sat
  time_of_day  text check (time_of_day in ('AM', 'PM')),
  preferences  text,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

create table if not exists shower_logs (
  id                uuid primary key default gen_random_uuid() not null,
  resident_id       uuid not null references residents(id) on delete cascade,
  community_id      uuid not null references communities(id) on delete cascade,
  shower_date       date not null,
  period            text check (period in ('AM', 'PM')),
  completed_by_name text,
  recorded_by       uuid references auth.users(id),
  notes             text,
  created_at        timestamptz default now(),
  unique (resident_id, shower_date)
);

alter table shower_schedules enable row level security;
alter table shower_logs enable row level security;

-- RLS: any member of the row's community (or super admin) can read/write both.
do $$
declare t text;
begin
  foreach t in array array['shower_schedules', 'shower_logs'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert to authenticated with check (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_delete" on %1$s', t);
    execute format('create policy "%1$s_delete" on %1$s for delete to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
  end loop;
end $$;

-- ROLLBACK
-- drop table if exists shower_logs;
-- drop table if exists shower_schedules;
