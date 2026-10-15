-- ============================================================
-- Migration: emergency contact address
-- Adds a free-text address to emergency contacts. Idempotent.
-- ============================================================

alter table emergency_contacts add column if not exists address text;

-- ROLLBACK
-- alter table emergency_contacts drop column if exists address;
