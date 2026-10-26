-- ============================================================
-- Migration: get_my_pending_invites() RPC
-- Lets an already-registered user see invites addressed to their
-- email for communities they are NOT yet a member of (so they can
-- accept via accept_invite()). SECURITY DEFINER bypasses the
-- community_invites / communities RLS, but only ever returns rows
-- for the caller's own email. Idempotent.
-- ============================================================

create or replace function public.get_my_pending_invites()
returns table (invite_id uuid, community_id uuid, community_name text, role text)
language sql stable security definer
set search_path = public
as $$
  select i.id, i.community_id, c.name, i.role
  from public.community_invites i
  join public.communities c on c.id = i.community_id
  where lower(i.email) = lower(auth.email())
    and i.accepted = false
  order by i.created_at desc
$$;

grant execute on function public.get_my_pending_invites() to authenticated;

-- ROLLBACK
-- drop function if exists public.get_my_pending_invites();
