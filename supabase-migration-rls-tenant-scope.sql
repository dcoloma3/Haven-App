-- ============================================================
-- Migration: Tenant-scoped RLS policies
-- Run AFTER: all existing migrations
-- ROLLBACK section at bottom
-- ============================================================

-- STEP 1: Helper functions
create or replace function public.user_community_ids() returns setof uuid
language sql stable security definer as $$
  select community_id from public.community_members where user_id = auth.uid()
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.super_admins where email = auth.email()
  )
$$;

-- ============================================================
-- STEP 2: Resident-scoped tables (direct community_id)
-- ============================================================

-- ── residents ──
alter table residents enable row level security;

drop policy if exists "residents_select" on residents;
create policy "residents_select" on residents
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "residents_insert" on residents;
create policy "residents_insert" on residents
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = residents.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "residents_update" on residents;
create policy "residents_update" on residents
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = residents.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = residents.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "residents_delete" on residents;
create policy "residents_delete" on residents
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = residents.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── medications ──
alter table medications enable row level security;

drop policy if exists "medications_select" on medications;
create policy "medications_select" on medications
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medications_insert" on medications;
create policy "medications_insert" on medications
  for insert to authenticated
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "medications_update" on medications;
create policy "medications_update" on medications
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "medications_delete" on medications;
create policy "medications_delete" on medications
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── lease_terms ──
alter table lease_terms enable row level security;

drop policy if exists "lease_terms_select" on lease_terms;
create policy "lease_terms_select" on lease_terms
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_insert" on lease_terms;
create policy "lease_terms_insert" on lease_terms
  for insert to authenticated
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_update" on lease_terms;
create policy "lease_terms_update" on lease_terms
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_delete" on lease_terms;
create policy "lease_terms_delete" on lease_terms
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── billing_records ──
alter table billing_records enable row level security;

drop policy if exists "billing_records_select" on billing_records;
create policy "billing_records_select" on billing_records
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "billing_records_insert" on billing_records;
create policy "billing_records_insert" on billing_records
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = billing_records.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "billing_records_update" on billing_records;
create policy "billing_records_update" on billing_records
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = billing_records.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = billing_records.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "billing_records_delete" on billing_records;
create policy "billing_records_delete" on billing_records
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = billing_records.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── staff_certifications ──
alter table staff_certifications enable row level security;

drop policy if exists "staff_certifications_select" on staff_certifications;
create policy "staff_certifications_select" on staff_certifications
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "staff_certifications_insert" on staff_certifications;
create policy "staff_certifications_insert" on staff_certifications
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = staff_certifications.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_update" on staff_certifications;
create policy "staff_certifications_update" on staff_certifications
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = staff_certifications.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = staff_certifications.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_delete" on staff_certifications;
create policy "staff_certifications_delete" on staff_certifications
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = staff_certifications.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── shifts ──
alter table shifts enable row level security;

drop policy if exists "shifts_select" on shifts;
create policy "shifts_select" on shifts
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "shifts_insert" on shifts;
create policy "shifts_insert" on shifts
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = shifts.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "shifts_update" on shifts;
create policy "shifts_update" on shifts
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = shifts.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = shifts.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "shifts_delete" on shifts;
create policy "shifts_delete" on shifts
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = shifts.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── shift_notes — staff r/w ──
alter table shift_notes enable row level security;

drop policy if exists "shift_notes_select" on shift_notes;
create policy "shift_notes_select" on shift_notes
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

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
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "shift_notes_delete" on shift_notes;
create policy "shift_notes_delete" on shift_notes
  for delete to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

-- ── calendar_events ──
alter table calendar_events enable row level security;

drop policy if exists "calendar_events_select" on calendar_events;
create policy "calendar_events_select" on calendar_events
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "calendar_events_insert" on calendar_events;
create policy "calendar_events_insert" on calendar_events
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = calendar_events.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_update" on calendar_events;
create policy "calendar_events_update" on calendar_events
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = calendar_events.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = calendar_events.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_delete" on calendar_events;
create policy "calendar_events_delete" on calendar_events
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = calendar_events.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── activities ──
alter table activities enable row level security;

drop policy if exists "activities_select" on activities;
create policy "activities_select" on activities
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "activities_insert" on activities;
create policy "activities_insert" on activities
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = activities.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "activities_update" on activities;
create policy "activities_update" on activities
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = activities.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = activities.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "activities_delete" on activities;
create policy "activities_delete" on activities
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = activities.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── activity_attendance — staff r/w ──
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
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "activity_attendance_delete" on activity_attendance;
create policy "activity_attendance_delete" on activity_attendance
  for delete to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

