# The Haven — Supabase Reference

> Database schema, table descriptions, and RLS policy notes.
> Update this file whenever a new table or migration is added.

---

## Connection

```
URL:  stored in VITE_SUPABASE_URL (.env)
Key:  stored in VITE_SUPABASE_ANON_KEY (.env)
```

Client is initialized in `src/lib/supabase.js`.

---

## Core Tables

### `communities`
Represents each senior living facility.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | text | Community display name |
| created_at | timestamptz | |

---

### `community_members`
Links users to communities with a role.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | References communities(id) |
| user_id | uuid | References auth.users(id) |
| role | text | `admin`, `staff`, or `family` |
| created_at | timestamptz | |

**RLS:** Users can only see their own memberships.

---

### `superadmins`
Tracks which users have owner/super admin access.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | References auth.users(id) |
| created_at | timestamptz | |

---

### `residents`
Core resident records.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | References communities(id) |
| first_name | text | |
| last_name | text | |
| room_number | text | |
| date_of_birth | date | |
| admission_date | date | |
| status | text | `active`, `discharged`, etc. |
| photo_url | text | Supabase Storage URL |
| created_at | timestamptz | |

**RLS:** Filter by `community_id` on every query.

---

### `medications`
Medications prescribed to residents.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | |
| resident_id | uuid | References residents(id) |
| name | text | Medication name |
| dosage | text | e.g. "10mg" |
| frequency | text | e.g. "Twice daily" |
| prescriber | text | |
| start_date | date | |
| end_date | date | Null = ongoing |
| notes | text | |
| created_at | timestamptz | |

---

### `dispense_log`
Records each medication administration event.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | |
| medication_id | uuid | References medications(id) |
| resident_id | uuid | |
| administered_by | uuid | user_id of staff |
| administered_at | timestamptz | |
| notes | text | |

---

### `staff_certifications`
Tracks staff licenses and certifications.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | |
| staff_profile_id | uuid | Optional link to a profile |
| staff_name | text | Display name |
| cert_name | text | e.g. "CPR", "CNA License" |
| issued_date | date | |
| expiry_date | date | Used to compute status |
| cert_number | text | License or cert number |
| notes | text | |
| status | text | `valid` (computed on frontend) |

**Status logic (frontend):**
- `expired` — expiry_date is in the past
- `expiring_soon` — expiry_date is within 60 days
- `valid` — everything else

---

### `incidents`
Incident reports for residents or facility events.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | |
| resident_id | uuid | Optional — may be facility-level |
| incident_type | text | |
| description | text | |
| reported_by | uuid | user_id |
| occurred_at | timestamptz | |
| created_at | timestamptz | |

---

### `maintenance_requests`
Facility maintenance tracking.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| community_id | uuid | |
| title | text | Short description |
| description | text | |
| location | text | Room or area |
| priority | text | `low`, `medium`, `high` |
| status | text | `open`, `in_progress`, `resolved` |
| submitted_by | uuid | |
| created_at | timestamptz | |
| resolved_at | timestamptz | |

---

## Migration Files

SQL migration files live in the project root:

| File | Description |
|---|---|
| `supabase-schema.sql` | Initial schema |
| `supabase-migration-communities.sql` | Multi-community support |
| `supabase-migration-add-name-columns.sql` | Name column additions |
| `supabase-migration-dispense.sql` | Dispense log table |
| `supabase-migration-frequency.sql` | Medication frequency |
| `supabase-migration-superadmin.sql` | Super admin table |

To apply a migration: paste into the Supabase SQL editor and run.

---

## RLS Policy Pattern

Every table follows this pattern:

```sql
alter table table_name enable row level security;

create policy "community members can access"
  on table_name for all
  using (
    community_id in (
      select community_id from community_members
      where user_id = auth.uid()
    )
  );
```

Super admin bypass (where needed):
```sql
using (
  community_id in (select community_id from community_members where user_id = auth.uid())
  or auth.uid() in (select user_id from superadmins)
);
```

---

## Common Query Patterns

### Always filter by community_id
```js
const { data } = await supabase
  .from('residents')
  .select('*')
  .eq('community_id', communityId)
```

### Insert with community_id
```js
await supabase.from('residents').insert({ community_id: communityId, ...fields })
```

### Update by id
```js
await supabase.from('residents').update(fields).eq('id', residentId)
```

### Soft delete (preferred) vs hard delete
- Prefer updating a `status` field to `archived` or `discharged` over hard deleting
- Hard deletes are fine for things like certifications or notes
