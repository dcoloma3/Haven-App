-- ============================================================
-- Migration: Atomic trial signup via Postgres RPC
-- Replaces the 3-step JS sequence in src/lib/trial.js
-- with a single atomic transaction in Postgres.
-- ROLLBACK section at bottom
-- ============================================================

create or replace function public.complete_trial(
  p_user_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_community_name text,
  p_resident_count int
) returns uuid
language plpgsql security definer as $$
declare
  new_community_id uuid;
begin
  insert into communities (name, plan, trial_start_date, trial_end_date, resident_count_at_signup)
  values (p_community_name, 'trial', now(), now() + interval '14 days', p_resident_count)
  returning id into new_community_id;

  insert into community_members (community_id, user_id, role)
  values (new_community_id, p_user_id, 'admin');

  insert into profiles (user_id, email, full_name, first_name, last_name, onboarding_complete, profile_completed)
  values (p_user_id, p_email, p_first_name || ' ' || p_last_name, p_first_name, p_last_name, true, true)
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    onboarding_complete = true,
    profile_completed = true;

  return new_community_id;
end;
$$;

grant execute on function public.complete_trial(uuid, text, text, text, text, int) to authenticated;

-- ROLLBACK
-- drop function if exists public.complete_trial(uuid, text, text, text, text, int);
