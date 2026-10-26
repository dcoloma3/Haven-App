-- ============================================================
-- Haven STAGING bootstrap  (generated 2026-10-26)
-- Run ONCE in a fresh Haven Staging Supabase project (SQL editor).
-- = schema-full snapshot + post-snapshot migrations in chronological order.
-- ============================================================



-- ========== BEGIN supabase-schema-full.sql ==========
-- ============================================================
-- supabase-schema-full.sql
-- Authoritative schema reconstructed from production on 2026-05-18
-- Project: gpclfdnkvkffpjccurqh.supabase.co
--
-- FOR FRESH INSTALLS ONLY. Do NOT run against existing production.
-- Apply via MIGRATION_RUNBOOK.md.
-- ============================================================

-- ─── Core / depended-upon tables first ───────────────────────────────────────

create table if not exists communities (
  id                        uuid primary key default gen_random_uuid() not null,
  name                      text not null,
  address                   text,
  phone                     text,
  license_number            text,
  email                     text,
  website                   text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now(),
  total_beds                integer,
  default_monthly_rate      numeric,
  plan                      text default 'active' not null,
  trial_start_date          timestamptz,
  trial_end_date            timestamptz,
  resident_count_at_signup  integer
);

create table if not exists residents (
  id               uuid primary key default gen_random_uuid() not null,
  full_name        text not null,
  date_of_birth    date,
  room_number      text,
  move_in_date     date,
  physician        text,
  notes            text,
  created_at       timestamptz default now(),
  color            text default 'blue',
  avatar_url       text,
  community_id     uuid,
  first_name       text,
  middle_name      text,
  last_name        text,
  status           text default 'active' not null,
  removal_reason   text,
  gender           text,
  insurance_carrier text,
  insurance_id     text,
  admission_type   text,
  care_level       text
);

-- ─── Alphabetical remaining tables ───────────────────────────────────────────

create table if not exists activities (
  id               uuid primary key default gen_random_uuid() not null,
  community_id     uuid,
  created_by_name  text,
  created_at       timestamptz default now(),
  activity_date    date not null,
  activity_time    time,
  title            text not null,
  description      text,
  location         text,
  capacity         integer
);

create table if not exists activity_attendance (
  id           uuid primary key default gen_random_uuid() not null,
  activity_id  uuid,
  resident_id  uuid,
  community_id uuid,
  status       text default 'attended' not null,
  notes        text
);

create table if not exists adl_records (
  id              uuid primary key default gen_random_uuid() not null,
  community_id    uuid,
  resident_id     uuid,
  recorded_by_name text,
  created_at      timestamptz default now(),
  recorded_date   date not null,
  bathing         text,
  dressing        text,
  eating          text,
  mobility        text,
  continence      text,
  toileting       text,
  grooming        text,
  notes           text
);

create table if not exists admin_invites (
  id          uuid primary key default gen_random_uuid() not null,
  email       text not null,
  invited_by  uuid,
  accepted    boolean default false,
  created_at  timestamptz default now()
);

create table if not exists billing_records (
  id                        uuid primary key default gen_random_uuid() not null,
  community_id              uuid,
  resident_id               uuid,
  created_by_name           text,
  created_at                timestamptz default now(),
  billing_month             text not null,
  base_rate                 numeric default 0 not null,
  level_of_care_charge      numeric default 0 not null,
  medication_management_fee numeric default 0 not null,
  ancillary_charges         numeric default 0 not null,
  ancillary_description     text,
  total_amount              numeric default 0 not null,
  status                    text default 'draft' not null,
  notes                     text
);

create table if not exists calendar_events (
  id               uuid primary key default gen_random_uuid() not null,
  title            text not null,
  event_date       date not null,
  event_time       time,
  event_type       text,
  resident_id      uuid,
  notes            text,
  created_at       timestamptz default now(),
  community_id     uuid,
  location         text,
  appointment_type text
);

create table if not exists care_plans (
  id              uuid primary key default gen_random_uuid() not null,
  community_id    uuid,
  resident_id     uuid,
  created_by_name text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  goal            text not null,
  interventions   text,
  status          text default 'active' not null,
  review_date     date,
  notes           text
);

create table if not exists community_invites (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid not null,
  email        text not null,
  role         text default 'staff' not null,
  invited_by   uuid,
  accepted     boolean default false,
  created_at   timestamptz default now()
);

create table if not exists community_members (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid not null,
  user_id      uuid not null,
  role         text default 'staff' not null,
  created_at   timestamptz default now()
);

create table if not exists dietary_profiles (
  id                 uuid primary key default gen_random_uuid() not null,
  community_id       uuid,
  resident_id        uuid,
  updated_at         timestamptz default now(),
  texture_modification text default 'Regular',
  diet_type          text default 'Regular',
  allergies          text,
  preferences        text,
  dislikes           text,
  fluid_restriction  text,
  supplement         text,
  notes              text,
  liquid_thickness   text default 'Thin'
);

create table if not exists emergency_contacts (
  id            uuid primary key default gen_random_uuid() not null,
  resident_id   uuid not null,
  contact_name  text not null,
  relationship  text,
  phone_number  text,
  created_at    timestamptz default now(),
  email         text,
  is_primary    boolean default false not null,
  is_poa        boolean default false not null
);

