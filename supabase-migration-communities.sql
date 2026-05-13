-- Communities (replaces facility_settings for multi-tenant support)
create table if not exists communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  license_number text,
  email text,
  website text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Links users to communities with a role
create table if not exists community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now(),
  unique(community_id, user_id)
);

-- Pending email invites created by admins
create table if not exists community_invites (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  email text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  invited_by uuid references auth.users(id),
  accepted boolean default false,
  created_at timestamptz default now()
);

-- Add community scoping to residents and medications
alter table residents add column if not exists community_id uuid references communities(id);
alter table medications add column if not exists community_id uuid references communities(id);

-- Additional employee profile fields
alter table profiles add column if not exists date_of_birth date;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists emergency_contact_name text;
alter table profiles add column if not exists emergency_contact_phone text;
alter table profiles add column if not exists onboarding_complete boolean default false;
