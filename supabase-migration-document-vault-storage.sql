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
