-- ============================================================
-- Migration: Add missing columns found in codebase audit
-- All statements use IF NOT EXISTS — safe to re-run.
--
-- NOTE: As of 2026-05-18 production schema audit, most columns
-- from the original audit already exist in the database. The
-- redundant ALTER statements have been removed. Only columns
-- confirmed missing from production remain below.
--
-- Columns confirmed ALREADY EXIST in production (removed):
--   communities: plan, trial_start_date, trial_end_date,
--     resident_count_at_signup, total_beds, default_monthly_rate
--   residents: status, removal_reason, color, avatar_url
--   medications: indication, min_interval_hours
--   medication_administrations: admin_status, admin_notes
--   profiles: profile_completed, onboarding_complete, first_name,
--     last_name, full_name, phone, address, date_of_birth,
--     emergency_contact_name, emergency_contact_phone, hire_date
--
-- ROLLBACK section at bottom
-- ============================================================

-- residents: move_out_date is referenced in code but absent from production schema
alter table residents add column if not exists move_out_date date;

-- All other columns from the original audit already exist in production.
-- No further ALTER statements needed.

-- ROLLBACK
-- alter table residents drop column if exists move_out_date;
