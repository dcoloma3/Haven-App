-- ============================================================
-- Migration: bowel movement logs
-- Per-resident bowel movement tracking (AM/PM daily), with a
-- monthly grid report. Tenant-scoped directly by community_id,
-- mirroring prn_administrations. Idempotent — safe to re-run.
-- ============================================================

create table if not exists bowel_movements (
  id               uuid primary key default gen_random_uuid() not null,
  resident_id      uuid not null references residents(id) on delete cascade,
  community_id     uuid not null references communities(id) on delete cascade,
  occurred_at      timestamptz not null default now(),
  period           text not null check (period in ('AM', 'PM')),
  bristol_type     int check (bristol_type between 1 and 7),
  size             text check (size in ('Small', 'Medium', 'Large')),
  continence       text check (continence in ('Continent', 'Incontinent')),
  notes            text,
  recorded_by      uuid references auth.users(id),
  recorded_by_name text,
  created_at       timestamptz default now()
);

create index if not exists bowel_movements_resident_idx
  on bowel_movements (resident_id, occurred_at desc);

alter table bowel_movements enable row level security;

-- RLS: any member of the row's community (or super admin) can read/write.
drop policy if exists "bowel_movements_select" on bowel_movements;
create policy "bowel_movements_select" on bowel_movements
  for select to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_insert" on bowel_movements;
create policy "bowel_movements_insert" on bowel_movements
  for insert to authenticated
  with check (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_update" on bowel_movements;
create policy "bowel_movements_update" on bowel_movements
  for update to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_delete" on bowel_movements;
create policy "bowel_movements_delete" on bowel_movements
  for delete to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists bowel_movements;
