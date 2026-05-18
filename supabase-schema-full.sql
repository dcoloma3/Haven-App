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
