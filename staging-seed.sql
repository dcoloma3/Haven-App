-- ============================================================
-- Haven STAGING seed data
-- Run in the Haven STAGING Supabase SQL editor AFTER staging-bootstrap.sql.
-- Creates one test community ("Sunnybrook Test Home") with 3 residents,
-- their medications, emergency contacts, and health records.
--
-- PART A (seed) runs as the SQL editor (service role) and bypasses RLS,
-- so it works on its own. But to SEE this data in the app you must be a
-- member of the community -> do PART B after creating your staging login.
--
-- Idempotent: fixed UUIDs + ON CONFLICT DO NOTHING, safe to re-run.
-- ============================================================

-- ---------- PART A: test community + residents + meds ----------

-- Community
insert into communities (id, name, address, phone, email, plan, total_beds, default_monthly_rate)
values ('5ee50000-0000-4000-8000-000000000001',
        'Sunnybrook Test Home', '123 Test Lane, Sacramento, CA 95814',
        '(916) 555-0100', 'test@sunnybrook.example', 'active', 6, 4500)
on conflict (id) do nothing;

-- Residents
insert into residents (id, community_id, full_name, first_name, last_name, date_of_birth, room_number, move_in_date, physician, status, color, gender, care_level)
values
 ('5ee50000-0000-4000-8000-000000000101','5ee50000-0000-4000-8000-000000000001','Margaret Chen','Margaret','Chen','1938-04-12','1','2025-01-15','Dr. Patel','active','blue','female','Assisted Living'),
 ('5ee50000-0000-4000-8000-000000000102','5ee50000-0000-4000-8000-000000000001','Robert Johnson','Robert','Johnson','1942-11-03','2','2025-03-01','Dr. Nguyen','active','green','male','Memory Care'),
 ('5ee50000-0000-4000-8000-000000000103','5ee50000-0000-4000-8000-000000000001','Dorothy Alvarez','Dorothy','Alvarez','1945-07-22','3','2025-06-10','Dr. Patel','active','purple','female','Assisted Living')
on conflict (id) do nothing;

-- Medications (routine + one PRN)
insert into medications (id, resident_id, community_id, medication_name, dose, frequency, frequency_type, scheduled_times, indication)
values
 ('5ee50000-0000-4000-8000-000000000201','5ee50000-0000-4000-8000-000000000101','5ee50000-0000-4000-8000-000000000001','Lisinopril','10 mg','Once daily','daily','{08:00}',null),
 ('5ee50000-0000-4000-8000-000000000202','5ee50000-0000-4000-8000-000000000101','5ee50000-0000-4000-8000-000000000001','Metformin','500 mg','Twice daily','daily','{08:00,18:00}',null),
 ('5ee50000-0000-4000-8000-000000000203','5ee50000-0000-4000-8000-000000000102','5ee50000-0000-4000-8000-000000000001','Donepezil','5 mg','Once daily at bedtime','daily','{21:00}',null),
 ('5ee50000-0000-4000-8000-000000000204','5ee50000-0000-4000-8000-000000000103','5ee50000-0000-4000-8000-000000000001','Acetaminophen','500 mg','As needed for pain','prn','{}','Pain')
on conflict (id) do nothing;

-- Emergency contacts
insert into emergency_contacts (id, resident_id, contact_name, relationship, phone_number, email, is_primary)
values
 ('5ee50000-0000-4000-8000-000000000301','5ee50000-0000-4000-8000-000000000101','Lisa Chen','Daughter','(916) 555-0201','lisa.chen@example.com',true),
 ('5ee50000-0000-4000-8000-000000000302','5ee50000-0000-4000-8000-000000000102','Mark Johnson','Son','(916) 555-0202','mark.j@example.com',true),
 ('5ee50000-0000-4000-8000-000000000303','5ee50000-0000-4000-8000-000000000103','Carlos Alvarez','Son','(916) 555-0203','carlos.a@example.com',true)
on conflict (id) do nothing;

-- Health records
insert into health_care (id, resident_id, allergies, diagnoses, level_of_care, fall_risk, diet_restrictions, dnr_on_file)
values
 ('5ee50000-0000-4000-8000-000000000401','5ee50000-0000-4000-8000-000000000101','Penicillin','Hypertension, Type 2 Diabetes','Assisted Living','Low','Low sodium',false),
 ('5ee50000-0000-4000-8000-000000000402','5ee50000-0000-4000-8000-000000000102','None known','Alzheimer''s disease','Memory Care','High','Regular',true),
 ('5ee50000-0000-4000-8000-000000000403','5ee50000-0000-4000-8000-000000000103','Sulfa drugs','Osteoarthritis','Assisted Living','Moderate','Regular',false)
on conflict (id) do nothing;


-- ============================================================
-- PART B: attach YOUR staging login as admin of the test community
-- ------------------------------------------------------------
-- 1. First create your staging login:
--    Supabase Dashboard (Haven Staging) -> Authentication -> Users
--    -> "Add user" -> enter your email + a password -> enable "Auto Confirm User".
-- 2. Replace the email below with that same email.
-- 3. Run this block (or the whole file again -- Part A is idempotent).
-- ============================================================

do $$
declare
  v_email text := 'CHANGE_ME@example.com';   -- <<< your staging login email
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);
  if v_uid is null then
    raise notice 'No auth user found for %. Create the user in Authentication -> Users first.', v_email;
    return;
  end if;

  -- make them a super admin (owner panel access) + a profile
  insert into super_admins (email) values (v_email) on conflict do nothing;

  insert into profiles (user_id, email, role, full_name, onboarding_complete, profile_completed)
  values (v_uid, v_email, 'admin', 'Staging Admin', true, true)
  on conflict do nothing;

  -- admin member of the test community
  insert into community_members (community_id, user_id, role)
  values ('5ee50000-0000-4000-8000-000000000001', v_uid, 'admin')
  on conflict do nothing;

  raise notice 'Attached % as admin of Sunnybrook Test Home.', v_email;
end $$;
