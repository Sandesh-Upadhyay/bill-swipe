-- Schema shape and database constraints (run as the database owner).
begin;
\ir _helpers.psql
select plan(26);

-- Structure -------------------------------------------------------------------
select is(
  (select count(*) from pg_tables where schemaname = 'public' and tablename in (
    'profiles', 'bill_requests', 'bill_documents', 'swipes', 'saved_requests', 'contributions',
    'verification_reviews', 'notifications', 'reports', 'admin_audit_logs', 'bill_partners')),
  11::bigint, 'all 11 application tables exist');

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint, 'RLS is enabled on every table in the public schema');

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and data_type in ('real', 'double precision')),
  0::bigint, 'no floating-point columns anywhere');

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and column_name in ('amount', 'amount_raised') and data_type <> 'numeric'),
  0::bigint, 'monetary columns are NUMERIC');

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name in ('bill_requests', 'contributions') and column_name = 'currency' and is_nullable = 'NO'),
  2::bigint, 'every table with amounts stores a non-null currency code');

-- Profiles are created on sign-up, and metadata can't grant admin -------------
select tests.remember('owner', tests.create_user('owner@test.local', 'Owner'));
select tests.remember('sneaky', tests.create_user('sneaky@test.local', 'Sneaky', '{"is_admin": true, "role": "admin", "status": "active"}'));
select tests.remember('req', tests.create_request(tests.uid('owner'), 'active', 'verified', 100, 'USD'));

select is((select count(*) from public.profiles where id = tests.uid('owner')), 1::bigint, 'a profile is created automatically for each new auth user');
select is((select is_admin from public.profiles where id = tests.uid('sneaky')), false, 'sign-up metadata cannot grant admin');

-- Money and currency ---------------------------------------------------------------
select throws_ok(
  $$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date)
    values (tests.uid('owner'), 'Lowercase currency', repeat('x', 40), repeat('y', 130), 'rent', 100, 'usd', 'US', 'Testville', current_date + 5)$$,
  '23514', null, 'currency must be an upper-case ISO 4217 code');

select throws_ok(
  $$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date)
    values (tests.uid('owner'), 'Unsupported currency', repeat('x', 40), repeat('y', 130), 'rent', 100, 'XYZ', 'US', 'Testville', current_date + 5)$$,
  '23514', null, 'unsupported currency codes are rejected');

select throws_ok(
  $$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date)
    values (tests.uid('owner'), 'Zero amount bill', repeat('x', 40), repeat('y', 130), 'rent', 0, 'USD', 'US', 'Testville', current_date + 5)$$,
  '23514', null, 'amounts must be greater than zero');

select throws_ok(
  $$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date, breakdown)
    values (tests.uid('owner'), 'Breakdown mismatch', repeat('x', 40), repeat('y', 130), 'rent', 100, 'USD', 'US', 'Testville', current_date + 5,
            '[{"label": "Rent", "amount": "60.00"}, {"label": "Fee", "amount": "30.00"}]')$$,
  '22023', null, 'breakdown lines must add up to the requested amount');

select lives_ok(
  $$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date, breakdown)
    values (tests.uid('owner'), 'Breakdown that adds up', repeat('x', 40), repeat('y', 130), 'rent', 100.50, 'USD', 'US', 'Testville', current_date + 5,
            '[{"label": "Rent", "amount": "70.25"}, {"label": "Fee", "amount": "30.25"}]')$$,
  'a breakdown that sums exactly to the amount is accepted');

select throws_ok(
  $$update public.bill_requests set amount_raised = 100.01 where id = tests.uid('req')$$,
  '23514', null, 'simulated amount raised can never exceed the goal');

select throws_ok(
  $$update public.bill_requests set status = 'pending_review' where id = tests.uid('req')$$,
  '23514', null, 'a request cannot be verified while it is still awaiting review');

