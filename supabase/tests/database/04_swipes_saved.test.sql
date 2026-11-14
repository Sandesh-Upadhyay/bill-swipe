-- Swipes (duplicate prevention, undo) and saved requests.
begin;
\ir _helpers.psql
select plan(13);

select tests.remember('donor', tests.create_user('donor@test.local', 'Donor'));
select tests.remember('requester', tests.create_user('requester@test.local', 'Requester'));
select tests.remember('live', tests.create_request(tests.uid('requester'), 'active', 'verified'));
select tests.remember('pending', tests.create_request(tests.uid('requester'), 'pending_review', 'pending'));

select tests.authenticate_as(tests.uid('donor'));

select lives_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('donor'), tests.uid('live'), 'right')$$,
  'donors can swipe on a live request');
select throws_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('donor'), tests.uid('live'), 'left')$$,
  '23505', null, 'a second swipe on the same request is rejected');
select throws_ok($$update public.swipes set direction = 'left' where request_id = tests.uid('live')$$, '42501', null,
  'swipes cannot be changed in place');
select throws_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('donor'), tests.uid('pending'), 'right')$$,
  '42501', null, 'requests that are not discoverable cannot be swiped');
select throws_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('requester'), tests.uid('live'), 'right')$$,
  '42501', null, 'users cannot swipe on someone else''s behalf');
select lives_ok($$delete from public.swipes where request_id = tests.uid('live')$$, 'undo deletes your own swipe');
select lives_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('donor'), tests.uid('live'), 'left')$$,
  'after undo, the request can be swiped again');
select is((select count(*) from public.swipes), 1::bigint, 'a user sees only their own single swipe');

select lives_ok($$insert into public.saved_requests (user_id, request_id) values (tests.uid('donor'), tests.uid('live'))$$,
  'donors can save a live request');
select throws_ok($$insert into public.saved_requests (user_id, request_id) values (tests.uid('donor'), tests.uid('live'))$$,
  '23505', null, 'a request can only be saved once');

select tests.clear_authentication();
select tests.authenticate_as(tests.uid('requester'));
select throws_ok($$insert into public.swipes (user_id, request_id, direction) values (tests.uid('requester'), tests.uid('live'), 'right')$$,
  '42501', null, 'requesters cannot swipe on their own request');
select is((select count(*) from public.swipes), 0::bigint, 'requesters cannot see who swiped on their request');
select is((select count(*) from public.saved_requests), 0::bigint, 'users cannot see other people''s saved requests');

select * from finish();
rollback;