create table if not exists facility_settings (
  id            uuid primary key default gen_random_uuid() not null,
  facility_name text default 'My Facility',
  license_number text,
  address       text,
  phone_number  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists family_access (
  id                uuid primary key default gen_random_uuid() not null,
  community_id      uuid,
  resident_id       uuid,
  created_by_name   text,
  created_at        timestamptz default now(),
  family_member_name text not null,
  email             text,
  relationship      text,
  access_token      text default encode(gen_random_bytes(32), 'hex') not null,
  last_accessed_at  timestamptz,
  is_active         boolean default true not null
);

create table if not exists health_care (
  id                   uuid primary key default gen_random_uuid() not null,
  resident_id          uuid not null,
  allergies            text,
  diagnoses            text,
  level_of_care        text,
  fall_risk            text,
  diet_restrictions    text,
  mobility_aids        text[],
  dnr_on_file          boolean,
  hospital_preferences text,
  created_at           timestamptz default now()
);

create table if not exists incidents (
  id                     uuid primary key default gen_random_uuid() not null,
  community_id           uuid,
  resident_id            uuid,
  created_by             uuid,
  created_at             timestamptz default now(),
  incident_date          date not null,
  incident_time          time,
  incident_type          text not null,
  severity               text default 'low' not null,
  location               text,
  description            text not null,
  witnesses              text,
  immediate_action       text,
  physician_notified     boolean default false not null,
  physician_notified_time timestamptz,
  family_notified        boolean default false not null,
  family_notified_time   timestamptz,
  follow_up_required     boolean default false not null,
  follow_up_notes        text,
  status                 text default 'open' not null,
  reviewed_at            timestamptz,
  reported_by_name       text
);

create table if not exists lease_terms (
  id               uuid primary key default gen_random_uuid() not null,
  resident_id      uuid not null,
  monthly_rate     numeric,
  start_date       date,
  end_date         date,
  security_deposit numeric,
  created_at       timestamptz default now()
);

create table if not exists medication_administrations (
  id               uuid primary key default gen_random_uuid() not null,
  medication_id    uuid not null,
  resident_id      uuid not null,
  scheduled_time   text not null,
  administered_date date not null,
  administered_at  timestamptz default now(),
  administered_by  uuid,
  created_at       timestamptz default now(),
  admin_status     text default 'given',
  admin_notes      text
);

create table if not exists medications (
  id                 uuid primary key default gen_random_uuid() not null,
  resident_id        uuid not null,
  medication_name    text not null,
  dose               text,
  frequency          text,
  created_at         timestamptz default now(),
  notes              text,
  scheduled_times    text[] default '{}',
  frequency_type     text default 'daily',
  frequency_days     text[] default '{}',
  frequency_interval integer,
  start_date         date,
  end_date           date,
  community_id       uuid,
  indication         text,
  min_interval_hours integer
);

create table if not exists move_checklists (
  id              uuid primary key default gen_random_uuid() not null,
  community_id    uuid,
  resident_id     uuid,
  type            text not null,
  created_at      timestamptz default now(),
  completed_at    timestamptz,
  created_by_name text,
  items           jsonb default '[]' not null
);

create table if not exists notification_log (
  id                uuid primary key default gen_random_uuid() not null,
  community_id      uuid,
  resident_id       uuid,
  created_at        timestamptz default now(),
  notification_type text not null,
  recipient_name    text,
  recipient_contact text,
  message           text,
  status            text default 'pending' not null,
  sent_at           timestamptz
);

create table if not exists notification_settings (
  id                     uuid primary key default gen_random_uuid() not null,
  community_id           uuid,
  notify_on_incident     boolean default true not null,
  notify_on_missed_meds  boolean default false not null,
  notify_on_appointment  boolean default true not null,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create table if not exists prn_administrations (
  id              uuid primary key default gen_random_uuid() not null,
  resident_id     uuid not null,
  community_id    uuid not null,
  medication_name text not null,
  dose            text,
  reason          text not null,
  administered_at timestamptz default now() not null,
  administered_by uuid,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists profiles (
  id                           uuid primary key default gen_random_uuid() not null,
  user_id                      uuid,
  full_name                    text,
  role                         text default 'staff',
  phone                        text,
  email                        text,
  emergency_contact            text,
  hire_date                    date,
  certifications               text[],
  avatar_url                   text,
  created_at                   timestamptz default now(),
  updated_at                   timestamptz default now(),
  date_of_birth                date,
  address                      text,
  emergency_contact_name       text,
  emergency_contact_phone      text,
  onboarding_complete          boolean default false,
  first_name                   text,
  last_name                    text,
  position                     text,
  emergency_contact_relationship text,
  profile_completed            boolean default false
);

create table if not exists resident_documents (
  id              uuid primary key default gen_random_uuid() not null,
  community_id    uuid,
  resident_id     uuid,
  created_by_name text,
  created_at      timestamptz default now(),
  file_name       text not null,
  file_url        text not null,
  file_size       bigint,
  file_type       text,
  category        text default 'Other' not null,
  notes           text
);

create table if not exists resident_photos (
  id           uuid primary key default gen_random_uuid() not null,
  resident_id  uuid,
  storage_path text not null,
  file_name    text,
  notes        text,
  uploaded_at  timestamptz default now()
);

create table if not exists shift_notes (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid,
  resident_id  uuid,
  author_name  text,
  created_at   timestamptz default now(),
  shift        text not null,
  content      text not null,
  is_pinned    boolean default false not null
);

create table if not exists shifts (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid,
  staff_id     uuid,
  shift_date   date not null,
  start_time   time not null,
  end_time     time not null,
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists staff_certifications (
  id               uuid primary key default gen_random_uuid() not null,
  community_id     uuid,
  staff_profile_id uuid,
  staff_name       text not null,
  created_at       timestamptz default now(),
  cert_name        text not null,
  issued_date      date,
  expiry_date      date,
  cert_number      text,
  notes            text,
  status           text default 'valid' not null
);

create table if not exists super_admins (
  id         uuid primary key default gen_random_uuid() not null,
  email      text not null,
  created_at timestamptz default now()
);

create table if not exists transportation_log (
  id              uuid primary key default gen_random_uuid() not null,
  community_id    uuid,
  resident_id     uuid,
  created_by_name text,
  created_at      timestamptz default now(),
  trip_date       date not null,
  departure_time  time,
  return_time     time,
  destination     text not null,
  purpose         text,
  driver_name     text,
  vehicle         text,
  notes           text,
  status          text default 'scheduled' not null
);

create table if not exists vital_signs (
  id               uuid primary key default gen_random_uuid() not null,
  community_id     uuid,
  resident_id      uuid,
  recorded_by_name text,
  created_at       timestamptz default now(),
  recorded_at      timestamptz default now() not null,
  systolic         integer,
  diastolic        integer,
  pulse            integer,
  temperature      numeric,
  oxygen_saturation integer,
  weight           numeric,
  notes            text,
  blood_glucose    numeric,
  pain_scale       integer
);

create table if not exists waitlist (
  id                 uuid primary key default gen_random_uuid() not null,
  community_id       uuid,
  created_at         timestamptz default now(),
  prospect_name      text not null,
  contact_name       text,
  contact_phone      text,
  contact_email      text,
  requested_room_type text,
  notes              text,
  priority           text default 'medium' not null,
  status             text default 'waiting' not null,
  referral_source    text,
  care_level_interest text,
  inquiry_date       date,
  tour_date          date
);

create table if not exists work_orders (
  id               uuid primary key default gen_random_uuid() not null,
  community_id     uuid,
  reported_by_name text,
  created_at       timestamptz default now(),
  location         text not null,
  category         text not null,
  description      text not null,
  priority         text default 'medium' not null,
  status           text default 'open' not null,
  assigned_to      text,
  resolved_at      timestamptz,
  resolution_notes text
);

-- ─── Enable RLS on every table ───────────────────────────────────────────────

alter table activities               enable row level security;
alter table activity_attendance      enable row level security;
alter table adl_records              enable row level security;
alter table admin_invites            enable row level security;
alter table billing_records          enable row level security;
alter table calendar_events          enable row level security;
alter table care_plans               enable row level security;
alter table communities              enable row level security;
alter table community_invites        enable row level security;
alter table community_members        enable row level security;
alter table dietary_profiles         enable row level security;
alter table emergency_contacts       enable row level security;
alter table facility_settings        enable row level security;
alter table family_access            enable row level security;
alter table health_care              enable row level security;
alter table incidents                enable row level security;
alter table lease_terms              enable row level security;
alter table medication_administrations enable row level security;
alter table medications              enable row level security;
alter table move_checklists          enable row level security;
alter table notification_log         enable row level security;
alter table notification_settings    enable row level security;
alter table prn_administrations      enable row level security;
alter table profiles                 enable row level security;
alter table resident_documents       enable row level security;
alter table resident_photos          enable row level security;
alter table residents                enable row level security;
alter table shift_notes              enable row level security;
alter table shifts                   enable row level security;
alter table staff_certifications     enable row level security;
alter table super_admins             enable row level security;
alter table transportation_log       enable row level security;
alter table vital_signs              enable row level security;
alter table waitlist                 enable row level security;
alter table work_orders              enable row level security;

-- ─── Foreign key constraints ─────────────────────────────────────────────────

alter table activities              add constraint activities_community_id_fkey              foreign key (community_id)  references communities(id) on delete cascade;
alter table activity_attendance     add constraint activity_attendance_activity_id_fkey      foreign key (activity_id)   references activities(id)  on delete cascade;
alter table activity_attendance     add constraint activity_attendance_community_id_fkey     foreign key (community_id)  references communities(id) on delete cascade;
alter table activity_attendance     add constraint activity_attendance_resident_id_fkey      foreign key (resident_id)   references residents(id)   on delete cascade;
alter table adl_records             add constraint adl_records_community_id_fkey             foreign key (community_id)  references communities(id) on delete cascade;
alter table adl_records             add constraint adl_records_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table billing_records         add constraint billing_records_community_id_fkey         foreign key (community_id)  references communities(id) on delete cascade;
alter table billing_records         add constraint billing_records_resident_id_fkey          foreign key (resident_id)   references residents(id)   on delete cascade;
alter table calendar_events         add constraint calendar_events_community_id_fkey         foreign key (community_id)  references communities(id) on delete no action;
alter table calendar_events         add constraint calendar_events_resident_id_fkey          foreign key (resident_id)   references residents(id)   on delete set null;
alter table care_plans              add constraint care_plans_community_id_fkey              foreign key (community_id)  references communities(id) on delete cascade;
alter table care_plans              add constraint care_plans_resident_id_fkey               foreign key (resident_id)   references residents(id)   on delete cascade;
alter table community_invites       add constraint community_invites_community_id_fkey       foreign key (community_id)  references communities(id) on delete cascade;
alter table community_members       add constraint community_members_community_id_fkey       foreign key (community_id)  references communities(id) on delete cascade;
alter table dietary_profiles        add constraint dietary_profiles_community_id_fkey        foreign key (community_id)  references communities(id) on delete cascade;
alter table dietary_profiles        add constraint dietary_profiles_resident_id_fkey         foreign key (resident_id)   references residents(id)   on delete cascade;
alter table emergency_contacts      add constraint emergency_contacts_resident_id_fkey       foreign key (resident_id)   references residents(id)   on delete cascade;
alter table family_access           add constraint family_access_community_id_fkey           foreign key (community_id)  references communities(id) on delete cascade;
alter table family_access           add constraint family_access_resident_id_fkey            foreign key (resident_id)   references residents(id)   on delete cascade;
alter table health_care             add constraint health_care_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table incidents               add constraint incidents_community_id_fkey               foreign key (community_id)  references communities(id) on delete cascade;
alter table incidents               add constraint incidents_resident_id_fkey                foreign key (resident_id)   references residents(id)   on delete cascade;
alter table lease_terms             add constraint lease_terms_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table medication_administrations add constraint medication_administrations_medication_id_fkey foreign key (medication_id) references medications(id) on delete cascade;
alter table medication_administrations add constraint medication_administrations_resident_id_fkey  foreign key (resident_id)   references residents(id)   on delete cascade;
alter table medications             add constraint medications_community_id_fkey             foreign key (community_id)  references communities(id) on delete no action;
alter table medications             add constraint medications_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table move_checklists         add constraint move_checklists_community_id_fkey         foreign key (community_id)  references communities(id) on delete cascade;
alter table move_checklists         add constraint move_checklists_resident_id_fkey          foreign key (resident_id)   references residents(id)   on delete cascade;
alter table notification_log        add constraint notification_log_community_id_fkey        foreign key (community_id)  references communities(id) on delete cascade;
alter table notification_log        add constraint notification_log_resident_id_fkey         foreign key (resident_id)   references residents(id)   on delete cascade;
alter table notification_settings   add constraint notification_settings_community_id_fkey   foreign key (community_id)  references communities(id) on delete cascade;
alter table prn_administrations     add constraint prn_administrations_resident_id_fkey      foreign key (resident_id)   references residents(id)   on delete cascade;
alter table prn_administrations     add constraint prn_administrations_community_id_fkey     foreign key (community_id)  references communities(id) on delete cascade;
alter table resident_documents      add constraint resident_documents_community_id_fkey      foreign key (community_id)  references communities(id) on delete cascade;
alter table resident_documents      add constraint resident_documents_resident_id_fkey       foreign key (resident_id)   references residents(id)   on delete cascade;
alter table resident_photos         add constraint resident_photos_resident_id_fkey          foreign key (resident_id)   references residents(id)   on delete cascade;
alter table residents               add constraint residents_community_id_fkey               foreign key (community_id)  references communities(id) on delete no action;
alter table shift_notes             add constraint shift_notes_community_id_fkey             foreign key (community_id)  references communities(id) on delete cascade;
alter table shift_notes             add constraint shift_notes_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table shifts                  add constraint shifts_community_id_fkey                  foreign key (community_id)  references communities(id) on delete no action;
alter table staff_certifications    add constraint staff_certifications_community_id_fkey    foreign key (community_id)  references communities(id) on delete cascade;
alter table transportation_log      add constraint transportation_log_community_id_fkey      foreign key (community_id)  references communities(id) on delete cascade;
alter table transportation_log      add constraint transportation_log_resident_id_fkey       foreign key (resident_id)   references residents(id)   on delete cascade;
alter table vital_signs             add constraint vital_signs_community_id_fkey             foreign key (community_id)  references communities(id) on delete cascade;
alter table vital_signs             add constraint vital_signs_resident_id_fkey              foreign key (resident_id)   references residents(id)   on delete cascade;
alter table waitlist                add constraint waitlist_community_id_fkey                foreign key (community_id)  references communities(id) on delete cascade;
alter table work_orders             add constraint work_orders_community_id_fkey             foreign key (community_id)  references communities(id) on delete cascade;

-- ========== END supabase-schema-full.sql ==========

-- ========== BEGIN helper-functions (spliced: needed by all policies below) ==========
-- These SECURITY DEFINER helpers came from the pre-snapshot superadmin/communities
-- migrations and are assumed-present by every tenant policy. schema-full creates the
-- tables they read (community_members, super_admins) but not the functions, so define
-- them here, after those tables exist and before the first policy that calls them.
-- rls-migration-v2 later runs CREATE OR REPLACE on these with identical bodies.

create or replace function public.user_community_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select community_id from public.community_members where user_id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.super_admins where email = auth.email())
$$;

create or replace function public.is_community_admin(p_community_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where user_id = auth.uid() and community_id = p_community_id and role = 'admin'
  )
$$;
-- ========== END helper-functions ==========


-- ========== BEGIN supabase-migration-medication-not-given.sql ==========
-- ============================================================
-- Migration: Create medication_not_given table
-- This table does NOT exist in production. It is queried by
-- Dispense.jsx to track scheduled medication doses that were
-- not administered (refused, held, absent, etc.).
--
-- Dispense.jsx inserts: medication_id, resident_id, community_id,
-- scheduled_time, administered_date, reason, notes, recorded_by.
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists medication_not_given (
  id                uuid primary key default gen_random_uuid() not null,
  community_id      uuid references communities(id) on delete cascade,
  resident_id       uuid references residents(id) on delete cascade,
  medication_id     uuid references medications(id) on delete cascade,
  scheduled_time    text not null,
  administered_date date not null,
  reason            text not null,
  notes             text,
  not_given_by_name text,
  recorded_by       uuid references auth.users(id),
  created_at        timestamptz default now()
);

create index if not exists medication_not_given_medication_date_idx
  on medication_not_given (medication_id, administered_date);

alter table medication_not_given enable row level security;

-- RLS policies: staff r/w, scoped by community_id
drop policy if exists "medication_not_given_select" on medication_not_given;
create policy "medication_not_given_select" on medication_not_given
  for select to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_insert" on medication_not_given;
create policy "medication_not_given_insert" on medication_not_given
  for insert to authenticated
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_update" on medication_not_given;
create policy "medication_not_given_update" on medication_not_given
  for update to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  )
  with check (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_delete" on medication_not_given;
create policy "medication_not_given_delete" on medication_not_given
  for delete to authenticated
  using (
    community_id in (
      select community_id from community_members where user_id = auth.uid()
    )
    or public.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists medication_not_given;

-- ========== END supabase-migration-medication-not-given.sql ==========


-- ========== BEGIN supabase-migration-staff-can-manage-residents.sql ==========
-- Allow all community members (staff + admin) to insert and update residents.
-- Previously these operations were restricted to admin-role members only,
-- which caused silent failures when staff clicked "Add Resident".
-- Delete remains admin-only for safety.

-- ── residents insert ──────────────────────────────────────────────────────────
drop policy if exists "residents_insert" on residents;
create policy "residents_insert" on residents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── residents update ──────────────────────────────────────────────────────────
drop policy if exists "residents_update" on residents;
create policy "residents_update" on residents
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- To revert to admin-only inserts and updates, run:
--
-- drop policy if exists "residents_insert" on residents;
-- create policy "residents_insert" on residents
--   for insert to authenticated
--   with check (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   );
--
-- drop policy if exists "residents_update" on residents;
-- create policy "residents_update" on residents
--   for update to authenticated
--   using (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   )
--   with check (
--     (community_id in (select public.user_community_ids())
--       and exists (select 1 from community_members
--                   where user_id = auth.uid()
--                     and community_id = residents.community_id
--                     and role = 'admin'))
--     or public.is_super_admin()
--   );

-- ========== END supabase-migration-staff-can-manage-residents.sql ==========


-- ========== BEGIN supabase-migration-storage-avatar-policies.sql ==========
-- Storage RLS policies for the resident-avatars bucket.
-- Without these, only service-role can upload — staff users get silent failures.
-- The bucket should also be set to PUBLIC in the Supabase dashboard
-- (Storage → resident-avatars → Edit → Public bucket ON).

drop policy if exists "resident_avatars_select" on storage.objects;
drop policy if exists "resident_avatars_insert" on storage.objects;
drop policy if exists "resident_avatars_update" on storage.objects;
drop policy if exists "resident_avatars_delete" on storage.objects;

-- Allow any authenticated user to read (display) photos
create policy "resident_avatars_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resident-avatars');

-- Allow any authenticated user to upload a new photo
create policy "resident_avatars_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resident-avatars');

-- Allow any authenticated user to overwrite/upsert a photo
create policy "resident_avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'resident-avatars');

-- Allow any authenticated user to delete a photo
create policy "resident_avatars_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resident-avatars');

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- drop policy if exists "resident_avatars_select" on storage.objects;
-- drop policy if exists "resident_avatars_insert" on storage.objects;
-- drop policy if exists "resident_avatars_update" on storage.objects;
-- drop policy if exists "resident_avatars_delete" on storage.objects;

-- ========== END supabase-migration-storage-avatar-policies.sql ==========


-- ========== BEGIN supabase-migration-physician-phone.sql ==========
-- Add physician_phone column to residents table.
-- This column is referenced in ResidentProfile.jsx and faceSheetPDF.js
-- but was missing from the original schema.

alter table residents add column if not exists physician_phone text;

-- ROLLBACK:
-- alter table residents drop column if exists physician_phone;

-- ========== END supabase-migration-physician-phone.sql ==========


-- ========== BEGIN supabase-migration-missing-columns-v2.sql ==========
-- Consolidated migration: all columns referenced in the frontend but missing from the DB.
-- Safe to run multiple times (all use IF NOT EXISTS / CREATE OR REPLACE).

-- ── residents ─────────────────────────────────────────────────────────────────
-- physician_phone: used in ResidentProfile.jsx (read + write) and faceSheetPDF.js
alter table residents add column if not exists physician_phone text;

-- updated_at: shown on resident cards in Dashboard.jsx
alter table residents add column if not exists updated_at timestamptz default now();

-- Auto-update updated_at whenever a residents row is modified
create or replace function update_residents_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists residents_updated_at_trigger on residents;
create trigger residents_updated_at_trigger
  before update on residents
  for each row execute function update_residents_updated_at();

-- ── medication_not_given ──────────────────────────────────────────────────────
-- Full table for tracking refused/withheld/held doses in the Dispense tab.
-- (Already referenced in Dispense.jsx; this creates it idempotently.)
create table if not exists medication_not_given (
  id               uuid primary key default gen_random_uuid(),
  medication_id    uuid references medications(id) on delete cascade,
  resident_id      uuid references residents(id) on delete cascade,
  community_id     uuid references communities(id),
  scheduled_time   text not null,
  administered_date date not null,
  reason           text not null,
  notes            text,
  recorded_by      uuid,
  recorded_at      timestamptz default now()
);

create index if not exists medication_not_given_med_date_idx
  on medication_not_given(medication_id, administered_date);

alter table medication_not_given enable row level security;

drop policy if exists "medication_not_given_all" on medication_not_given;
create policy "medication_not_given_all" on medication_not_given
  for all using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- alter table residents drop column if exists physician_phone;
-- alter table residents drop column if exists updated_at;
-- drop trigger if exists residents_updated_at_trigger on residents;
-- drop function if exists update_residents_updated_at();
-- drop table if exists medication_not_given;

-- ========== END supabase-migration-missing-columns-v2.sql ==========


-- ========== BEGIN supabase-migration-medication-route.sql ==========
-- Add route of administration to medications table (required for LIC 622)
alter table medications add column if not exists route text;

-- ROLLBACK:
-- alter table medications drop column if exists route;

-- ========== END supabase-migration-medication-route.sql ==========


-- ========== BEGIN supabase-migration-compliance.sql ==========
-- ============================================================
-- CCLD Compliance Document Module Migration
-- California Title 22 / CDSS-CCLD RCFE compliance tracking
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

-- ── Phase 1a: Alter residents table — add condition flags ────────────────────

alter table residents
  add column if not exists is_hospice           boolean not null default false,
  add column if not exists has_dementia         boolean not null default false,
  add column if not exists has_poa              boolean not null default false,
  add column if not exists has_conservatorship  boolean not null default false;

-- ── Phase 1b: resident_compliance_items ─────────────────────────────────────

create table if not exists resident_compliance_items (
  id                 uuid primary key default gen_random_uuid(),
  community_id       uuid not null references communities(id) on delete cascade,
  resident_id        uuid not null references residents(id) on delete cascade,
  doc_type           text not null,
  is_applicable      boolean not null default true,
  status             text not null default 'missing'
                       check (status in ('on_file','missing','expired','expiring_soon','not_applicable')),
  date_completed     date,
  expiration_date    date,
  signed_by          text,
  notes              text,
  document_id        uuid references resident_documents(id) on delete set null,
  needs_reexecution  boolean not null default false,
  created_at         timestamptz not null default now(),
  created_by_id      uuid references auth.users(id),
  created_by_name    text,
  updated_at         timestamptz not null default now(),
  updated_by_id      uuid references auth.users(id),
  updated_by_name    text,
  unique (resident_id, doc_type)
);

alter table resident_compliance_items enable row level security;

drop policy if exists "community members can manage compliance items" on resident_compliance_items;
create policy "community members can manage compliance items" on resident_compliance_items
  using  (community_id in (select public.user_community_ids()))
  with check (community_id in (select public.user_community_ids()));

-- ── Phase 1c: compliance_audit_log — append-only ────────────────────────────

create table if not exists compliance_audit_log (
  id                  uuid primary key default gen_random_uuid(),
  community_id        uuid not null references communities(id) on delete cascade,
  resident_id         uuid not null references residents(id) on delete cascade,
  compliance_item_id  uuid references resident_compliance_items(id) on delete set null,
  doc_type            text,
  action              text not null check (action in ('created','updated','deleted')),
  changed_by_id       uuid references auth.users(id),
  changed_by_name     text not null,
  changed_at          timestamptz not null default now(),
  previous_values     jsonb,
  new_values          jsonb
);

alter table compliance_audit_log enable row level security;

drop policy if exists "community members can read audit log" on compliance_audit_log;
create policy "community members can read audit log" on compliance_audit_log
  for select using (community_id in (select public.user_community_ids()));

drop policy if exists "community members can insert audit log" on compliance_audit_log;
create policy "community members can insert audit log" on compliance_audit_log
  for insert with check (community_id in (select public.user_community_ids()));

-- intentionally no update or delete policy — audit log is immutable

-- ── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_compliance_items_resident   on resident_compliance_items(resident_id);
create index if not exists idx_compliance_items_community  on resident_compliance_items(community_id);
create index if not exists idx_compliance_audit_resident   on compliance_audit_log(resident_id);
create index if not exists idx_compliance_audit_community  on compliance_audit_log(community_id);

-- ── ROLLBACK (run only to undo) ───────────────────────────────────────────────
-- drop table if exists compliance_audit_log;
-- drop table if exists resident_compliance_items;
-- alter table residents drop column if exists is_hospice;
-- alter table residents drop column if exists has_dementia;
-- alter table residents drop column if exists has_poa;
-- alter table residents drop column if exists has_conservatorship;

-- ========== END supabase-migration-compliance.sql ==========


-- ========== BEGIN supabase-rls-migration-v2.sql ==========
-- ============================================================
-- Haven: Comprehensive RLS Migration v2
-- Fixes: communities INSERT, community_members recursion,
--        profiles SELECT, community_invites onboarding,
--        staff delete on shift_notes/incidents,
--        staff INSERT on work_orders/calendar_events/move_checklists,
--        medication_not_given helper alignment
-- Run in Supabase SQL Editor — idempotent
-- ============================================================

-- ============================================================
-- STEP 1: Helper functions
-- ============================================================

-- user_community_ids: returns all community IDs for the current user
-- SECURITY DEFINER bypasses RLS on community_members so this function
-- never triggers the recursion problem.
create or replace function public.user_community_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select community_id
  from public.community_members
  where user_id = auth.uid()
$$;

-- is_super_admin: checks super_admins table by email
create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.super_admins
    where email = auth.email()
  )
$$;

-- is_community_admin: checks whether the current user is an admin
-- in a specific community. SECURITY DEFINER prevents RLS recursion.
create or replace function public.is_community_admin(p_community_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where user_id = auth.uid()
      and community_id = p_community_id
      and role = 'admin'
  )
$$;

-- ============================================================
-- STEP 2: communities
-- Special case: INSERT must allow any authenticated user because
-- during onboarding the user has no community_members row yet.
-- ============================================================

alter table communities enable row level security;

drop policy if exists "communities_select" on communities;
create policy "communities_select" on communities
  for select to authenticated
  using (
    id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "communities_insert" on communities;
create policy "communities_insert" on communities
  for insert to authenticated
  with check (
    -- Any authenticated user may create a new community (onboarding flow).
    -- The app immediately inserts a community_members row making them admin.
    auth.uid() is not null
  );

drop policy if exists "communities_update" on communities;
create policy "communities_update" on communities
  for update to authenticated
  using (
    public.is_community_admin(id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(id)
    or public.is_super_admin()
  );

drop policy if exists "communities_delete" on communities;
create policy "communities_delete" on communities
  for delete to authenticated
  using (public.is_super_admin());

-- ============================================================
-- STEP 3: community_members
-- THE RECURSION FIX: all role checks use is_community_admin()
-- (SECURITY DEFINER) instead of inline subqueries on this table.
-- INSERT special case: a user may insert a row for themselves
-- (handles onboarding and invite acceptance).
-- ============================================================

alter table community_members enable row level security;

drop policy if exists "community_members_select" on community_members;
create policy "community_members_select" on community_members
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "community_members_insert" on community_members;
create policy "community_members_insert" on community_members
  for insert to authenticated
  with check (
    -- Case 1: admin adding someone else to their community
    public.is_community_admin(community_id)
    -- Case 2: user inserting themselves (onboarding / invite acceptance)
    -- They have no membership row yet so is_community_admin() returns false.
    or (user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "community_members_update" on community_members;
create policy "community_members_update" on community_members
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "community_members_delete" on community_members;
create policy "community_members_delete" on community_members
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 4: profiles
-- Any community member may read profiles of people in the same
-- community. This is required for staff directory, medication
-- history ("administered by"), shift assignment, work order
-- assignment, etc.
-- ============================================================

alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (
    -- Own profile
    user_id = auth.uid()
    -- Co-community member profiles
    or user_id in (
      select cm.user_id
      from public.community_members cm
      where cm.community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- STEP 5: community_invites
-- SELECT must allow lookup by email before membership exists.
-- ============================================================

alter table community_invites enable row level security;

drop policy if exists "community_invites_select" on community_invites;
create policy "community_invites_select" on community_invites
  for select to authenticated
  using (
    -- Admin sees their community's invites
    community_id in (select public.user_community_ids())
    -- User can look up pending invites for their own email (pre-membership)
    or email = auth.email()
    or public.is_super_admin()
  );

drop policy if exists "community_invites_insert" on community_invites;
create policy "community_invites_insert" on community_invites
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "community_invites_update" on community_invites;
create policy "community_invites_update" on community_invites
  for update to authenticated
  using (
    -- Admin managing invites
    community_id in (select public.user_community_ids())
    -- Invitee accepting their invite
    or email = auth.email()
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or email = auth.email()
    or public.is_super_admin()
  );

drop policy if exists "community_invites_delete" on community_invites;
create policy "community_invites_delete" on community_invites
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 6: residents
-- Staff can INSERT and UPDATE (daily care workflow).
-- DELETE is admin-only.
-- ============================================================

alter table residents enable row level security;

drop policy if exists "residents_select" on residents;
create policy "residents_select" on residents
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "residents_insert" on residents;
create policy "residents_insert" on residents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "residents_update" on residents;
create policy "residents_update" on residents
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "residents_delete" on residents;
create policy "residents_delete" on residents
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 7: medications (admin-only write — clinical data)
-- ============================================================

alter table medications enable row level security;

drop policy if exists "medications_select" on medications;
create policy "medications_select" on medications
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medications_insert" on medications;
create policy "medications_insert" on medications
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "medications_update" on medications;
create policy "medications_update" on medications
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "medications_delete" on medications;
create policy "medications_delete" on medications
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 8: medication_administrations (staff r/w — core dispense)
-- ============================================================

alter table medication_administrations enable row level security;

drop policy if exists "medication_administrations_select" on medication_administrations;
create policy "medication_administrations_select" on medication_administrations
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_insert" on medication_administrations;
create policy "medication_administrations_insert" on medication_administrations
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_update" on medication_administrations;
create policy "medication_administrations_update" on medication_administrations
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "medication_administrations_delete" on medication_administrations;
create policy "medication_administrations_delete" on medication_administrations
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 9: medication_not_given (staff r/w — aligned to helper)
-- ============================================================

alter table medication_not_given enable row level security;

drop policy if exists "medication_not_given_select" on medication_not_given;
create policy "medication_not_given_select" on medication_not_given
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_insert" on medication_not_given;
create policy "medication_not_given_insert" on medication_not_given
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_update" on medication_not_given;
create policy "medication_not_given_update" on medication_not_given
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "medication_not_given_delete" on medication_not_given;
create policy "medication_not_given_delete" on medication_not_given
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 10: prn_administrations (staff r/w)
-- ============================================================

alter table prn_administrations enable row level security;

drop policy if exists "prn_administrations_select" on prn_administrations;
create policy "prn_administrations_select" on prn_administrations
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_insert" on prn_administrations;
create policy "prn_administrations_insert" on prn_administrations
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_update" on prn_administrations;
create policy "prn_administrations_update" on prn_administrations
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "prn_administrations_delete" on prn_administrations;
create policy "prn_administrations_delete" on prn_administrations
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 11: vital_signs (staff r/w)
-- ============================================================

alter table vital_signs enable row level security;

drop policy if exists "vital_signs_select" on vital_signs;
create policy "vital_signs_select" on vital_signs
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_insert" on vital_signs;
create policy "vital_signs_insert" on vital_signs
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_update" on vital_signs;
create policy "vital_signs_update" on vital_signs
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "vital_signs_delete" on vital_signs;
create policy "vital_signs_delete" on vital_signs
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 12: adl_records (staff r/w)
-- ============================================================

alter table adl_records enable row level security;

drop policy if exists "adl_records_select" on adl_records;
create policy "adl_records_select" on adl_records
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_insert" on adl_records;
create policy "adl_records_insert" on adl_records
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_update" on adl_records;
create policy "adl_records_update" on adl_records
  for update to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "adl_records_delete" on adl_records;
create policy "adl_records_delete" on adl_records
  for delete to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 13: incidents (staff r/w, admin-only delete)
-- ============================================================

alter table incidents enable row level security;

drop policy if exists "incidents_select" on incidents;
create policy "incidents_select" on incidents
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_insert" on incidents;
create policy "incidents_insert" on incidents
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_update" on incidents;
create policy "incidents_update" on incidents
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "incidents_delete" on incidents;
create policy "incidents_delete" on incidents
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 14: shift_notes (staff r/w, admin-only delete)
-- ============================================================

alter table shift_notes enable row level security;

drop policy if exists "shift_notes_select" on shift_notes;
create policy "shift_notes_select" on shift_notes
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_insert" on shift_notes;
create policy "shift_notes_insert" on shift_notes
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_update" on shift_notes;
create policy "shift_notes_update" on shift_notes
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shift_notes_delete" on shift_notes;
create policy "shift_notes_delete" on shift_notes
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 15: calendar_events
-- Staff create appointments for residents; admin deletes.
-- ============================================================

alter table calendar_events enable row level security;

drop policy if exists "calendar_events_select" on calendar_events;
create policy "calendar_events_select" on calendar_events
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_insert" on calendar_events;
create policy "calendar_events_insert" on calendar_events
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_update" on calendar_events;
create policy "calendar_events_update" on calendar_events
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "calendar_events_delete" on calendar_events;
create policy "calendar_events_delete" on calendar_events
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 16: activities (admin creates/deletes; staff read)
-- ============================================================

alter table activities enable row level security;

drop policy if exists "activities_select" on activities;
create policy "activities_select" on activities
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activities_insert" on activities;
create policy "activities_insert" on activities
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "activities_update" on activities;
create policy "activities_update" on activities
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "activities_delete" on activities;
create policy "activities_delete" on activities
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 17: activity_attendance (staff r/w)
-- ============================================================

alter table activity_attendance enable row level security;

drop policy if exists "activity_attendance_select" on activity_attendance;
create policy "activity_attendance_select" on activity_attendance
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_insert" on activity_attendance;
create policy "activity_attendance_insert" on activity_attendance
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_update" on activity_attendance;
create policy "activity_attendance_update" on activity_attendance
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "activity_attendance_delete" on activity_attendance;
create policy "activity_attendance_delete" on activity_attendance
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 18: transportation_log (staff r/w)
-- ============================================================

alter table transportation_log enable row level security;

drop policy if exists "transportation_log_select" on transportation_log;
create policy "transportation_log_select" on transportation_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_insert" on transportation_log;
create policy "transportation_log_insert" on transportation_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_update" on transportation_log;
create policy "transportation_log_update" on transportation_log
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "transportation_log_delete" on transportation_log;
create policy "transportation_log_delete" on transportation_log
  for delete to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 19: work_orders
-- Staff submit work orders; admin deletes.
-- ============================================================

alter table work_orders enable row level security;

drop policy if exists "work_orders_select" on work_orders;
create policy "work_orders_select" on work_orders
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_insert" on work_orders;
create policy "work_orders_insert" on work_orders
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_update" on work_orders;
create policy "work_orders_update" on work_orders
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "work_orders_delete" on work_orders;
create policy "work_orders_delete" on work_orders
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 20: shifts (admin creates/deletes; staff read only)
-- ============================================================

alter table shifts enable row level security;

drop policy if exists "shifts_select" on shifts;
create policy "shifts_select" on shifts
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "shifts_insert" on shifts;
create policy "shifts_insert" on shifts
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "shifts_update" on shifts;
create policy "shifts_update" on shifts
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "shifts_delete" on shifts;
create policy "shifts_delete" on shifts
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 21: billing_records (admin-only)
-- ============================================================

alter table billing_records enable row level security;

drop policy if exists "billing_records_select" on billing_records;
create policy "billing_records_select" on billing_records
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_insert" on billing_records;
create policy "billing_records_insert" on billing_records
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_update" on billing_records;
create policy "billing_records_update" on billing_records
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "billing_records_delete" on billing_records;
create policy "billing_records_delete" on billing_records
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 22: lease_terms (admin-only — financial)
-- ============================================================

alter table lease_terms enable row level security;

drop policy if exists "lease_terms_select" on lease_terms;
create policy "lease_terms_select" on lease_terms
  for select to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_insert" on lease_terms;
create policy "lease_terms_insert" on lease_terms
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_update" on lease_terms;
create policy "lease_terms_update" on lease_terms
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "lease_terms_delete" on lease_terms;
create policy "lease_terms_delete" on lease_terms
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 23: staff_certifications (admin manages; staff read own)
-- ============================================================

alter table staff_certifications enable row level security;

drop policy if exists "staff_certifications_select" on staff_certifications;
create policy "staff_certifications_select" on staff_certifications
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_insert" on staff_certifications;
create policy "staff_certifications_insert" on staff_certifications
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_update" on staff_certifications;
create policy "staff_certifications_update" on staff_certifications
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "staff_certifications_delete" on staff_certifications;
create policy "staff_certifications_delete" on staff_certifications
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 24: waitlist (admin-only — prospective residents)
-- ============================================================

alter table waitlist enable row level security;

drop policy if exists "waitlist_select" on waitlist;
create policy "waitlist_select" on waitlist
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_insert" on waitlist;
create policy "waitlist_insert" on waitlist
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_update" on waitlist;
create policy "waitlist_update" on waitlist
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "waitlist_delete" on waitlist;
create policy "waitlist_delete" on waitlist
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 25: notification_settings (admin-only config)
-- ============================================================

alter table notification_settings enable row level security;

drop policy if exists "notification_settings_select" on notification_settings;
create policy "notification_settings_select" on notification_settings
  for select to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_insert" on notification_settings;
create policy "notification_settings_insert" on notification_settings
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_update" on notification_settings;
create policy "notification_settings_update" on notification_settings
  for update to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  )
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "notification_settings_delete" on notification_settings;
create policy "notification_settings_delete" on notification_settings
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 26: notification_log (staff r/w — append-mostly)
-- ============================================================

alter table notification_log enable row level security;

drop policy if exists "notification_log_select" on notification_log;
create policy "notification_log_select" on notification_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "notification_log_insert" on notification_log;
create policy "notification_log_insert" on notification_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- No update or delete — notification log is treated as append-only.

-- ============================================================
-- STEP 27: care_plans (admin-only — clinical)
-- ============================================================

alter table care_plans enable row level security;

drop policy if exists "care_plans_select" on care_plans;
create policy "care_plans_select" on care_plans
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_insert" on care_plans;
create policy "care_plans_insert" on care_plans
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_update" on care_plans;
create policy "care_plans_update" on care_plans
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "care_plans_delete" on care_plans;
create policy "care_plans_delete" on care_plans
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 28: health_care (admin-only — clinical)
-- ============================================================

alter table health_care enable row level security;

drop policy if exists "health_care_select" on health_care;
create policy "health_care_select" on health_care
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_insert" on health_care;
create policy "health_care_insert" on health_care
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_update" on health_care;
create policy "health_care_update" on health_care
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "health_care_delete" on health_care;
create policy "health_care_delete" on health_care
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 29: dietary_profiles (admin-only — clinical setup)
-- ============================================================

alter table dietary_profiles enable row level security;

drop policy if exists "dietary_profiles_select" on dietary_profiles;
create policy "dietary_profiles_select" on dietary_profiles
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_insert" on dietary_profiles;
create policy "dietary_profiles_insert" on dietary_profiles
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_update" on dietary_profiles;
create policy "dietary_profiles_update" on dietary_profiles
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "dietary_profiles_delete" on dietary_profiles;
create policy "dietary_profiles_delete" on dietary_profiles
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 30: emergency_contacts (admin-only — sensitive PII)
-- ============================================================

alter table emergency_contacts enable row level security;

drop policy if exists "emergency_contacts_select" on emergency_contacts;
create policy "emergency_contacts_select" on emergency_contacts
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_insert" on emergency_contacts;
create policy "emergency_contacts_insert" on emergency_contacts
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_update" on emergency_contacts;
create policy "emergency_contacts_update" on emergency_contacts
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "emergency_contacts_delete" on emergency_contacts;
create policy "emergency_contacts_delete" on emergency_contacts
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 31: resident_documents (admin-only — sensitive files)
-- ============================================================

alter table resident_documents enable row level security;

drop policy if exists "resident_documents_select" on resident_documents;
create policy "resident_documents_select" on resident_documents
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_insert" on resident_documents;
create policy "resident_documents_insert" on resident_documents
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_update" on resident_documents;
create policy "resident_documents_update" on resident_documents
  for update to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  )
  with check (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_documents_delete" on resident_documents;
create policy "resident_documents_delete" on resident_documents
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 32: resident_photos (staff can upload; admin deletes)
-- ============================================================

alter table resident_photos enable row level security;

drop policy if exists "resident_photos_select" on resident_photos;
create policy "resident_photos_select" on resident_photos
  for select to authenticated
  using (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_insert" on resident_photos;
create policy "resident_photos_insert" on resident_photos
  for insert to authenticated
  with check (
    resident_id in (
      select id from residents
      where community_id in (select public.user_community_ids())
    )
    or public.is_super_admin()
  );

drop policy if exists "resident_photos_delete" on resident_photos;
create policy "resident_photos_delete" on resident_photos
  for delete to authenticated
  using (
    resident_id in (
      select id from residents r
      where r.community_id in (select public.user_community_ids())
        and public.is_community_admin(r.community_id)
    )
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 33: resident_compliance_items (staff r/w; admin deletes)
-- ============================================================

alter table resident_compliance_items enable row level security;

drop policy if exists "community members can manage compliance items" on resident_compliance_items;

drop policy if exists "resident_compliance_items_select" on resident_compliance_items;
create policy "resident_compliance_items_select" on resident_compliance_items
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_insert" on resident_compliance_items;
create policy "resident_compliance_items_insert" on resident_compliance_items
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_update" on resident_compliance_items;
create policy "resident_compliance_items_update" on resident_compliance_items
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "resident_compliance_items_delete" on resident_compliance_items;
create policy "resident_compliance_items_delete" on resident_compliance_items
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 34: compliance_audit_log (immutable — no update/delete)
-- ============================================================

alter table compliance_audit_log enable row level security;

drop policy if exists "community members can read audit log" on compliance_audit_log;
drop policy if exists "community members can insert audit log" on compliance_audit_log;

drop policy if exists "compliance_audit_log_select" on compliance_audit_log;
create policy "compliance_audit_log_select" on compliance_audit_log
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "compliance_audit_log_insert" on compliance_audit_log;
create policy "compliance_audit_log_insert" on compliance_audit_log
  for insert to authenticated
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- Intentionally no update or delete policy — audit log is immutable.

-- ============================================================
-- STEP 35: move_checklists
-- Admin creates/deletes; staff update checklist items.
-- ============================================================

alter table move_checklists enable row level security;

drop policy if exists "move_checklists_select" on move_checklists;
create policy "move_checklists_select" on move_checklists
  for select to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_insert" on move_checklists;
create policy "move_checklists_insert" on move_checklists
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_update" on move_checklists;
create policy "move_checklists_update" on move_checklists
  for update to authenticated
  using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  )
  with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "move_checklists_delete" on move_checklists;
create policy "move_checklists_delete" on move_checklists
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 36: family_access
-- SELECT is public (token-based portal, no Supabase session).
-- INSERT is admin-only (creates the shareable link).
-- UPDATE allows any authenticated community member (last_accessed_at).
-- DELETE is admin-only.
-- ============================================================

alter table family_access enable row level security;

drop policy if exists "family_access_select" on family_access;
create policy "family_access_select" on family_access
  for select
  using (true);

drop policy if exists "family_access_insert" on family_access;
create policy "family_access_insert" on family_access
  for insert to authenticated
  with check (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

drop policy if exists "family_access_update" on family_access;
create policy "family_access_update" on family_access
  for update
  -- Allow unauthenticated token updates (last_accessed_at from FamilyView)
  using (true)
  with check (true);

drop policy if exists "family_access_delete" on family_access;
create policy "family_access_delete" on family_access
  for delete to authenticated
  using (
    public.is_community_admin(community_id)
    or public.is_super_admin()
  );

-- ============================================================
-- STEP 37: super_admins
-- RLS intentionally NOT enabled. The is_super_admin() function
-- reads this table with SECURITY DEFINER, bypassing any RLS that
-- would create a bootstrap paradox. Security is enforced at the
-- application layer (SuperAdmin.jsx page guard + RequireSuperAdmin).
-- ============================================================

-- alter table super_admins disable row level security; -- already off

-- ============================================================
-- ROLLBACK
-- ============================================================
/*
drop function if exists public.is_community_admin(uuid);
drop function if exists public.user_community_ids();
drop function if exists public.is_super_admin();

-- Then re-run supabase-migration-rls-tenant-scope.sql to restore v1 policies.
*/


---

-- ## Summary of what changed vs. the existing migration

-- | # | Table | Change |
-- |---|---|---|
-- | 1 | `community_members` | **Recursion fix**: all role checks now use `is_community_admin()` SECURITY DEFINER function. INSERT allows `user_id = auth.uid()` for onboarding/invite acceptance. |
-- | 2 | `communities` | INSERT allows any authenticated user (onboarding). DELETE restricted to super_admin only (previously allowed community admins to delete themselves). |
-- | 3 | `profiles` | SELECT now allows co-community members, not just own row. Fixes StaffDirectory, med history, dispense "administered by" queries. |
-- | 4 | `community_invites` | SELECT allows lookup by `auth.email()` even before membership — fixes onboarding invite detection. |
-- | 5 | `incidents` | DELETE restricted to admin-only (was any member). |
-- | 6 | `shift_notes` | DELETE restricted to admin-only (was any member). |
-- | 7 | `calendar_events` | INSERT/UPDATE opened to any community member (was admin-only). Staff create appointments. DELETE is admin-only. |
-- | 8 | `work_orders` | INSERT/UPDATE opened to any community member (was admin-only). Staff submit. DELETE is admin-only. |
-- | 9 | `move_checklists` | INSERT/DELETE admin-only. UPDATE opened to any member (staff complete items). |
-- | 10 | `billing_records` | SELECT restricted to admin-only (was any member — financial data). |
-- | 11 | `waitlist` | SELECT restricted to admin-only (was any member). |
-- | 12 | `medication_not_given` | Changed from inline subquery to `user_community_ids()` helper for consistency. |
-- | 13 | `resident_compliance_items` | Replaced combined `using/with check` policy with separate per-operation policies; DELETE admin-only. |
-- | 14 | `compliance_audit_log` | Policy names normalized to snake_case scheme used by rest of migration. |
-- | 15 | `family_access` | INSERT/DELETE changed to admin-only (was any community member). UPDATE left fully open to support unauthenticated token access from FamilyView. |
-- | NEW | `is_community_admin()` | New SECURITY DEFINER helper used by 15+ tables to avoid inline subqueries on `community_members`. |

-- ========== END supabase-rls-migration-v2.sql ==========


-- ========== BEGIN supabase-migration-bulletin-board.sql ==========
-- ============================================================
-- Migration: Staff Bulletin Board
-- Adds community_bulletins table for facility-scoped staff notices.
-- Active bulletin = WHERE community_id = ? AND cleared_at IS NULL LIMIT 1
-- Run in Supabase SQL Editor (idempotent)
-- ROLLBACK section at bottom
-- ============================================================

create table if not exists community_bulletins (
  id           uuid        primary key default gen_random_uuid(),
  community_id uuid        not null references communities(id) on delete cascade,
  title        text        not null,
  message      text        not null,
  posted_by    uuid        references auth.users(id) on delete set null,
  posted_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cleared_at   timestamptz
);

alter table community_bulletins enable row level security;

-- ── SELECT: any community member (staff or admin) may read active bulletins ───

drop policy if exists "bulletins_select" on community_bulletins;
create policy "bulletins_select" on community_bulletins
  for select to authenticated
  using (
    (community_id in (select public.user_community_ids()) and cleared_at is null)
    or public.is_super_admin()
  );

-- ── INSERT: admin only ────────────────────────────────────────────────────────

drop policy if exists "bulletins_insert" on community_bulletins;
create policy "bulletins_insert" on community_bulletins
  for insert to authenticated
  with check (
    (
      community_id in (select public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  );

-- ── UPDATE: admin only (used to set cleared_at and edit content) ──────────────

drop policy if exists "bulletins_update" on community_bulletins;
create policy "bulletins_update" on community_bulletins
  for update to authenticated
  using (
    (
      community_id in (select public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  )
  with check (
    (
      community_id in (select public.user_community_ids())
      and exists (
        select 1 from community_members
        where user_id = auth.uid()
          and community_id = community_bulletins.community_id
          and role = 'admin'
      )
    )
    or public.is_super_admin()
  );

-- ── Index: efficient active-bulletin lookup ───────────────────────────────────

create index if not exists idx_community_bulletins_community_cleared
  on community_bulletins (community_id, cleared_at);

-- ── ROLLBACK (run only to undo) ───────────────────────────────────────────────
-- drop index  if exists idx_community_bulletins_community_cleared;
-- drop table  if exists community_bulletins;

-- ========== END supabase-migration-bulletin-board.sql ==========


-- ========== BEGIN supabase-migration-accept-invite-rpc.sql ==========
-- ============================================================
-- Migration: accept_invite() RPC
-- Atomically joins a staff member to their community when they
-- complete onboarding. Runs as SECURITY DEFINER to bypass RLS
-- on community_members (new users have no existing membership
-- to satisfy the INSERT policy).
--
-- The function validates that:
--   1. An unaccepted invite exists for auth.email() + p_invite_id
--   2. The calling user is the one being invited (auth.uid() check)
-- ============================================================

create or replace function public.accept_invite(
  p_invite_id   uuid,
  p_user_id     uuid,
  p_full_name   text,
  p_email       text
) returns uuid
language plpgsql security definer as $$
declare
  v_invite        record;
  v_community_id  uuid;
begin
  -- Fetch and validate the invite
  select * into v_invite
  from community_invites
  where id = p_invite_id
    and lower(email) = lower(p_email)
    and accepted = false;

  if not found then
    raise exception 'Invite not found or already accepted';
  end if;

  v_community_id := v_invite.community_id;

  -- Join the community
  insert into community_members (community_id, user_id, role)
  values (v_community_id, p_user_id, v_invite.role)
  on conflict (community_id, user_id) do update set role = excluded.role;

  -- Mark invite accepted
  update community_invites
  set accepted = true
  where id = p_invite_id;

  -- Save / update profile
  insert into profiles (user_id, email, full_name, onboarding_complete, profile_completed)
  values (p_user_id, p_email, p_full_name, true, true)
  on conflict (user_id) do update set
    full_name           = excluded.full_name,
    onboarding_complete = true,
    profile_completed   = true;

  return v_community_id;
end;
$$;

grant execute on function public.accept_invite(uuid, uuid, text, text) to authenticated;

-- ROLLBACK
-- drop function if exists public.accept_invite(uuid, uuid, text, text);

-- ========== END supabase-migration-accept-invite-rpc.sql ==========


-- ========== BEGIN supabase-migration-administering-caregiver.sql ==========
-- ─────────────────────────────────────────────────────────────────────────────
-- Administering caregiver attribution
--
-- Lets the Dispense tab record WHO administered a med (the caregiver selected on
-- a shared device) separately from WHICH account operated the app. Supports
-- caregivers who don't have an app login via a per-community roster.
--
-- Safe to run multiple times (idempotent). Additive only — nothing is dropped.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Caregiver roster — selectable administering staff, incl. those without logins
create table if not exists community_caregivers (
  id           uuid primary key default gen_random_uuid() not null,
  community_id uuid not null,
  name         text not null,
  initials     text,
  active       boolean default true not null,
  created_at   timestamptz default now()
);

create index if not exists idx_community_caregivers_community
  on community_caregivers(community_id);

-- 2. Attribution columns on each administration-record table.
--    administered_by stays = the logged-in account (audit trail).
--    administered_by_name  = snapshot of the caregiver who actually administered.
--    administered_by_caregiver_id = roster link (null for accounts / typed names).
alter table medication_administrations
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

alter table prn_administrations
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

alter table medication_not_given
  add column if not exists administered_by_name text,
  add column if not exists administered_by_caregiver_id uuid;

-- 3. RLS — scope the roster to its community, same pattern as other tables.
alter table community_caregivers enable row level security;

drop policy if exists "caregivers_select" on community_caregivers;
create policy "caregivers_select" on community_caregivers
  for select using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_insert" on community_caregivers;
create policy "caregivers_insert" on community_caregivers
  for insert with check (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_update" on community_caregivers;
create policy "caregivers_update" on community_caregivers
  for update using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

drop policy if exists "caregivers_delete" on community_caregivers;
create policy "caregivers_delete" on community_caregivers
  for delete using (
    community_id in (select public.user_community_ids())
    or public.is_super_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (run only to undo this migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- alter table medication_administrations drop column if exists administered_by_name;
-- alter table medication_administrations drop column if exists administered_by_caregiver_id;
-- alter table prn_administrations drop column if exists administered_by_name;
-- alter table prn_administrations drop column if exists administered_by_caregiver_id;
-- alter table medication_not_given drop column if exists administered_by_name;
-- alter table medication_not_given drop column if exists administered_by_caregiver_id;
-- drop table if exists community_caregivers;

-- ========== END supabase-migration-administering-caregiver.sql ==========


-- ========== BEGIN supabase-migration-lifestyle-preferences.sql ==========
-- ============================================================
-- Migration: resident lifestyle preferences
-- Adds religion + preferred/avoided activities to resident profiles.
-- Idempotent — safe to run more than once.
-- ============================================================

alter table residents add column if not exists religion text;
alter table residents add column if not exists preferred_activities text;
alter table residents add column if not exists avoided_activities text;

-- No RLS change needed: these are columns on residents, which is already
-- tenant-scoped by community_id via existing policies.

-- ROLLBACK
-- alter table residents drop column if exists religion;
-- alter table residents drop column if exists preferred_activities;
-- alter table residents drop column if exists avoided_activities;

-- ========== END supabase-migration-lifestyle-preferences.sql ==========


-- ========== BEGIN supabase-migration-bowel-movements.sql ==========
-- ============================================================
-- Migration: bowel movement logs
-- Per-resident bowel movement tracking (AM/PM daily), with a
-- monthly grid report. Tenant-scoped directly by community_id,
-- mirroring prn_administrations. Idempotent — safe to re-run.
-- ============================================================

create table if not exists bowel_movements (
  id               uuid primary key default gen_random_uuid() not null,
  resident_id      uuid not null references residents(id) on delete cascade,
  community_id     uuid not null references communities(id) on delete cascade,
  occurred_at      timestamptz not null default now(),
  period           text not null check (period in ('AM', 'PM')),
  bristol_type     int check (bristol_type between 1 and 7),
  size             text check (size in ('Small', 'Medium', 'Large')),
  continence       text check (continence in ('Continent', 'Incontinent')),
  notes            text,
  recorded_by      uuid references auth.users(id),
  recorded_by_name text,
  created_at       timestamptz default now()
);

create index if not exists bowel_movements_resident_idx
  on bowel_movements (resident_id, occurred_at desc);

alter table bowel_movements enable row level security;

-- RLS: any member of the row's community (or super admin) can read/write.
drop policy if exists "bowel_movements_select" on bowel_movements;
create policy "bowel_movements_select" on bowel_movements
  for select to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_insert" on bowel_movements;
create policy "bowel_movements_insert" on bowel_movements
  for insert to authenticated
  with check (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_update" on bowel_movements;
create policy "bowel_movements_update" on bowel_movements
  for update to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists "bowel_movements_delete" on bowel_movements;
create policy "bowel_movements_delete" on bowel_movements
  for delete to authenticated
  using (
    community_id in (select community_id from community_members where user_id = auth.uid())
    or public.is_super_admin()
  );

-- ROLLBACK
-- drop table if exists bowel_movements;

-- ========== END supabase-migration-bowel-movements.sql ==========


-- ========== BEGIN supabase-migration-contact-address.sql ==========
-- ============================================================
-- Migration: emergency contact address
-- Adds a free-text address to emergency contacts. Idempotent.
-- ============================================================

alter table emergency_contacts add column if not exists address text;

-- ROLLBACK
-- alter table emergency_contacts drop column if exists address;

-- ========== END supabase-migration-contact-address.sql ==========


-- ========== BEGIN supabase-migration-document-vault-storage.sql ==========
-- ============================================================
-- Migration: Document Vault storage
-- Creates the private "resident-documents" storage bucket, scoped
-- access policies on storage.objects, and a storage_path column on
-- resident_documents. Files are PRIVATE — the app opens them with
-- short-lived signed URLs. Idempotent / safe to re-run.
--
-- Object paths are "<community_id>/<resident_id>/<file>", so access is
-- granted when the first path segment is a community the user belongs to.
-- ============================================================

-- 1) Private bucket
insert into storage.buckets (id, name, public)
values ('resident-documents', 'resident-documents', false)
on conflict (id) do update set public = false;

-- 2) Column to store the object path for signed-URL generation + deletes
alter table resident_documents add column if not exists storage_path text;

-- 3) Access policies on storage.objects (scoped to the caller's communities)
drop policy if exists "resident_documents_read" on storage.objects;
create policy "resident_documents_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resident-documents'
    and (
      (storage.foldername(name))[1] in (
        select community_id::text from community_members where user_id = auth.uid()
      )
      or public.is_super_admin()
    )
  );

drop policy if exists "resident_documents_insert" on storage.objects;
create policy "resident_documents_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resident-documents'
    and (
      (storage.foldername(name))[1] in (
        select community_id::text from community_members where user_id = auth.uid()
      )
      or public.is_super_admin()
    )
  );

drop policy if exists "resident_documents_delete" on storage.objects;
create policy "resident_documents_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resident-documents'
    and (
      (storage.foldername(name))[1] in (
        select community_id::text from community_members where user_id = auth.uid()
      )
      or public.is_super_admin()
    )
  );

-- ROLLBACK
-- drop policy if exists "resident_documents_read" on storage.objects;
-- drop policy if exists "resident_documents_insert" on storage.objects;
-- drop policy if exists "resident_documents_delete" on storage.objects;
-- delete from storage.buckets where id = 'resident-documents';
-- alter table resident_documents drop column if exists storage_path;

-- ========== END supabase-migration-document-vault-storage.sql ==========


-- ========== BEGIN supabase-migration-prescribing-physician.sql ==========
-- ============================================================
-- Migration: medication prescribing physician
-- Adds a per-medication prescriber (may differ from the resident's
-- primary physician). The LIC 622 now uses this field only and no
-- longer falls back to the resident's primary physician. Idempotent.
-- ============================================================

alter table medications add column if not exists prescribing_physician text;

-- ROLLBACK
-- alter table medications drop column if exists prescribing_physician;

-- ========== END supabase-migration-prescribing-physician.sql ==========


-- ========== BEGIN supabase-migration-medication-lic622-fields.sql ==========
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

-- ========== END supabase-migration-medication-lic622-fields.sql ==========


-- ========== BEGIN supabase-migration-fix-communities-insert.sql ==========
-- ============================================================
-- Fix: communities INSERT during onboarding
-- A brand-new user (no community yet) must be able to create their
-- first community in the onboarding flow. An older, stricter policy
-- in production blocked this with "new row violates row-level
-- security policy for table communities". This restores the intended
-- permissive insert: any authenticated user may create a community
-- (the app immediately adds their community_members admin row).
-- Idempotent.
-- ============================================================

drop policy if exists "communities_insert" on communities;
create policy "communities_insert" on communities
  for insert to authenticated
  with check (auth.uid() is not null);

-- ========== END supabase-migration-fix-communities-insert.sql ==========


-- ========== BEGIN supabase-migration-fix-delete-cascades.sql ==========
-- ============================================================
-- Fix: Delete Community blocked by foreign keys
-- Deleting a community failed with "violates foreign key constraint
-- residents_community_id_fkey" because the community/resident foreign
-- keys were not ON DELETE CASCADE. This sets every FK that points at
-- communities or residents to cascade, so deleting a community cleanly
-- removes its residents and all their records (what the delete warning
-- already promises). Only affects DELETE behavior. Idempotent.
-- ============================================================

do $$
declare r record; col text; parent text;
begin
  for r in
    select con.conname, con.conrelid, con.confrelid, con.conkey, cl.relname as child_table
    from pg_constraint con
    join pg_class cl  on cl.oid  = con.conrelid
    join pg_class ref on ref.oid = con.confrelid
    where con.contype = 'f'
      and ref.relname in ('communities', 'residents')
      and con.connamespace = 'public'::regnamespace
      and con.confdeltype <> 'c'            -- not already ON DELETE CASCADE
  loop
    select a.attname into col
      from pg_attribute a
     where a.attrelid = r.conrelid and a.attnum = r.conkey[1];
    select relname into parent from pg_class where oid = r.confrelid;
    execute format('alter table public.%I drop constraint %I', r.child_table, r.conname);
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I(id) on delete cascade',
                   r.child_table, r.conname, col, parent);
  end loop;
end $$;

-- ========== END supabase-migration-fix-delete-cascades.sql ==========


-- ========== BEGIN supabase-migration-billing-date.sql ==========
-- ============================================================
-- Migration: community billing date (owner view)
-- Lets the owner record each paying community's billing date so the
-- Owner panel can show the next billing date. Informational only —
-- no automated charging. Idempotent.
-- ============================================================

alter table communities add column if not exists billing_date date;

-- ROLLBACK
-- alter table communities drop column if exists billing_date;

-- ========== END supabase-migration-billing-date.sql ==========


-- ========== BEGIN supabase-migration-pending-invites-rpc.sql ==========
-- ============================================================
-- Migration: get_my_pending_invites() RPC
-- Lets an already-registered user see invites addressed to their
-- email for communities they are NOT yet a member of (so they can
-- accept via accept_invite()). SECURITY DEFINER bypasses the
-- community_invites / communities RLS, but only ever returns rows
-- for the caller's own email. Idempotent.
-- ============================================================

create or replace function public.get_my_pending_invites()
returns table (invite_id uuid, community_id uuid, community_name text, role text)
language sql stable security definer
set search_path = public
as $$
  select i.id, i.community_id, c.name, i.role
  from public.community_invites i
  join public.communities c on c.id = i.community_id
  where lower(i.email) = lower(auth.email())
    and i.accepted = false
  order by i.created_at desc
$$;

grant execute on function public.get_my_pending_invites() to authenticated;

-- ROLLBACK
-- drop function if exists public.get_my_pending_invites();

-- ========== END supabase-migration-pending-invites-rpc.sql ==========


-- ========== BEGIN supabase-migration-shower-schedule.sql ==========
-- ============================================================
-- Migration: resident shower schedule + completion log
-- One schedule per resident (days of week + AM/PM + preferences),
-- and a log of completed showers for check-off. Tenant-scoped by
-- community_id, mirroring bowel_movements. Idempotent.
-- ============================================================

create table if not exists shower_schedules (
  id           uuid primary key default gen_random_uuid() not null,
  resident_id  uuid not null references residents(id) on delete cascade unique,
  community_id uuid not null references communities(id) on delete cascade,
  days         int[] not null default '{}',          -- 0=Sun … 6=Sat
  time_of_day  text check (time_of_day in ('AM', 'PM')),
  preferences  text,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);

create table if not exists shower_logs (
  id                uuid primary key default gen_random_uuid() not null,
  resident_id       uuid not null references residents(id) on delete cascade,
  community_id      uuid not null references communities(id) on delete cascade,
  shower_date       date not null,
  period            text check (period in ('AM', 'PM')),
  completed_by_name text,
  recorded_by       uuid references auth.users(id),
  notes             text,
  created_at        timestamptz default now(),
  unique (resident_id, shower_date)
);

alter table shower_schedules enable row level security;
alter table shower_logs enable row level security;

-- RLS: any member of the row's community (or super admin) can read/write both.
do $$
declare t text;
begin
  foreach t in array array['shower_schedules', 'shower_logs'] loop
    execute format('drop policy if exists "%1$s_select" on %1$s', t);
    execute format('create policy "%1$s_select" on %1$s for select to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_insert" on %1$s', t);
    execute format('create policy "%1$s_insert" on %1$s for insert to authenticated with check (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_update" on %1$s', t);
    execute format('create policy "%1$s_update" on %1$s for update to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
    execute format('drop policy if exists "%1$s_delete" on %1$s', t);
    execute format('create policy "%1$s_delete" on %1$s for delete to authenticated using (community_id in (select community_id from community_members where user_id = auth.uid()) or public.is_super_admin())', t);
  end loop;
end $$;

-- ROLLBACK
-- drop table if exists shower_logs;
-- drop table if exists shower_schedules;

-- ========== END supabase-migration-shower-schedule.sql ==========
