-- ============================================================
-- Migration: Add missing columns found in codebase audit
-- These columns exist in production but have no migration file.
-- All statements use IF NOT EXISTS — safe to re-run.
-- ROLLBACK section at bottom
-- ============================================================

-- communities
alter table communities add column if not exists plan text default 'trial';
alter table communities add column if not exists trial_start_date timestamptz;
alter table communities add column if not exists trial_end_date timestamptz;
alter table communities add column if not exists resident_count_at_signup integer;
alter table communities add column if not exists total_beds integer;
alter table communities add column if not exists default_monthly_rate numeric(10,2);

-- residents
alter table residents add column if not exists status text default 'active';
alter table residents add column if not exists removal_reason text;
alter table residents add column if not exists move_out_date date;
alter table residents add column if not exists color text;
alter table residents add column if not exists avatar_url text;

-- profiles
alter table profiles add column if not exists profile_completed boolean default false;
alter table profiles add column if not exists onboarding_complete boolean default false;
alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists emergency_contact_name text;
alter table profiles add column if not exists emergency_contact_phone text;
alter table profiles add column if not exists hire_date date;

-- medications (PRN-specific columns)
alter table medications add column if not exists indication text;
alter table medications add column if not exists min_interval_hours integer;

-- medication_administrations
alter table medication_administrations add column if not exists admin_status text;
alter table medication_administrations add column if not exists admin_notes text;

-- ROLLBACK
-- alter table communities drop column if exists plan;
-- alter table communities drop column if exists trial_start_date;
-- alter table communities drop column if exists trial_end_date;
-- alter table communities drop column if exists resident_count_at_signup;
-- alter table communities drop column if exists total_beds;
-- alter table communities drop column if exists default_monthly_rate;
-- alter table residents drop column if exists status;
-- alter table residents drop column if exists removal_reason;
-- alter table residents drop column if exists move_out_date;
-- alter table residents drop column if exists color;
-- alter table residents drop column if exists avatar_url;
-- alter table profiles drop column if exists profile_completed;
-- alter table profiles drop column if exists onboarding_complete;
-- alter table profiles drop column if exists first_name;
-- alter table profiles drop column if exists last_name;
-- alter table profiles drop column if exists full_name;
-- alter table profiles drop column if exists phone;
-- alter table profiles drop column if exists address;
-- alter table profiles drop column if exists date_of_birth;
-- alter table profiles drop column if exists emergency_contact_name;
-- alter table profiles drop column if exists emergency_contact_phone;
-- alter table profiles drop column if exists hire_date;
-- alter table medications drop column if exists indication;
-- alter table medications drop column if exists min_interval_hours;
-- alter table medication_administrations drop column if exists admin_status;
-- alter table medication_administrations drop column if exists admin_notes;
