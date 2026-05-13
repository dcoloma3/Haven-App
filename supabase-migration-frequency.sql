-- Structured frequency / recurrence fields for medications

-- One of: 'one_time' | 'daily' | 'specific_days' | 'every_x_days'
-- Defaults to 'daily' so existing medications keep working as before.
alter table medications
  add column if not exists frequency_type text default 'daily';

-- Days of the week for 'specific_days', e.g. {'monday','wednesday','friday'}
alter table medications
  add column if not exists frequency_days text[] default '{}';

-- Interval for 'every_x_days', e.g. 3 means every 3 days
alter table medications
  add column if not exists frequency_interval integer;

-- When the medication course starts (required for 'one_time' and 'every_x_days')
alter table medications
  add column if not exists start_date date;

-- When the medication course ends (optional for all types)
alter table medications
  add column if not exists end_date date;
