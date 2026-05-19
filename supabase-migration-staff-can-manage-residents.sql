-- Allow all community members (staff + admin) to insert and update residents.
-- Previously these operations were restricted to admin-role members only,
-- which caused silent failures when staff clicked "Add Resident".
-- Delete remains admin-only for safety.

-- ── residents insert ──────────────────────────────────────────────────────────
drop policy if exists "residents_insert" on residents;
create policy "residents_insert" on residents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── residents update ──────────────────────────────────────────────────────────
drop policy if exists "residents_update" on residents;
create policy "residents_update" on residents
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- To revert to admin-only inserts and updates, run:
--
-- drop policy if exists "residents_insert" on residents;
-- create policy "residents_insert" on residents
--   for insert to authenticated
--   with check (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   );
--
-- drop policy if exists "residents_update" on residents;
-- create policy "residents_update" on residents
--   for update to authenticated
--   using (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   )
--   with check (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   );
