-- Add separate name columns to residents
alter table residents add column if not exists first_name text;
alter table residents add column if not exists middle_name text;
alter table residents add column if not exists last_name  text;

-- Backfill from existing full_name:
--   first word  → first_name
--   last word   → last_name  (same as first if only one word)
--   everything between → middle_name
update residents
set
  first_name  = split_part(trim(full_name), ' ', 1),
  last_name   = case
    when array_length(string_to_array(trim(full_name), ' '), 1) > 1
    then (string_to_array(trim(full_name), ' '))[array_length(string_to_array(trim(full_name), ' '), 1)]
    else null
  end,
  middle_name = case
    when array_length(string_to_array(trim(full_name), ' '), 1) > 2
    then array_to_string(
      (string_to_array(trim(full_name), ' '))[2 : array_length(string_to_array(trim(full_name), ' '), 1) - 1],
      ' '
    )
    else null
  end
where first_name is null;
