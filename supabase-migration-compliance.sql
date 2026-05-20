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
  using  (community_id = any(public.user_community_ids()))
  with check (community_id = any(public.user_community_ids()));

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
  for select using (community_id = any(public.user_community_ids()));

drop policy if exists "community members can insert audit log" on compliance_audit_log;
create policy "community members can insert audit log" on compliance_audit_log
  for insert with check (community_id = any(public.user_community_ids()));

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
