-- ============================================================
-- Migration: community billing date (owner view)
-- Lets the owner record each paying community's billing date so the
-- Owner panel can show the next billing date. Informational only —
-- no automated charging. Idempotent.
-- ============================================================

alter table communities add column if not exists billing_date date;

-- ROLLBACK
-- alter table communities drop column if exists billing_date;
