-- Run in Supabase SQL editor

-- 1. Add care_level to residents
alter table residents add column if not exists care_level text;

-- 2. Add prospect pipeline fields to waitlist
alter table waitlist add column if not exists referral_source text;
alter table waitlist add column if not exists care_level_interest text;
alter table waitlist add column if not exists inquiry_date date;
alter table waitlist add column if not exists tour_date date;
