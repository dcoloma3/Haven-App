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