-- ── transportation_log — staff r/w ──
alter table transportation_log enable row level security;

drop policy if exists "transportation_log_select" on transportation_log;
create policy "transportation_log_select" on transportation_log
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

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
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "transportation_log_delete" on transportation_log;
create policy "transportation_log_delete" on transportation_log
  for delete to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

-- ── work_orders ──
alter table work_orders enable row level security;

drop policy if exists "work_orders_select" on work_orders;
create policy "work_orders_select" on work_orders
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "work_orders_insert" on work_orders;
create policy "work_orders_insert" on work_orders
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = work_orders.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "work_orders_update" on work_orders;
create policy "work_orders_update" on work_orders
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = work_orders.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = work_orders.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "work_orders_delete" on work_orders;
create policy "work_orders_delete" on work_orders
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = work_orders.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── move_checklists ──
alter table move_checklists enable row level security;

drop policy if exists "move_checklists_select" on move_checklists;
create policy "move_checklists_select" on move_checklists
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "move_checklists_insert" on move_checklists;
create policy "move_checklists_insert" on move_checklists
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = move_checklists.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_update" on move_checklists;
create policy "move_checklists_update" on move_checklists
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = move_checklists.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = move_checklists.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_delete" on move_checklists;
create policy "move_checklists_delete" on move_checklists
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = move_checklists.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── notification_settings ──
alter table notification_settings enable row level security;

drop policy if exists "notification_settings_select" on notification_settings;
create policy "notification_settings_select" on notification_settings
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "notification_settings_insert" on notification_settings;
create policy "notification_settings_insert" on notification_settings
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = notification_settings.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_update" on notification_settings;
create policy "notification_settings_update" on notification_settings
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = notification_settings.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = notification_settings.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_delete" on notification_settings;
create policy "notification_settings_delete" on notification_settings
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = notification_settings.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── notification_log — staff r/w ──
alter table notification_log enable row level security;

drop policy if exists "notification_log_select" on notification_log;
create policy "notification_log_select" on notification_log
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "notification_log_insert" on notification_log;
create policy "notification_log_insert" on notification_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "notification_log_update" on notification_log;
create policy "notification_log_update" on notification_log
  for update to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "notification_log_delete" on notification_log;
create policy "notification_log_delete" on notification_log
  for delete to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

-- ── health_care ──
alter table health_care enable row level security;

drop policy if exists "health_care_select" on health_care;
create policy "health_care_select" on health_care
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "health_care_insert" on health_care;
create policy "health_care_insert" on health_care
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = health_care.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "health_care_update" on health_care;
create policy "health_care_update" on health_care
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = health_care.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = health_care.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "health_care_delete" on health_care;
create policy "health_care_delete" on health_care
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = health_care.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── dietary_profiles ──
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
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_update" on dietary_profiles;
create policy "dietary_profiles_update" on dietary_profiles
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_delete" on dietary_profiles;
create policy "dietary_profiles_delete" on dietary_profiles
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── waitlist ──
alter table waitlist enable row level security;

drop policy if exists "waitlist_select" on waitlist;
create policy "waitlist_select" on waitlist
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "waitlist_insert" on waitlist;
create policy "waitlist_insert" on waitlist
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = waitlist.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "waitlist_update" on waitlist;
create policy "waitlist_update" on waitlist
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = waitlist.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = waitlist.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "waitlist_delete" on waitlist;
create policy "waitlist_delete" on waitlist
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = waitlist.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ── community_invites ──
alter table community_invites enable row level security;

drop policy if exists "community_invites_select" on community_invites;
create policy "community_invites_select" on community_invites
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "community_invites_insert" on community_invites;
create policy "community_invites_insert" on community_invites
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = community_invites.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "community_invites_update" on community_invites;
create policy "community_invites_update" on community_invites
  for update to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "community_invites_delete" on community_invites;
create policy "community_invites_delete" on community_invites
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = community_invites.community_id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 3: Staff r/w tables (scoped via resident_id)
-- ============================================================

-- ── vital_signs — staff r/w ──
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

-- ── incidents — staff r/w (daily workflow) ──
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
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "incidents_delete" on incidents;
create policy "incidents_delete" on incidents
  for delete to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

-- ── medication_administrations — staff r/w ──
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

