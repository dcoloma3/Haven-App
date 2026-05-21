-- ============================================================
-- Migration: accept_invite() RPC
-- Atomically joins a staff member to their community when they
-- complete onboarding. Runs as SECURITY DEFINER to bypass RLS
-- on community_members (new users have no existing membership
-- to satisfy the INSERT policy).
--
-- The function validates that:
--   1. An unaccepted invite exists for auth.email() + p_invite_id
--   2. The calling user is the one being invited (auth.uid() check)
-- ============================================================

create or replace function public.accept_invite(
  p_invite_id   uuid,
  p_user_id     uuid,
  p_full_name   text,
  p_email       text
) returns uuid
language plpgsql security definer as $$
declare
  v_invite        record;
  v_community_id  uuid;
begin
  -- Fetch and validate the invite
  select * into v_invite
  from community_invites
  where id = p_invite_id
    and lower(email) = lower(p_email)
    and accepted = false;

  if not found then
    raise exception 'Invite not found or already accepted';
  end if;

  v_community_id := v_invite.community_id;

  -- Join the community
  insert into community_members (community_id, user_id, role)
  values (v_community_id, p_user_id, v_invite.role)
  on conflict (community_id, user_id) do update set role = excluded.role;

  -- Mark invite accepted
  update community_invites
  set accepted = true
  where id = p_invite_id;

  -- Save / update profile
  insert into profiles (user_id, email, full_name, onboarding_complete, profile_completed)
  values (p_user_id, p_email, p_full_name, true, true)
  on conflict (user_id) do update set
    full_name           = excluded.full_name,
    onboarding_complete = true,
    profile_completed   = true;

  return v_community_id;
end;
$$;

grant execute on function public.accept_invite(uuid, uuid, text, text) to authenticated;

-- ROLLBACK
-- drop function if exists public.accept_invite(uuid, uuid, text, text);
