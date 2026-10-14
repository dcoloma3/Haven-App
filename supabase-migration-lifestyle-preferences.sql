-- ============================================================
-- Migration: resident lifestyle preferences
-- Adds religion + preferred/avoided activities to resident profiles.
-- Idempotent — safe to run more than once.
-- ============================================================

alter table residents add column if not exists religion text;
alter table residents add column if not exists preferred_activities text;
alter table residents add column if not exists avoided_activities text;

-- No RLS change needed: these are columns on residents, which is already
-- tenant-scoped by community_id via existing policies.

-- ROLLBACK
-- alter table residents drop column if exists religion;
-- alter table residents drop column if exists preferred_activities;
-- alter table residents drop column if exists avoided_activities;
