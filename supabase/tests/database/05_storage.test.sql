-- Storage buckets and object policies.
-- Note: file-size and MIME limits are enforced by the Storage API from the bucket settings
-- tested here; these tests cover the database-side rules (privacy, folders, ownership).
begin;
\ir _helpers.psql
select plan(18);

select is((select public from storage.buckets where id = 'bill-documents'), false, 'bill-documents bucket is private');
select is((select public from storage.buckets where id = 'verification-evidence'), false, 'verification-evidence bucket is private');
select is((select public from storage.buckets where id = 'avatars'), true, 'avatars bucket is public');
select is((select file_size_limit from storage.buckets where id = 'bill-documents'), 10485760::bigint, 'bill documents are limited to 10 MB');
select is((select allowed_mime_types from storage.buckets where id = 'bill-documents'),
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'], 'bill documents accept only PDF and images');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint, 'avatars are limited to 2 MB');

select tests.remember('owner', tests.create_user('owner@test.local', 'Owner'));
select tests.remember('other', tests.create_user('other@test.local', 'Other'));
select tests.remember('admin', tests.create_user('admin@test.local', 'Admin'));
select tests.make_admin(tests.uid('admin'));
select tests.remember('owner_req', tests.create_request(tests.uid('owner'), 'pending_review', 'pending'));
select tests.remember('other_req', tests.create_request(tests.uid('other'), 'pending_review', 'pending'));

-- Owner uploads ------------------------------------------------------------------------------
select tests.authenticate_as(tests.uid('owner'));
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('bill-documents', %L, %L)$$,
  tests.uid('owner') || '/' || tests.uid('owner_req') || '/bill.pdf', tests.uid('owner')),
  'owners can upload a document into their own request folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('bill-documents', %L, %L)$$,
  tests.uid('other') || '/' || tests.uid('other_req') || '/sneaky.pdf', tests.uid('owner')),
  '42501', null, 'users cannot upload into someone else''s folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('bill-documents', %L, %L)$$,
  tests.uid('owner') || '/' || tests.uid('other_req') || '/sneaky.pdf', tests.uid('owner')),
  '42501', null, 'users cannot attach documents to a request they don''t own');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('bill-documents', %L, %L)$$,
  tests.uid('owner') || '/' || tests.uid('owner_req') || '/script.exe', tests.uid('owner')),
  '42501', null, 'disallowed file extensions are rejected');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('verification-evidence', %L, %L)$$,
  tests.uid('owner_req') || '/evidence.pdf', tests.uid('owner')),
  '42501', null, 'regular users cannot upload verification evidence');
select is((select count(*) from storage.objects where bucket_id = 'bill-documents'), 1::bigint, 'owners can read their own documents');

-- Other users and visitors -----------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('other'));
select is((select count(*) from storage.objects where bucket_id = 'bill-documents'), 0::bigint, 'other users cannot read someone''s documents');
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L)$$,
  tests.uid('other') || '/me.png', tests.uid('other')), 'users can upload their own avatar');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L)$$,
  tests.uid('owner') || '/me.png', tests.uid('other')), '42501', null, 'users cannot replace someone else''s avatar');

select tests.clear_authentication();
select tests.authenticate_as_anon();
select is((select count(*) from storage.objects where bucket_id = 'bill-documents'), 0::bigint, 'visitors cannot read any bill document');

-- Reviewers ------------------------------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('admin'));
select is((select count(*) from storage.objects where bucket_id = 'bill-documents'), 1::bigint,
  'admins can read bill documents (needed to create short-lived signed URLs)');
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('verification-evidence', %L, %L)$$,
  tests.uid('owner_req') || '/evidence.pdf', tests.uid('admin')), 'admins can upload verification evidence');

select * from finish();
rollback;