-- ── medication_not_given — staff r/w ──
-- NOTE: This table is intentionally kept. It records doses that were not
-- administered (refused, held, omitted) and is distinct from
-- medication_administrations. Both tables serve the audit trail.
alter table medication_not_given enable row level security;

drop policy if exists "medication_not_given_select" on medication_not_given;
create policy "medication_not_given_select" on medication_not_given
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_insert" on medication_not_given;
create policy "medication_not_given_insert" on medication_not_given
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_update" on medication_not_given;
create policy "medication_not_given_update" on medication_not_given
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

drop policy if exists "medication_not_given_delete" on medication_not_given;
create policy "medication_not_given_delete" on medication_not_given
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ── prn_administrations — staff r/w ──
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

-- ── adl_records — staff r/w ──
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
-- STEP 4: Admin-only write, scoped via resident_id
-- ============================================================

-- ── emergency_contacts ──
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
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_update" on emergency_contacts;
create policy "emergency_contacts_update" on emergency_contacts
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_delete" on emergency_contacts;
create policy "emergency_contacts_delete" on emergency_contacts
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── care_plans ──
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
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "care_plans_update" on care_plans;
create policy "care_plans_update" on care_plans
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "care_plans_delete" on care_plans;
create policy "care_plans_delete" on care_plans
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── resident_documents ──
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
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_update" on resident_documents;
create policy "resident_documents_update" on resident_documents
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_delete" on resident_documents;
create policy "resident_documents_delete" on resident_documents
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ── resident_photos ──
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
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_update" on resident_photos;
create policy "resident_photos_update" on resident_photos
  for update to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  )
  with check (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_delete" on resident_photos;
create policy "resident_photos_delete" on resident_photos
  for delete to authenticated
  using (
    (resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and exists (select 1 from community_members
                    where user_id = auth.uid()
                      and community_id = r.community_id
                      and role = 'admin')
    ))
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 5: Special cases
-- ============================================================

-- ── family_access ──
-- SPECIAL: family_access uses token-based authentication, NOT Supabase Auth.
-- FamilyView.jsx authenticates via the `access_token` column value passed in the URL.
-- The route is public — no Supabase session is available.
-- Therefore, SELECT must remain permissive (using true) so the token lookup works.
-- Write operations are locked to authenticated community members only,
-- preventing unauthorized family link creation.
alter table family_access enable row level security;

drop policy if exists "family_access_select" on family_access;
create policy "family_access_select" on family_access
  for select
  using (true);

drop policy if exists "family_access_insert" on family_access;
create policy "family_access_insert" on family_access
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "family_access_update" on family_access;
create policy "family_access_update" on family_access
  for update to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin())
  with check (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "family_access_delete" on family_access;
create policy "family_access_delete" on family_access
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── super_admins ──
-- NOTE: RLS is intentionally NOT enabled on super_admins.
-- This table is only queried by authenticated super admins via the Supabase
-- client with service-role context. Adding per-row policies would create
-- a bootstrap problem: the is_super_admin() function itself reads this table.
-- Security is enforced at the application layer via the SuperAdmin page guard.

-- ── admin_invites ──
-- NOTE: RLS is intentionally NOT enabled on admin_invites.
-- This table is only written to by super admins via service-role context.
-- It is never exposed to regular authenticated users.

-- ── profiles ──
alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── community_members ──
alter table community_members enable row level security;

drop policy if exists "community_members_select" on community_members;
create policy "community_members_select" on community_members
  for select to authenticated
  using (community_id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "community_members_insert" on community_members;
create policy "community_members_insert" on community_members
  for insert to authenticated
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members cm2
                  where cm2.user_id = auth.uid()
                    and cm2.community_id = community_members.community_id
                    and cm2.role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "community_members_update" on community_members;
create policy "community_members_update" on community_members
  for update to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members cm2
                  where cm2.user_id = auth.uid()
                    and cm2.community_id = community_members.community_id
                    and cm2.role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members cm2
                  where cm2.user_id = auth.uid()
                    and cm2.community_id = community_members.community_id
                    and cm2.role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "community_members_delete" on community_members;
create policy "community_members_delete" on community_members
  for delete to authenticated
  using (
    (community_id in (select public.user_community_ids())
      and exists (select 1 from community_members cm2
                  where cm2.user_id = auth.uid()
                    and cm2.community_id = community_members.community_id
                    and cm2.role = 'admin'))
    or public.is_super_admin()
  );

-- ── communities ──
alter table communities enable row level security;

drop policy if exists "communities_select" on communities;
create policy "communities_select" on communities
  for select to authenticated
  using (id in (select public.user_community_ids()) or public.is_super_admin());

drop policy if exists "communities_insert" on communities;
create policy "communities_insert" on communities
  for insert to authenticated
  with check (auth.uid() is not null or public.is_super_admin());

drop policy if exists "communities_update" on communities;
create policy "communities_update" on communities
  for update to authenticated
  using (
    (id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = communities.id
                    and role = 'admin'))
    or public.is_super_admin()
  )
  with check (
    (id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = communities.id
                    and role = 'admin'))
    or public.is_super_admin()
  );

