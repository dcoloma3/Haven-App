-- Add physician_phone column to residents table.
-- This column is referenced in ResidentProfile.jsx and faceSheetPDF.js
-- but was missing from the original schema.

alter table residents add column if not exists physician_phone text;

-- ROLLBACK:
-- alter table residents drop column if exists physician_phone;
