-- Add route of administration to medications table (required for LIC 622)
alter table medications add column if not exists route text;

-- ROLLBACK:
-- alter table medications drop column if exists route;
