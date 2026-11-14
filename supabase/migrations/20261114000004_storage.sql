-- =============================================================================
-- BillSwipe v2.0 · Phase 1 · Migration 4 of 4: Storage buckets and policies
--
-- Buckets
--   avatars                public read; users write only their own folder; 2 MB images
--   bill-documents         PRIVATE; owners write/read their own folder; reviewers read via
--                          is_admin(); 10 MB PDF/PNG/JPEG/WebP; previews via short-lived
--                          signed URLs only (never public URLs)
--   verification-evidence  PRIVATE; admins only; 10 MB PDF/images
--
-- Size and MIME limits are enforced by the Storage API from the bucket settings below.
-- Object paths:
--   avatars/{user_id}/{file}
--   bill-documents/{user_id}/{request_id}/{file}
--   verification-evidence/{request_id}/{file}
-- RLS is already enabled on storage.objects by Supabase.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('bill-documents', 'bill-documents', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']),
  ('verification-evidence', 'verification-evidence', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- avatars
-- ---------------------------------------------------------------------------
create policy "avatars: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "avatars: upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp')
  );

create policy "avatars: update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- bill-documents (private)
-- ---------------------------------------------------------------------------
-- Upload only into {your id}/{a request you own}/ with an allowed extension.
create policy "bill-documents: upload to own request folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'bill-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    and public.owns_request(((storage.foldername(name))[2])::uuid)
    and lower(storage.extension(name)) in ('pdf', 'png', 'jpg', 'jpeg', 'webp')
  );

-- Owners read their own documents; reviewers read via the trusted admin check.
-- createSignedUrl() requires SELECT, so signed previews follow the same rule.
create policy "bill-documents: owner or admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'bill-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

-- No in-place overwrites: originals are immutable once uploaded (upload a new file instead).
create policy "bill-documents: no updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'bill-documents' and false);

create policy "bill-documents: owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bill-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- verification-evidence (private, admins only)
-- ---------------------------------------------------------------------------
create policy "verification-evidence: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-evidence' and public.is_admin());

create policy "verification-evidence: admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-evidence'
    and public.is_admin()
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and lower(storage.extension(name)) in ('pdf', 'png', 'jpg', 'jpeg', 'webp')
  );

create policy "verification-evidence: no updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'verification-evidence' and false);

create policy "verification-evidence: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-evidence' and public.is_admin());