drop policy if exists "communities_delete" on communities;
create policy "communities_delete" on communities
  for delete to authenticated
  using (
    (id in (select public.user_community_ids())
      and exists (select 1 from community_members
                  where user_id = auth.uid()
                    and community_id = communities.id
                    and role = 'admin'))
    or public.is_super_admin()
  );

-- ============================================================
-- ROLLBACK
-- ============================================================
-- To undo this migration, run the following:

/*
-- Drop helper functions
drop function if exists public.user_community_ids();
drop function if exists public.is_super_admin();

-- Drop all policies created above
drop policy if exists "residents_select" on residents;
drop policy if exists "residents_insert" on residents;
drop policy if exists "residents_update" on residents;
drop policy if exists "residents_delete" on residents;

drop policy if exists "medications_select" on medications;
drop policy if exists "medications_insert" on medications;
drop policy if exists "medications_update" on medications;
drop policy if exists "medications_delete" on medications;

drop policy if exists "lease_terms_select" on lease_terms;
drop policy if exists "lease_terms_insert" on lease_terms;
drop policy if exists "lease_terms_update" on lease_terms;
drop policy if exists "lease_terms_delete" on lease_terms;

drop policy if exists "billing_records_select" on billing_records;
drop policy if exists "billing_records_insert" on billing_records;
drop policy if exists "billing_records_update" on billing_records;
drop policy if exists "billing_records_delete" on billing_records;

drop policy if exists "staff_certifications_select" on staff_certifications;
drop policy if exists "staff_certifications_insert" on staff_certifications;
drop policy if exists "staff_certifications_update" on staff_certifications;
drop policy if exists "staff_certifications_delete" on staff_certifications;

drop policy if exists "shifts_select" on shifts;
drop policy if exists "shifts_insert" on shifts;
drop policy if exists "shifts_update" on shifts;
drop policy if exists "shifts_delete" on shifts;

drop policy if exists "shift_notes_select" on shift_notes;
drop policy if exists "shift_notes_insert" on shift_notes;
drop policy if exists "shift_notes_update" on shift_notes;
drop policy if exists "shift_notes_delete" on shift_notes;

drop policy if exists "calendar_events_select" on calendar_events;
drop policy if exists "calendar_events_insert" on calendar_events;
drop policy if exists "calendar_events_update" on calendar_events;
drop policy if exists "calendar_events_delete" on calendar_events;

drop policy if exists "activities_select" on activities;
drop policy if exists "activities_insert" on activities;
drop policy if exists "activities_update" on activities;
drop policy if exists "activities_delete" on activities;

drop policy if exists "activity_attendance_select" on activity_attendance;
drop policy if exists "activity_attendance_insert" on activity_attendance;
drop policy if exists "activity_attendance_update" on activity_attendance;
drop policy if exists "activity_attendance_delete" on activity_attendance;

drop policy if exists "transportation_log_select" on transportation_log;
drop policy if exists "transportation_log_insert" on transportation_log;
drop policy if exists "transportation_log_update" on transportation_log;
drop policy if exists "transportation_log_delete" on transportation_log;

drop policy if exists "work_orders_select" on work_orders;
drop policy if exists "work_orders_insert" on work_orders;
drop policy if exists "work_orders_update" on work_orders;
drop policy if exists "work_orders_delete" on work_orders;

drop policy if exists "move_checklists_select" on move_checklists;
drop policy if exists "move_checklists_insert" on move_checklists;
drop policy if exists "move_checklists_update" on move_checklists;
drop policy if exists "move_checklists_delete" on move_checklists;

drop policy if exists "notification_settings_select" on notification_settings;
drop policy if exists "notification_settings_insert" on notification_settings;
drop policy if exists "notification_settings_update" on notification_settings;
drop policy if exists "notification_settings_delete" on notification_settings;

drop policy if exists "notification_log_select" on notification_log;
drop policy if exists "notification_log_insert" on notification_log;
drop policy if exists "notification_log_update" on notification_log;
drop policy if exists "notification_log_delete" on notification_log;

drop policy if exists "health_care_select" on health_care;
drop policy if exists "health_care_insert" on health_care;
drop policy if exists "health_care_update" on health_care;
drop policy if exists "health_care_delete" on health_care;

drop policy if exists "dietary_profiles_select" on dietary_profiles;
drop policy if exists "dietary_profiles_insert" on dietary_profiles;
drop policy if exists "dietary_profiles_update" on dietary_profiles;
drop policy if exists "dietary_profiles_delete" on dietary_profiles;

drop policy if exists "waitlist_select" on waitlist;
drop policy if exists "waitlist_insert" on waitlist;
drop policy if exists "waitlist_update" on waitlist;
drop policy if exists "waitlist_delete" on waitlist;

drop policy if exists "community_invites_select" on community_invites;
drop policy if exists "community_invites_insert" on community_invites;
drop policy if exists "community_invites_update" on community_invites;
drop policy if exists "community_invites_delete" on community_invites;

drop policy if exists "vital_signs_select" on vital_signs;
drop policy if exists "vital_signs_insert" on vital_signs;
drop policy if exists "vital_signs_update" on vital_signs;
drop policy if exists "vital_signs_delete" on vital_signs;

drop policy if exists "incidents_select" on incidents;
drop policy if exists "incidents_insert" on incidents;
drop policy if exists "incidents_update" on incidents;
drop policy if exists "incidents_delete" on incidents;

drop policy if exists "medication_administrations_select" on medication_administrations;
drop policy if exists "medication_administrations_insert" on medication_administrations;
drop policy if exists "medication_administrations_update" on medication_administrations;
drop policy if exists "medication_administrations_delete" on medication_administrations;

drop policy if exists "medication_not_given_select" on medication_not_given;
drop policy if exists "medication_not_given_insert" on medication_not_given;
drop policy if exists "medication_not_given_update" on medication_not_given;
drop policy if exists "medication_not_given_delete" on medication_not_given;

drop policy if exists "prn_administrations_select" on prn_administrations;
drop policy if exists "prn_administrations_insert" on prn_administrations;
drop policy if exists "prn_administrations_update" on prn_administrations;
drop policy if exists "prn_administrations_delete" on prn_administrations;

drop policy if exists "adl_records_select" on adl_records;
drop policy if exists "adl_records_insert" on adl_records;
drop policy if exists "adl_records_update" on adl_records;
drop policy if exists "adl_records_delete" on adl_records;

drop policy if exists "emergency_contacts_select" on emergency_contacts;
drop policy if exists "emergency_contacts_insert" on emergency_contacts;
drop policy if exists "emergency_contacts_update" on emergency_contacts;
drop policy if exists "emergency_contacts_delete" on emergency_contacts;

drop policy if exists "care_plans_select" on care_plans;
drop policy if exists "care_plans_insert" on care_plans;
drop policy if exists "care_plans_update" on care_plans;
drop policy if exists "care_plans_delete" on care_plans;

drop policy if exists "resident_documents_select" on resident_documents;
drop policy if exists "resident_documents_insert" on resident_documents;
drop policy if exists "resident_documents_update" on resident_documents;
drop policy if exists "resident_documents_delete" on resident_documents;

drop policy if exists "resident_photos_select" on resident_photos;
drop policy if exists "resident_photos_insert" on resident_photos;
drop policy if exists "resident_photos_update" on resident_photos;
drop policy if exists "resident_photos_delete" on resident_photos;

drop policy if exists "family_access_select" on family_access;
drop policy if exists "family_access_insert" on family_access;
drop policy if exists "family_access_update" on family_access;
drop policy if exists "family_access_delete" on family_access;

drop policy if exists "profiles_select" on profiles;
drop policy if exists "profiles_insert" on profiles;
drop policy if exists "profiles_update" on profiles;

drop policy if exists "community_members_select" on community_members;
drop policy if exists "community_members_insert" on community_members;
drop policy if exists "community_members_update" on community_members;
drop policy if exists "community_members_delete" on community_members;

drop policy if exists "communities_select" on communities;
drop policy if exists "communities_insert" on communities;
drop policy if exists "communities_update" on communities;
drop policy if exists "communities_delete" on communities;
*/
