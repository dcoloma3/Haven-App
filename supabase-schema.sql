-- Residents
create table residents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date,
  room_number text,
  move_in_date date,
  physician text,
  notes text,
  created_at timestamptz default now()
);

-- Medications
create table medications (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  medication_name text not null,
  dose text,
  frequency text,
  created_at timestamptz default now()
);

-- Emergency contacts
create table emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  contact_name text not null,
  relationship text,
  phone_number text,
  created_at timestamptz default now()
);

-- Lease terms
create table lease_terms (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  monthly_rate numeric(10,2),
  start_date date,
  end_date date,
  security_deposit numeric(10,2),
  created_at timestamptz default now()
);

-- Enable Row Level Security on all tables
alter table residents enable row level security;
alter table medications enable row level security;
alter table emergency_contacts enable row level security;
alter table lease_terms enable row level security;

-- Only logged-in staff can read/write data
create policy "staff access" on residents for all to authenticated using (true) with check (true);
create policy "staff access" on medications for all to authenticated using (true) with check (true);
create policy "staff access" on emergency_contacts for all to authenticated using (true) with check (true);
create policy "staff access" on lease_terms for all to authenticated using (true) with check (true);
