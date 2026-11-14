-- RLS, column grants and ownership for regular users and signed-out visitors.
begin;
\ir _helpers.psql
select plan(32);

-- Setup (as database owner) ---------------------------------------------------------
select tests.remember('alice', tests.create_user('alice@test.local', 'Alice'));
select tests.remember('bob', tests.create_user('bob@test.local', 'Bob'));
select tests.remember('alice_active', tests.create_request(tests.uid('alice'), 'active', 'verified'));
select tests.remember('alice_pending', tests.create_request(tests.uid('alice'), 'pending_review', 'pending'));
select tests.remember('bob_active', tests.create_request(tests.uid('bob'), 'active', 'verified'));
insert into public.notifications (user_id, title, body) values (tests.uid('alice'), 'For Alice', 'Private to Alice');
insert into public.bill_documents (request_id, owner_id, storage_path, file_name, mime_type, size_bytes)
values (tests.uid('alice_pending'), tests.uid('alice'),
        tests.uid('alice') || '/' || tests.uid('alice_pending') || '/bill.pdf', 'bill.pdf', 'application/pdf', 1000);

-- Signed-out visitor ---------------------------------------------------------------------
select tests.authenticate_as_anon();

select is((select count(*) from public.bill_requests where id = tests.uid('alice_active')), 1::bigint,
  'visitors can see a request that is live and verified');
select is((select count(*) from public.bill_requests where id = tests.uid('alice_pending')), 0::bigint,
  'visitors cannot see requests awaiting review');
select throws_ok($$select count(*) from public.bill_documents$$, '42501', null,
  'visitors have no access to document metadata');
select throws_ok($$select is_admin from public.profiles$$, '42501', null,
  'visitors cannot read the is_admin column');
select throws_ok($$select count(*) from public.notifications$$, '42501', null,
  'visitors have no access to notifications');
select is((select display_name from public.profiles where id = tests.uid('alice')), 'Alice',
  'visitors can see the public name of someone with a live request');
select throws_ok(format($$insert into public.swipes (user_id, request_id, direction) values (%L, %L, 'right')$$,
  tests.uid('alice'), tests.uid('bob_active')), '42501', null, 'visitors cannot write anything');

-- Another signed-in user (Bob) ------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('bob'));

select is((select count(*) from public.bill_requests where id = tests.uid('alice_pending')), 0::bigint,
  'users cannot see other people''s requests awaiting review');
select lives_ok($$update public.bill_requests set title = 'Changed by someone else' where id = tests.uid('alice_active')$$,
  'updating someone else''s request runs but matches no rows');
select lives_ok($$delete from public.bill_requests where id = tests.uid('alice_pending')$$,
  'deleting someone else''s request runs but matches no rows');
select throws_ok(format($$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date)
  values (%L, 'Pretending to be Alice', repeat('x', 40), repeat('y', 130), 'rent', 100, 'USD', 'US', 'Testville', current_date + 9)$$, tests.uid('alice')),
  '42501', null, 'users cannot create requests on someone else''s behalf');
select is((select count(*) from public.notifications), 0::bigint, 'users cannot see other people''s notifications');
select throws_ok(format($$insert into public.notifications (user_id, title, body) values (%L, 'Fake', 'Fake')$$, tests.uid('alice')),
  '42501', null, 'users cannot create notifications');
select is((select count(*) from public.bill_documents), 0::bigint, 'users cannot see other people''s document metadata');
select throws_ok($$update public.profiles set is_admin = true where id = tests.uid('bob')$$, '42501', null,
  'users cannot grant themselves admin');
select throws_ok($$update public.profiles set status = 'active' where id = tests.uid('bob')$$, '42501', null,
  'users cannot change their own account status');
select lives_ok($$update public.profiles set display_name = 'Bobby', active_mode = 'requester' where id = tests.uid('bob')$$,
  'users can update their own permitted profile fields (including switching mode)');

-- The owner (Alice) -------------------------------------------------------------------------
select tests.clear_authentication();
select is((select title from public.bill_requests where id = tests.uid('alice_active')), 'Test electricity bill',
  'Bob''s update did not change Alice''s request');
select is((select count(*) from public.bill_requests where id = tests.uid('alice_pending')), 1::bigint,
  'Bob''s delete did not remove Alice''s request');
select is((select display_name from public.profiles where id = tests.uid('bob')), 'Bobby', 'the permitted profile edit was saved');
select tests.authenticate_as(tests.uid('alice'));

select is((select count(*) from public.bill_requests where requester_id = tests.uid('alice')), 2::bigint,
  'owners see all of their own requests, including pending ones');
select throws_ok($$update public.bill_requests set status = 'active' where id = tests.uid('alice_pending')$$, '42501', null,
  'owners cannot approve their own request');
select throws_ok($$update public.bill_requests set verification_status = 'verified' where id = tests.uid('alice_pending')$$, '42501', null,
  'owners cannot change verification status');
select throws_ok($$update public.bill_requests set amount_raised = 100 where id = tests.uid('alice_active')$$, '42501', null,
  'owners cannot change funding progress');
select throws_ok(format($$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date, status)
  values (%L, 'Skipping the queue', repeat('x', 40), repeat('y', 130), 'rent', 100, 'USD', 'US', 'Testville', current_date + 9, 'active')$$, tests.uid('alice')),
  '42501', null, 'new requests cannot start as live');
select throws_ok(format($$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date, is_demo)
  values (%L, 'Pretending to be seed data', repeat('x', 40), repeat('y', 130), 'rent', 100, 'USD', 'US', 'Testville', current_date + 9, true)$$, tests.uid('alice')),
  '42501', null, 'real submissions cannot mark themselves as demo data');

select lives_ok($$update public.bill_requests set title = 'Edited live request title' where id = tests.uid('alice_active')$$,
  'owners can edit their live request');
select is((select status::text || '/' || verification_status::text from public.bill_requests where id = tests.uid('alice_active')),
  'pending_review/pending', 'editing a live request sends it back for review and clears verification');
select lives_ok($$update public.bill_requests set status = 'withdrawn' where id = tests.uid('alice_pending')$$,
  'owners can withdraw their own request');
select throws_ok($$update public.bill_requests set title = 'Editing after withdrawal' where id = tests.uid('alice_pending')$$, '42501', null,
  'withdrawn requests are locked');

select is((select count(*) from public.notifications), 1::bigint, 'users see their own notifications');
select throws_ok($$update public.notifications set title = 'Rewritten' where user_id = tests.uid('alice')$$, '42501', null,
  'users can only mark notifications as read, not rewrite them');

select * from finish();
rollback;