-- Contributions: simulated only, same currency as the request -------------------
select throws_ok(
  $$insert into public.contributions (request_id, donor_id, amount, currency, kind, status, is_simulated)
    values (tests.uid('req'), tests.uid('sneaky'), 10, 'USD', 'simulated', 'recorded', false)$$,
  '23514', null, 'real (non-simulated) contributions are impossible in Phase 1');

select throws_ok(
  $$insert into public.contributions (request_id, donor_id, amount, currency, kind, status)
    values (tests.uid('req'), tests.uid('sneaky'), 10, 'USD', 'simulated', 'open')$$,
  '23514', null, 'contribution kind and status must be consistent');

select throws_ok(
  $$insert into public.contributions (request_id, donor_id, amount, currency, kind, status)
    values (tests.uid('req'), tests.uid('sneaky'), 10, 'EUR', 'simulated', 'recorded')$$,
  '22023', null, 'contribution currency must match the request currency (no silent conversion)');

-- Reviews ---------------------------------------------------------------------------
select throws_ok(
  $$insert into public.verification_reviews (request_id, reviewer_id, identity_check, document_check, recipient_check, decision)
    values (tests.uid('req'), tests.uid('sneaky'), 'passed', 'pending', 'passed', 'approve')$$,
  '23514', null, 'an approval requires all three checks to have passed');

select throws_ok(
  $$insert into public.verification_reviews (request_id, reviewer_id) values (tests.uid('req'), tests.uid('owner'))$$,
  '42501', null, 'nobody can review their own request, even outside the API');

-- Documents -----------------------------------------------------------------------
select throws_ok(
  format($$insert into public.bill_documents (request_id, owner_id, storage_path, file_name, mime_type, size_bytes)
    values (%L, %L, %L, 'big.pdf', 'application/pdf', 10485761)$$,
    tests.uid('req'), tests.uid('owner'), tests.uid('owner') || '/' || tests.uid('req') || '/big.pdf'),
  '23514', null, 'documents larger than 10 MB are rejected');

select throws_ok(
  format($$insert into public.bill_documents (request_id, owner_id, storage_path, file_name, mime_type, size_bytes)
    values (%L, %L, %L, 'run.exe', 'application/x-msdownload', 100)$$,
    tests.uid('req'), tests.uid('owner'), tests.uid('owner') || '/' || tests.uid('req') || '/run.exe'),
  '23514', null, 'only PDF and image documents are allowed');

select throws_ok(
  format($$insert into public.bill_documents (request_id, owner_id, storage_path, file_name, mime_type, size_bytes)
    values (%L, %L, %L, 'bill.pdf', 'application/pdf', 100)$$,
    tests.uid('req'), tests.uid('owner'), tests.uid('sneaky') || '/' || tests.uid('req') || '/bill.pdf'),
  '23514', null, 'a document path must sit in its owner''s folder');

-- Reports, notifications, partners, audit log -----------------------------------------
insert into public.reports (request_id, reporter_id, reason) values (tests.uid('req'), tests.uid('sneaky'), 'suspicious');
select throws_ok(
  $$insert into public.reports (request_id, reporter_id, reason) values (tests.uid('req'), tests.uid('sneaky'), 'duplicate')$$,
  '23505', null, 'one open report per reporter per request');

select throws_ok(
  $$insert into public.notifications (user_id, title, body, href) values (tests.uid('owner'), 'Hi', 'Body', 'https://evil.example')$$,
  '23514', null, 'notification links must be relative paths');

insert into public.admin_audit_logs (action) values ('test_entry');
select throws_ok(
  $$update public.admin_audit_logs set action = 'tampered' where action = 'test_entry'$$,
  '42501', null, 'audit log entries cannot be edited, even by the owner');

select throws_ok(
  $$delete from public.admin_audit_logs where action = 'test_entry'$$,
  '42501', null, 'audit log entries cannot be deleted, even by the owner');

select * from finish();
rollback;
