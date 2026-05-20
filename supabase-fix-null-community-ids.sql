-- ============================================================
-- Fix: medications (and other tables) with null community_id
-- Root cause: medications saved during early onboarding when
-- the communityId context was momentarily null. The Dispense
-- tab filters with .eq('community_id', communityId) so these
-- medications are completely invisible.
--
-- HOW TO RUN:
--   1. Run SECTION 1 in Supabase SQL Editor → review the output
--   2. Run SECTION 2 to apply the fix
--   3. Re-run SECTION 1 to confirm 0 rows remain
--   4. Run SECTION 3 as a baseline check on other tables
-- ============================================================


-- ============================================================
-- SECTION 1 — Diagnostic: find affected medications
-- ============================================================

-- Summary: count per community
select
  c.name as community,
  count(*) as medications_with_null_community_id
from medications m
join residents r on r.id = m.resident_id
join communities c on c.id = r.community_id
where m.community_id is null
group by c.id, c.name
order by c.name;

-- Detail: which specific medications are affected?
select
  m.id,
  m.medication_name,
  m.frequency_type,
  m.scheduled_times,
  r.first_name || ' ' || r.last_name as resident_name,
  c.name as community
from medications m
join residents r on r.id = m.resident_id
join communities c on c.id = r.community_id
where m.community_id is null
order by c.name, r.last_name, m.medication_name;


-- ============================================================
-- SECTION 2 — Fix: backfill community_id from resident's row
-- Safe: residents.community_id is always set (required on insert)
-- Affects ALL communities in one shot.
-- !! Run SECTION 1 first to review what will be updated !!
-- ============================================================

update medications m
set community_id = r.community_id
from residents r
where m.resident_id = r.id
  and m.community_id is null;

-- Verify: re-run to confirm 0 rows remain
select count(*) as remaining_null_community_id_medications
from medications
where community_id is null;


-- ============================================================
-- SECTION 3 — Baseline check on other key tables
-- These should all return 0. Informational only.
-- ============================================================

select 'medications'       as table_name, count(*) as null_community_id_count from medications       where community_id is null
union all
select 'shift_notes',                     count(*) from shift_notes            where community_id is null
union all
select 'incidents',                       count(*) from incidents              where community_id is null
union all
select 'work_orders',                     count(*) from work_orders            where community_id is null
union all
select 'transportation_log',              count(*) from transportation_log     where community_id is null
union all
select 'billing_records',                 count(*) from billing_records        where community_id is null
union all
select 'prn_administrations',             count(*) from prn_administrations    where community_id is null
union all
select 'medication_not_given',            count(*) from medication_not_given   where community_id is null
order by table_name;
