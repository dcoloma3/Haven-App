-- ============================================================
-- RLS Smoke Test — Run as a regular community user first,
-- then as a super admin. Compare counts.
-- ============================================================

-- 1. My residents (should only show your community's residents)
select count(*) as my_residents from residents;

-- 2. Community breakdown (should show only 1 community_id row when run as regular user)
select community_id, count(*) as resident_count
from residents group by community_id;

-- 3. Vital signs count (scoped to my residents)
select count(*) from vital_signs;

-- 4. Medication administrations (scoped to my community)
select count(*) from medication_administrations;

-- 5. Profile rows (should be 1 for regular user, all for super admin)
select count(*) from profiles;

-- 6. Confirm helper functions are installed
select auth.is_super_admin() as am_i_super_admin;
select count(*) as my_community_count from auth.user_community_ids();

-- 7. List all installed policies
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
