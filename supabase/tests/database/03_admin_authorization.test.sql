-- Admin authorization, verification workflow, audit trail and simulated contributions.
begin;
\ir _helpers.psql
select plan(32);

-- Setup ---------------------------------------------------------------------------------
select tests.remember('admin', tests.create_user('admin@test.local', 'Admin'));
select tests.make_admin(tests.uid('admin'));
select tests.remember('rita', tests.create_user('rita@test.local', 'Rita'));
select tests.remember('dan', tests.create_user('dan@test.local', 'Dan'));
select tests.remember('ruth', tests.create_user('ruth@test.local', 'Ruth'));
select tests.remember('rita_pending', tests.create_request(tests.uid('rita'), 'pending_review', 'pending'));
select tests.remember('admin_own', tests.create_request(tests.uid('admin'), 'pending_review', 'pending'));
select tests.remember('ruth_live', tests.create_request(tests.uid('ruth'), 'active', 'verified', 100, 'USD'));

-- A regular user can't use any admin capability -----------------------------------------
select tests.authenticate_as(tests.uid('dan'));
select is(public.is_admin(), false, 'is_admin() is false for a regular user');
select throws_ok($$select public.admin_decide_request(tests.uid('rita_pending'), 'approve', null)$$, '42501', null,
  'regular users cannot approve requests');
select throws_ok($$select public.admin_record_review(tests.uid('rita_pending'), 'passed', 'passed', 'passed', null)$$, '42501', null,
  'regular users cannot record reviews');
select throws_ok($$select public.admin_set_user_status(tests.uid('rita'), 'suspended', null)$$, '42501', null,
  'regular users cannot suspend accounts');
select throws_ok($$select public.record_audit_event('fake_event', 'bill_requests', null, '{}')$$, '42501', null,
  'clients cannot call the internal audit function');
select throws_ok($$insert into public.admin_audit_logs (action) values ('forged_entry')$$, '42501', null,
  'clients cannot write audit entries directly');
select is((select count(*) from public.admin_audit_logs), 0::bigint, 'regular users cannot read the audit log');
select is((select count(*) from public.verification_reviews), 0::bigint, 'regular users cannot read verification reviews');

-- The admin ----------------------------------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('admin'));
select is(public.is_admin(), true, 'is_admin() is true for an active admin');
select throws_ok($$select public.admin_decide_request(tests.uid('rita_pending'), 'approve', null)$$, '22023', null,
  'a request cannot be approved before a review is recorded');
select lives_ok($$select public.admin_record_review(tests.uid('rita_pending'), 'passed', 'passed', 'failed', 'Payee unclear')$$,
  'admins can record a review');
select throws_ok($$select public.admin_decide_request(tests.uid('rita_pending'), 'approve', null)$$, '22023', null,
  'approval is refused while any check has failed');
select lives_ok($$select public.admin_record_review(tests.uid('rita_pending'), 'passed', 'passed', 'passed', 'All good')$$,
  'admins can record a passing review');
select lives_ok($$select public.admin_decide_request(tests.uid('rita_pending'), 'approve', null)$$,
  'approval succeeds once identity, document and recipient checks have all passed');
select is((select status::text || '/' || verification_status::text from public.bill_requests where id = tests.uid('rita_pending')),
  'active/verified', 'approval makes the request live and verified');
select is((select count(*) from public.admin_audit_logs where target_id = tests.uid('rita_pending') and actor_id = tests.uid('admin')),
  3::bigint, 'each review and the decision are audited with the admin as actor');
select throws_ok($$select public.admin_record_review(tests.uid('admin_own'), 'passed', 'passed', 'passed', null)$$, '42501', null,
  'admins cannot review their own request');
select throws_ok($$select public.admin_decide_request(tests.uid('admin_own'), 'approve', null)$$, '42501', null,
  'admins cannot approve their own request');
select throws_ok($$select public.admin_set_user_status(tests.uid('admin'), 'suspended', null)$$, '42501', null,
  'admins cannot change their own account status');
select throws_ok($$select public.admin_decide_request(tests.uid('ruth_live'), 'reject', 'no')$$, '22023', null,
  'decisions only apply to requests awaiting review');
select lives_ok($$select public.admin_set_user_status(tests.uid('rita'), 'suspended', 'Test suspension')$$,
  'admins can suspend another account');

-- Suspension takes effect everywhere ----------------------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as_anon();
select is((select count(*) from public.bill_requests where id = tests.uid('rita_pending')), 0::bigint,
  'a suspended user''s requests disappear from public discovery');
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('rita'));
select throws_ok(format($$insert into public.bill_requests (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date)
  values (%L, 'Submitted while suspended', repeat('x', 40), repeat('y', 130), 'rent', 100, 'USD', 'US', 'Testville', current_date + 9)$$, tests.uid('rita')),
  '42501', null, 'suspended users cannot submit requests');

-- Simulated contributions go through the RPC only --------------------------------------------
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('dan'));
select lives_ok($$select public.record_simulated_contribution(tests.uid('ruth_live'), 40, 'simulated', 'Good luck')$$,
  'donors can record a simulated contribution');
select throws_ok($$select public.record_simulated_contribution(tests.uid('ruth_live'), 70, 'simulated', null)$$, '22023', null,
  'a simulated contribution cannot exceed the remaining balance');
select throws_ok($$select public.record_simulated_contribution(tests.uid('ruth_live'), 10.001, 'simulated', null)$$, '22023', null,
  'amounts with more than two decimals are rejected (no float rounding)');
select throws_ok(format($$insert into public.contributions (request_id, donor_id, amount, currency, kind, status) values (%L, %L, 5, 'USD', 'simulated', 'recorded')$$,
  tests.uid('ruth_live'), tests.uid('dan')), '42501', null, 'contributions cannot be inserted directly');
select lives_ok($$select public.set_commitment_status(public.record_simulated_contribution(tests.uid('ruth_live'), 10, 'commitment', null), 'fulfilled')$$,
  'donors can make and fulfil a commitment');
select tests.clear_authentication();
select is((select amount_raised from public.bill_requests where id = tests.uid('ruth_live')), 50.00::numeric(14, 2),
  'progress updates exactly, in the request''s own currency');
select is((select count(*) from public.notifications where user_id = tests.uid('ruth')), 1::bigint,
  'the requester is notified of a simulated contribution (not of the commitment)');
select tests.authenticate_as(tests.uid('ruth'));
select throws_ok($$select public.record_simulated_contribution(tests.uid('ruth_live'), 5, 'simulated', null)$$, '42501', null,
  'requesters cannot contribute to their own request');

-- Three open reports flag a request automatically --------------------------------------------
select tests.clear_authentication();
select tests.remember('r1', tests.create_user('r1@test.local'));
select tests.remember('r2', tests.create_user('r2@test.local'));
select tests.authenticate_as(tests.uid('dan'));
insert into public.reports (request_id, reporter_id, reason) values (tests.uid('ruth_live'), tests.uid('dan'), 'suspicious');
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('r1'));
insert into public.reports (request_id, reporter_id, reason) values (tests.uid('ruth_live'), tests.uid('r1'), 'misleading');
select tests.clear_authentication();
select tests.authenticate_as(tests.uid('r2'));
insert into public.reports (request_id, reporter_id, reason) values (tests.uid('ruth_live'), tests.uid('r2'), 'duplicate');
select tests.clear_authentication();
select is((select is_flagged from public.bill_requests where id = tests.uid('ruth_live')), true,
  'a request is flagged automatically after three open reports');

select * from finish();
rollback;
