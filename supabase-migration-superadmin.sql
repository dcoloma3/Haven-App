-- Super admins table (identified by email so no user_id needed upfront)
create table if not exists super_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

-- Seed the app owner as super admin
insert into super_admins (email) values ('domcoloma@gmail.com')
  on conflict (email) do nothing;

-- Admin invites (not tied to a community — for onboarding new admin clients)
create table if not exists admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid references auth.users(id),
  accepted boolean default false,
  created_at timestamptz default now()
);

-- Disable RLS on these tables for now
alter table super_admins disable row level security;
alter table admin_invites disable row level security;
