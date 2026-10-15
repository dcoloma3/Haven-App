-- ============================================================
-- Migration: medication prescribing physician
-- Adds a per-medication prescriber (may differ from the resident's
-- primary physician). The LIC 622 now uses this field only and no
-- longer falls back to the resident's primary physician. Idempotent.
-- ============================================================

alter table medications add column if not exists prescribing_physician text;

-- ROLLBACK
-- alter table medications drop column if exists prescribing_physician;
