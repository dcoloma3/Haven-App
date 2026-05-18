-- Nightly cleanup: remove communities with no members
-- Run on a schedule (e.g., pg_cron or Supabase Edge Function cron)
-- Safe to run multiple times (idempotent)

delete from communities
where created_at < now() - interval '1 day'
  and not exists (
    select 1 from community_members where community_id = communities.id
  );
