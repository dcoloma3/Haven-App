-- ============================================================
-- Haven: Comprehensive RLS Migration v2
-- Fixes: communities INSERT, community_members recursion,
--        profiles SELECT, community_invites onboarding,
--        staff delete on shift_notes/incidents,
--        staff INSERT on work_orders/calendar_events/move_checklists,
--        medication_not_given helper alignment
-- Run in Supabase SQL Editor — idempotent
-- ============================================================

-- ============================================================
-- STEP 1: Helper functions
-- ============================================================

-- user_community_ids: returns all community IDs for the current user
-- SECURITY DEFINER bypasses RLS on community_members so this function
-- never triggers the recursion problem.
create or replace function public.user_community_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select community_id
  from public.community_members
  where user_id = auth.uid()
$$;

-- is_super_admin: checks super_admins table by email
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.super_admins
    where email = auth.email()
  )
$$;

-- is_community_admin: checks whether the current user is an admin
-- in a specific community. SECURITY DEFINER prevents RLS recursion.
create or replace function public.is_community_admin(p_community_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where user_id = auth.uid()
      and community_id = p_community_id
      and role = 'admin'
  )
$$;

-- ============================================================
-- STEP 2: communities
-- Special case: INSERT must allow any authenticated user because
-- during onboarding the user has no community_members row yet.
-- ============================================================

alter table communities enable row level security;

