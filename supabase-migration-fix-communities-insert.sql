-- ============================================================
-- Fix: communities INSERT during onboarding
-- A brand-new user (no community yet) must be able to create their
-- first community in the onboarding flow. An older, stricter policy
-- in production blocked this with "new row violates row-level
-- security policy for table communities". This restores the intended
-- permissive insert: any authenticated user may create a community
-- (the app immediately adds their community_members admin row).
-- Idempotent.
-- ============================================================

drop policy if exists "communities_insert" on communities;
create policy "communities_insert" on communities
  for insert to authenticated
  with check (auth.uid() is not null);
