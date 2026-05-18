-- ============================================================
-- Migration: Add ON DELETE CASCADE to FK columns
-- These FKs may already exist without cascade; this migration
-- drops and recreates them with cascade to prevent orphan rows.
-- ROLLBACK section at bottom
-- ============================================================

-- ── family_access.resident_id → residents(id) ──
alter table family_access
  drop constraint if exists family_access_resident_id_fkey;
alter table family_access
  add constraint family_access_resident_id_fkey
  foreign key (resident_id) references residents(id) on delete cascade;

-- ── family_access.community_id → communities(id) ──
alter table family_access
  drop constraint if exists family_access_community_id_fkey;
alter table family_access
  add constraint family_access_community_id_fkey
  foreign key (community_id) references communities(id) on delete cascade;

-- ── notification_settings.community_id → communities(id) ──
alter table notification_settings
  drop constraint if exists notification_settings_community_id_fkey;
alter table notification_settings
  add constraint notification_settings_community_id_fkey
  foreign key (community_id) references communities(id) on delete cascade;

-- ── community_invites.community_id → communities(id) ──
alter table community_invites
  drop constraint if exists community_invites_community_id_fkey;
alter table community_invites
  add constraint community_invites_community_id_fkey
  foreign key (community_id) references communities(id) on delete cascade;

-- ROLLBACK
-- To undo: drop the cascade constraints and recreate without cascade
/*
alter table family_access
  drop constraint if exists family_access_resident_id_fkey;
alter table family_access
  add constraint family_access_resident_id_fkey
  foreign key (resident_id) references residents(id);

alter table family_access
  drop constraint if exists family_access_community_id_fkey;
alter table family_access
  add constraint family_access_community_id_fkey
  foreign key (community_id) references communities(id);

alter table notification_settings
  drop constraint if exists notification_settings_community_id_fkey;
alter table notification_settings
  add constraint notification_settings_community_id_fkey
  foreign key (community_id) references communities(id);

alter table community_invites
  drop constraint if exists community_invites_community_id_fkey;
alter table community_invites
  add constraint community_invites_community_id_fkey
  foreign key (community_id) references communities(id);
*/