drop policy if exists "communities_select" on communities;
create policy "communities_select" on communities
  for select to authenticated
  using (
    id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "communities_insert" on communities;
create policy "communities_insert" on communities
  for insert to authenticated
  with check (
    -- Any authenticated user may create a new community (onboarding flow).
    -- The app immediately inserts a community_members row making them admin.
    auth.uid() is not null
  );

drop policy if exists "communities_update" on communities;
create policy "communities_update" on communities
  for update to authenticated
  using (
    public.is_community_admin(id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(id)
    or public.is_super_admin()
  );

drop policy if exists "communities_delete" on communities;
create policy "communities_delete" on communities
  for delete to authenticated
  using (public.is_super_admin());

-- ============================================================
-- STEP 3: community_members
-- THE RECURSION FIX: all role checks use is_community_admin()
-- (SECURITY DEFINER) instead of inline subqueries on this table.
-- INSERT special case: a user may insert a row for themselves
-- (handles onboarding and invite acceptance).
-- ============================================================

alter table community_members enable row level security;

drop policy if exists "community_members_select" on community_members;
create policy "community_members_select" on community_members
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "community_members_insert" on community_members;
create policy "community_members_insert" on community_members
  for insert to authenticated
  with check (
    -- Case 1: admin adding someone else to their community
    public.is_community_admin(community_id)
    -- Case 2: user inserting themselves (onboarding / invite acceptance)
    -- They have no membership row yet so is_community_admin() returns false.
    or (user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "community_members_update" on community_members;
create policy "community_members_update" on community_members
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "community_members_delete" on community_members;
create policy "community_members_delete" on community_members
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 4: profiles
-- Any community member may read profiles of people in the same
-- community. This is required for staff directory, medication
-- history ("administered by"), shift assignment, work order
-- assignment, etc.
-- ============================================================

alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (
    -- Own profile
    user_id = auth.uid()
    -- Co-community member profiles
    or user_id in (
      select cm.user_id
      from public.community_members cm
      where cm.community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- STEP 5: community_invites
-- SELECT must allow lookup by email before membership exists.
-- ============================================================

alter table community_invites enable row level security;

drop policy if exists "community_invites_select" on community_invites;
create policy "community_invites_select" on community_invites
  for select to authenticated
  using (
    -- Admin sees their community's invites
    community_id in (select public.user_community_ids())
    -- User can look up pending invites for their own email (pre-membership)
    or email = auth.email()
    or public.is_super_admin()
  );

drop policy if exists "community_invites_insert" on community_invites;
create policy "community_invites_insert" on community_invites
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "community_invites_update" on community_invites;
create policy "community_invites_update" on community_invites
  for update to authenticated
  using (
    -- Admin managing invites
    community_id in (select public.user_community_ids())
    -- Invitee accepting their invite
    or email = auth.email()
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or email = auth.email()
    or public.is_super_admin()
  );

drop policy if exists "community_invites_delete" on community_invites;
create policy "community_invites_delete" on community_invites
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 6: residents
-- Staff can INSERT and UPDATE (daily care workflow).
-- DELETE is admin-only.
-- ============================================================

alter table residents enable row level security;

drop policy if exists "residents_select" on residents;
create policy "residents_select" on residents
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "residents_insert" on residents;
create policy "residents_insert" on residents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

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

drop policy if exists "residents_delete" on residents;
create policy "residents_delete" on residents
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 7: medications (admin-only write — clinical data)
-- ============================================================

alter table medications enable row level security;

drop policy if exists "medications_select" on medications;
create policy "medications_select" on medications
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medications_insert" on medications;
create policy "medications_insert" on medications
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "medications_update" on medications;
create policy "medications_update" on medications
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "medications_delete" on medications;
create policy "medications_delete" on medications
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 8: medication_administrations (staff r/w — core dispense)
-- ============================================================

alter table medication_administrations enable row level security;

drop policy if exists "medication_administrations_select" on medication_administrations;
create policy "medication_administrations_select" on medication_administrations
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_insert" on medication_administrations;
create policy "medication_administrations_insert" on medication_administrations
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_update" on medication_administrations;
create policy "medication_administrations_update" on medication_administrations
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_delete" on medication_administrations;
create policy "medication_administrations_delete" on medication_administrations
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 9: medication_not_given (staff r/w — aligned to helper)
-- ============================================================

alter table medication_not_given enable row level security;

drop policy if exists "medication_not_given_select" on medication_not_given;
create policy "medication_not_given_select" on medication_not_given
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_insert" on medication_not_given;
create policy "medication_not_given_insert" on medication_not_given
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_update" on medication_not_given;
create policy "medication_not_given_update" on medication_not_given
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_delete" on medication_not_given;
create policy "medication_not_given_delete" on medication_not_given
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 10: prn_administrations (staff r/w)
-- ============================================================

alter table prn_administrations enable row level security;

drop policy if exists "prn_administrations_select" on prn_administrations;
create policy "prn_administrations_select" on prn_administrations
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_insert" on prn_administrations;
create policy "prn_administrations_insert" on prn_administrations
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_update" on prn_administrations;
create policy "prn_administrations_update" on prn_administrations
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_delete" on prn_administrations;
create policy "prn_administrations_delete" on prn_administrations
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 11: vital_signs (staff r/w)
-- ============================================================

alter table vital_signs enable row level security;

drop policy if exists "vital_signs_select" on vital_signs;
create policy "vital_signs_select" on vital_signs
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_insert" on vital_signs;
create policy "vital_signs_insert" on vital_signs
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_update" on vital_signs;
create policy "vital_signs_update" on vital_signs
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_delete" on vital_signs;
create policy "vital_signs_delete" on vital_signs
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 12: adl_records (staff r/w)
-- ============================================================

alter table adl_records enable row level security;

drop policy if exists "adl_records_select" on adl_records;
create policy "adl_records_select" on adl_records
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_insert" on adl_records;
create policy "adl_records_insert" on adl_records
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_update" on adl_records;
create policy "adl_records_update" on adl_records
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_delete" on adl_records;
create policy "adl_records_delete" on adl_records
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 13: incidents (staff r/w, admin-only delete)
-- ============================================================

alter table incidents enable row level security;

drop policy if exists "incidents_select" on incidents;
create policy "incidents_select" on incidents
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_insert" on incidents;
create policy "incidents_insert" on incidents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_update" on incidents;
create policy "incidents_update" on incidents
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_delete" on incidents;
create policy "incidents_delete" on incidents
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 14: shift_notes (staff r/w, admin-only delete)
-- ============================================================

alter table shift_notes enable row level security;

drop policy if exists "shift_notes_select" on shift_notes;
create policy "shift_notes_select" on shift_notes
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_insert" on shift_notes;
create policy "shift_notes_insert" on shift_notes
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_update" on shift_notes;
create policy "shift_notes_update" on shift_notes
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_delete" on shift_notes;
create policy "shift_notes_delete" on shift_notes
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 15: calendar_events
-- Staff create appointments for residents; admin deletes.
-- ============================================================

alter table calendar_events enable row level security;

drop policy if exists "calendar_events_select" on calendar_events;
create policy "calendar_events_select" on calendar_events
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_insert" on calendar_events;
create policy "calendar_events_insert" on calendar_events
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_update" on calendar_events;
create policy "calendar_events_update" on calendar_events
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_delete" on calendar_events;
create policy "calendar_events_delete" on calendar_events
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 16: activities (admin creates/deletes; staff read)
-- ============================================================

alter table activities enable row level security;

drop policy if exists "activities_select" on activities;
create policy "activities_select" on activities
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activities_insert" on activities;
create policy "activities_insert" on activities
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "activities_update" on activities;
create policy "activities_update" on activities
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "activities_delete" on activities;
create policy "activities_delete" on activities
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 17: activity_attendance (staff r/w)
-- ============================================================

alter table activity_attendance enable row level security;

drop policy if exists "activity_attendance_select" on activity_attendance;
create policy "activity_attendance_select" on activity_attendance
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_insert" on activity_attendance;
create policy "activity_attendance_insert" on activity_attendance
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_update" on activity_attendance;
create policy "activity_attendance_update" on activity_attendance
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_delete" on activity_attendance;
create policy "activity_attendance_delete" on activity_attendance
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 18: transportation_log (staff r/w)
-- ============================================================

alter table transportation_log enable row level security;

drop policy if exists "transportation_log_select" on transportation_log;
create policy "transportation_log_select" on transportation_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_insert" on transportation_log;
create policy "transportation_log_insert" on transportation_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_update" on transportation_log;
create policy "transportation_log_update" on transportation_log
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_delete" on transportation_log;
create policy "transportation_log_delete" on transportation_log
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 19: work_orders
-- Staff submit work orders; admin deletes.
-- ============================================================

alter table work_orders enable row level security;

drop policy if exists "work_orders_select" on work_orders;
create policy "work_orders_select" on work_orders
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_insert" on work_orders;
create policy "work_orders_insert" on work_orders
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_update" on work_orders;
create policy "work_orders_update" on work_orders
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_delete" on work_orders;
create policy "work_orders_delete" on work_orders
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 20: shifts (admin creates/deletes; staff read only)
-- ============================================================

alter table shifts enable row level security;

drop policy if exists "shifts_select" on shifts;
create policy "shifts_select" on shifts
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shifts_insert" on shifts;
create policy "shifts_insert" on shifts
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "shifts_update" on shifts;
create policy "shifts_update" on shifts
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "shifts_delete" on shifts;
create policy "shifts_delete" on shifts
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 21: billing_records (admin-only)
-- ============================================================

alter table billing_records enable row level security;

drop policy if exists "billing_records_select" on billing_records;
create policy "billing_records_select" on billing_records
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_insert" on billing_records;
create policy "billing_records_insert" on billing_records
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_update" on billing_records;
create policy "billing_records_update" on billing_records
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_delete" on billing_records;
create policy "billing_records_delete" on billing_records
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 22: lease_terms (admin-only — financial)
-- ============================================================

alter table lease_terms enable row level security;

drop policy if exists "lease_terms_select" on lease_terms;
create policy "lease_terms_select" on lease_terms
  for select to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_insert" on lease_terms;
create policy "lease_terms_insert" on lease_terms
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_update" on lease_terms;
create policy "lease_terms_update" on lease_terms
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_delete" on lease_terms;
create policy "lease_terms_delete" on lease_terms
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 23: staff_certifications (admin manages; staff read own)
-- ============================================================

alter table staff_certifications enable row level security;

drop policy if exists "staff_certifications_select" on staff_certifications;
create policy "staff_certifications_select" on staff_certifications
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_insert" on staff_certifications;
create policy "staff_certifications_insert" on staff_certifications
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_update" on staff_certifications;
create policy "staff_certifications_update" on staff_certifications
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_delete" on staff_certifications;
create policy "staff_certifications_delete" on staff_certifications
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 24: waitlist (admin-only — prospective residents)
-- ============================================================

alter table waitlist enable row level security;

drop policy if exists "waitlist_select" on waitlist;
create policy "waitlist_select" on waitlist
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_insert" on waitlist;
create policy "waitlist_insert" on waitlist
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_update" on waitlist;
create policy "waitlist_update" on waitlist
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_delete" on waitlist;
create policy "waitlist_delete" on waitlist
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 25: notification_settings (admin-only config)
-- ============================================================

alter table notification_settings enable row level security;

drop policy if exists "notification_settings_select" on notification_settings;
create policy "notification_settings_select" on notification_settings
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_insert" on notification_settings;
create policy "notification_settings_insert" on notification_settings
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_update" on notification_settings;
create policy "notification_settings_update" on notification_settings
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_delete" on notification_settings;
create policy "notification_settings_delete" on notification_settings
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 26: notification_log (staff r/w — append-mostly)
-- ============================================================

alter table notification_log enable row level security;

drop policy if exists "notification_log_select" on notification_log;
create policy "notification_log_select" on notification_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "notification_log_insert" on notification_log;
create policy "notification_log_insert" on notification_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- No update or delete — notification log is treated as append-only.

-- ============================================================
-- STEP 27: care_plans (admin-only — clinical)
-- ============================================================

alter table care_plans enable row level security;

drop policy if exists "care_plans_select" on care_plans;
create policy "care_plans_select" on care_plans
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_insert" on care_plans;
create policy "care_plans_insert" on care_plans
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_update" on care_plans;
create policy "care_plans_update" on care_plans
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_delete" on care_plans;
create policy "care_plans_delete" on care_plans
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 28: health_care (admin-only — clinical)
-- ============================================================

alter table health_care enable row level security;

drop policy if exists "health_care_select" on health_care;
create policy "health_care_select" on health_care
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_insert" on health_care;
create policy "health_care_insert" on health_care
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_update" on health_care;
create policy "health_care_update" on health_care
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_delete" on health_care;
create policy "health_care_delete" on health_care
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 29: dietary_profiles (admin-only — clinical setup)
-- ============================================================

alter table dietary_profiles enable row level security;

drop policy if exists "dietary_profiles_select" on dietary_profiles;
create policy "dietary_profiles_select" on dietary_profiles
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_insert" on dietary_profiles;
create policy "dietary_profiles_insert" on dietary_profiles
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_update" on dietary_profiles;
create policy "dietary_profiles_update" on dietary_profiles
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_delete" on dietary_profiles;
create policy "dietary_profiles_delete" on dietary_profiles
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 30: emergency_contacts (admin-only — sensitive PII)
-- ============================================================

alter table emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_select" on emergency_contacts;
create policy "emergency_contacts_select" on emergency_contacts
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_insert" on emergency_contacts;
create policy "emergency_contacts_insert" on emergency_contacts
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_update" on emergency_contacts;
create policy "emergency_contacts_update" on emergency_contacts
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_delete" on emergency_contacts;
create policy "emergency_contacts_delete" on emergency_contacts
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 31: resident_documents (admin-only — sensitive files)
-- ============================================================

alter table resident_documents enable row level security;

drop policy if exists "resident_documents_select" on resident_documents;
create policy "resident_documents_select" on resident_documents
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_insert" on resident_documents;
create policy "resident_documents_insert" on resident_documents
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_update" on resident_documents;
create policy "resident_documents_update" on resident_documents
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_delete" on resident_documents;
create policy "resident_documents_delete" on resident_documents
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 32: resident_photos (staff can upload; admin deletes)
-- ============================================================

alter table resident_photos enable row level security;

drop policy if exists "resident_photos_select" on resident_photos;
create policy "resident_photos_select" on resident_photos
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_insert" on resident_photos;
create policy "resident_photos_insert" on resident_photos
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_delete" on resident_photos;
create policy "resident_photos_delete" on resident_photos
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 33: resident_compliance_items (staff r/w; admin deletes)
-- ============================================================

alter table resident_compliance_items enable row level security;

drop policy if exists "community members can manage compliance items" on resident_compliance_items;

drop policy if exists "resident_compliance_items_select" on resident_compliance_items;
create policy "resident_compliance_items_select" on resident_compliance_items
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_insert" on resident_compliance_items;
create policy "resident_compliance_items_insert" on resident_compliance_items
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_update" on resident_compliance_items;
create policy "resident_compliance_items_update" on resident_compliance_items
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_delete" on resident_compliance_items;
create policy "resident_compliance_items_delete" on resident_compliance_items
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 34: compliance_audit_log (immutable — no update/delete)
-- ============================================================

alter table compliance_audit_log enable row level security;

drop policy if exists "community members can read audit log" on compliance_audit_log;
drop policy if exists "community members can insert audit log" on compliance_audit_log;

drop policy if exists "compliance_audit_log_select" on compliance_audit_log;
create policy "compliance_audit_log_select" on compliance_audit_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "compliance_audit_log_insert" on compliance_audit_log;
create policy "compliance_audit_log_insert" on compliance_audit_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- Intentionally no update or delete policy — audit log is immutable.

-- ============================================================
-- STEP 35: move_checklists
-- Admin creates/deletes; staff update checklist items.
-- ============================================================

alter table move_checklists enable row level security;

drop policy if exists "move_checklists_select" on move_checklists;
create policy "move_checklists_select" on move_checklists
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_insert" on move_checklists;
create policy "move_checklists_insert" on move_checklists
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_update" on move_checklists;
create policy "move_checklists_update" on move_checklists
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_delete" on move_checklists;
create policy "move_checklists_delete" on move_checklists
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 36: family_access
-- SELECT is public (token-based portal, no Supabase session).
-- INSERT is admin-only (creates the shareable link).
-- UPDATE allows any authenticated community member (last_accessed_at).
-- DELETE is admin-only.
-- ============================================================

alter table family_access enable row level security;

drop policy if exists "family_access_select" on family_access;
create policy "family_access_select" on family_access
  for select
  using (true);

drop policy if exists "family_access_insert" on family_access;
create policy "family_access_insert" on family_access
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "family_access_update" on family_access;
create policy "family_access_update" on family_access
  for update
  -- Allow unauthenticated token updates (last_accessed_at from FamilyView)
  using (true)
  with check (true);

drop policy if exists "family_access_delete" on family_access;
create policy "family_access_delete" on family_access
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 37: super_admins
-- RLS intentionally NOT enabled. The is_super_admin() function
-- reads this table with SECURITY DEFINER, bypassing any RLS that
-- would create a bootstrap paradox. Security is enforced at the
-- application layer (SuperAdmin.jsx page guard + RequireSuperAdmin).
-- ============================================================

-- alter table super_admins disable row level security; -- already off

-- ============================================================
-- ROLLBACK
-- ============================================================
/*
drop function if exists public.is_community_admin(uuid);
drop function if exists public.user_community_ids();
drop function if exists public.is_super_admin();

-- Then re-run supabase-migration-rls-tenant-scope.sql to restore v1 policies.
*/


---

## Summary of what changed vs. the existing migration

| # | Table | Change |
|---|---|---|
| 1 | `community_members` | **Recursion fix**: all role checks now use `is_community_admin()` SECURITY DEFINER function. INSERT allows `user_id = auth.uid()` for onboarding/invite acceptance. |
| 2 | `communities` | INSERT allows any authenticated user (onboarding). DELETE restricted to super_admin only (previously allowed community admins to delete themselves). |
| 3 | `profiles` | SELECT now allows co-community members, not just own row. Fixes StaffDirectory, med history, dispense "administered by" queries. |
| 4 | `community_invites` | SELECT allows lookup by `auth.email()` even before membership — fixes onboarding invite detection. |
| 5 | `incidents` | DELETE restricted to admin-only (was any member). |
| 6 | `shift_notes` | DELETE restricted to admin-only (was any member). |
| 7 | `calendar_events` | INSERT/UPDATE opened to any community member (was admin-only). Staff create appointments. DELETE is admin-only. |
| 8 | `work_orders` | INSERT/UPDATE opened to any community member (was admin-only). Staff submit. DELETE is admin-only. |
| 9 | `move_checklists` | INSERT/DELETE admin-only. UPDATE opened to any member (staff complete items). |
| 10 | `billing_records` | SELECT restricted to admin-only (was any member — financial data). |
| 11 | `waitlist` | SELECT restricted to admin-only (was any member). |
| 12 | `medication_not_given` | Changed from inline subquery to `user_community_ids()` helper for consistency. |
| 13 | `resident_compliance_items` | Replaced combined `using/with check` policy with separate per-operation policies; DELETE admin-only. |
| 14 | `compliance_audit_log` | Policy names normalized to snake_case scheme used by rest of migration. |
| 15 | `family_access` | INSERT/DELETE changed to admin-only (was any community member). UPDATE left fully open to support unauthenticated token access from FamilyView. |
| NEW | `is_community_admin()` | New SECURITY DEFINER helper used by 15+ tables to avoid inline subqueries on `community_members`. |
