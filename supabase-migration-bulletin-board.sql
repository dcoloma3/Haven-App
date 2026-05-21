-- ============================================================
-- Migration: Staff Bulletin Board
-- Adds community_bulletins table for facility-scoped staff notices.
-- Active bulletin = WHERE community_id = ? AND cleared_at IS NULL LIMIT 1
-- Run in Supabase SQL Editor (idempotent)
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists community_bulletins (
  id           uuid        primary key default gen_random_uuid(),
  community_id uuid        not null references communities(id) on delete cascade,
  title        text        not null,
  message      text        not null,
  posted_by    uuid        references auth.users(id) on delete set null,
  posted_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cleared_at   timestamptz
);

alter table community_bulletins enable row level security;

-- ── SELECT: any community member (staff or admin) may read active bulletins ───

drop policy if exists "bulletins_select" on community_bulletins;
create policy "bulletins_select" on community_bulletins
  for select to authenticated
  using (
    (community_id = any(public.user_community_ids()) and cleared_at is null)
    or public.is_super_admin()
  );

-- ── INSERT: admin only ────────────────────────────────────────────────────────

drop policy if exists "bulletins_insert" on community_bulletins;
create policy "bulletins_insert" on community_bulletins
  for insert to authenticated
  with check (
    (
      community_id = any(public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  );

-- ── UPDATE: admin only (used to set cleared_at and edit content) ──────────────

drop policy if exists "bulletins_update" on community_bulletins;
create policy "bulletins_update" on community_bulletins
  for update to authenticated
  using (
    (
      community_id = any(public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  )
  with check (
    (
      community_id = any(public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  );

-- ── Index: efficient active-bulletin lookup ───────────────────────────────────

create index if not exists idx_community_bulletins_community_cleared
  on community_bulletins (community_id, cleared_at);

-- ── ROLLBACK (run only to undo) ───────────────────────────────────────────────
-- drop index  if exists idx_community_bulletins_community_cleared;
-- drop table  if exists community_bulletins;
