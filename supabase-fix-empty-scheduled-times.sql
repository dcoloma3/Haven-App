-- Fix: medications saved without scheduled_times don't appear in Dispense tab.
-- The Dispense tab filters: m.scheduled_times?.length > 0
-- Medications with empty or null scheduled_times are invisible.
--
-- STEP 1: Run this SELECT first to review affected medications.
select
  m.id,
  m.medication_name,
  m.frequency_type,
  m.scheduled_times,
  r.first_name || ' ' || r.last_name as resident_name,
  c.name as community
from medications m
join residents r on r.id = m.resident_id
join communities c on c.id = m.community_id
where (m.scheduled_times is null or array_length(m.scheduled_times, 1) is null)
  and m.frequency_type != 'prn'
order by c.name, r.last_name;

-- STEP 2: After reviewing the list above, run this UPDATE to assign a default
-- time of 08:00 AM so they appear in Dispense. Staff can edit each med
-- afterward to set the correct time(s).
--
-- !! Only run this after reviewing Step 1 !!
update medications
set scheduled_times = ARRAY['08:00']
where (scheduled_times is null or array_length(scheduled_times, 1) is null)
  and frequency_type != 'prn';
