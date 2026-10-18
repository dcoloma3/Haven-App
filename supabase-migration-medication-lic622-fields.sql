-- ============================================================
-- Migration: medication LIC 622 fields
-- Adds the pharmacy/prescription fields the LIC 622 (Centrally
-- Stored Medication record) asks for per medication. Idempotent.
-- ============================================================

alter table medications add column if not exists prescription_number text;
alter table medications add column if not exists pharmacy text;
alter table medications add column if not exists refills text;
alter table medications add column if not exists quantity text;
alter table medications add column if not exists date_filled date;
alter table medications add column if not exists expiration_date date;

-- ROLLBACK
-- alter table medications drop column if exists prescription_number;
-- alter table medications drop column if exists pharmacy;
-- alter table medications drop column if exists refills;
-- alter table medications drop column if exists quantity;
-- alter table medications drop column if exists date_filled;
-- alter table medications drop column if exists expiration_date;
