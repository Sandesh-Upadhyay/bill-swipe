-- =============================================================================
-- BillSwipe · DEVELOPMENT SEED DATA (fictional) — LOCAL USE ONLY
--
-- Runs automatically on `supabase db reset` (local stack only). It is NOT applied by
-- `supabase db push`, so it never reaches a hosted/production database unless someone
-- explicitly runs it, and it refuses to run if real accounts exist.
--
-- Everything here is invented: people, stories, amounts and places.
-- Seed rows are marked is_demo = true; real submissions can never set that flag.
--
-- Local demo sign-ins (local stack only):
--   jordan.admin@demo.billswipe.test     admin
--   alex.donor@demo.billswipe.test       donor
--   hannah.donor@demo.billswipe.test     donor
--   sam.requester@demo.billswipe.test    requester
--   marisol@demo.billswipe.test, ravi@demo.billswipe.test,
--   lena@demo.billswipe.test, amelia@demo.billswipe.test   requesters
-- Password for every demo account: billswipe-demo-only
-- =============================================================================

do $$
begin
  if exists (select 1 from auth.users where email not like '%@demo.billswipe.test') then
    raise exception 'seed.sql is for local development only, and this database already has non-demo accounts. Aborting.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Demo auth users (profiles are created by the on_auth_user_created trigger)
-- ---------------------------------------------------------------------------
with demo_users (id, email, display_name, country_code, mode) as (
  values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'jordan.admin@demo.billswipe.test', 'Jordan Lee', 'AU', 'donor'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'alex.donor@demo.billswipe.test', 'Alex Morgan', 'US', 'donor'),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'hannah.donor@demo.billswipe.test', 'Hannah K.', 'DE', 'donor'),
    ('00000000-0000-4000-8000-000000000011'::uuid, 'sam.requester@demo.billswipe.test', 'Sam O.', 'GB', 'requester'),
    ('00000000-0000-4000-8000-000000000012'::uuid, 'marisol@demo.billswipe.test', 'Marisol V.', 'US', 'requester'),
    ('00000000-0000-4000-8000-000000000013'::uuid, 'ravi@demo.billswipe.test', 'Ravi P.', 'IN', 'requester'),
    ('00000000-0000-4000-8000-000000000014'::uuid, 'lena@demo.billswipe.test', 'Lena H.', 'DE', 'requester'),
    ('00000000-0000-4000-8000-000000000015'::uuid, 'amelia@demo.billswipe.test', 'Amelia R.', 'GB', 'requester')
)
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email,
  extensions.crypt('billswipe-demo-only', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name, 'country_code', country_code, 'active_mode', mode),
  now() - interval '90 days', now(),
  '', '', '', ''
from demo_users;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.email like '%@demo.billswipe.test';

-- Profile details. is_admin is set here because the seed runs as the database owner (trusted).
update public.profiles set onboarded = true where id in (select id from auth.users where email like '%@demo.billswipe.test');
update public.profiles set is_admin = true, bio = 'Fictional demo moderator.' where id = '00000000-0000-4000-8000-000000000001';
update public.profiles set bio = 'Fictional donor who likes supporting education and utility bills.' where id = '00000000-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------
-- Demo bill requests (is_demo = true). Amounts are NUMERIC with their own currency.
-- ---------------------------------------------------------------------------
insert into public.bill_requests (
  id, requester_id, title, summary, story, category, amount, currency, amount_raised, supporters_count,
  country_code, city, due_date, breakdown, status, verification_status, is_flagged, moderator_message, is_demo, published_at, created_at
) values
(
  '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012',
  'Physiotherapy after knee surgery',
  'Single parent recovering from knee surgery. Insurance covered the operation but not the physio sessions I need to return to work.',
  E'I work as a dental receptionist and slipped on a wet floor. The surgery went well, but the follow-up physiotherapy plan is only partly covered.\n\nI have already paid for the first sessions from savings. Help with the remaining sessions means I can keep recovering without a pause.',
  'medical', 1850.00, 'USD', 70.00, 2, 'US', 'Phoenix, AZ', current_date + 21,
  '[{"label": "Physiotherapy sessions (8 x $185)", "amount": "1480.00"}, {"label": "Progress assessment", "amount": "220.00"}, {"label": "Knee support brace", "amount": "150.00"}]',
  'active', 'verified', false, null, true, now() - interval '17 days', now() - interval '18 days'
),
(
  '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000013',
  'Dialysis sessions for my father',
  'My father needs dialysis three times a week. Our savings covered the first months, and we need help with the next ten sessions.',
  E'My father was diagnosed with kidney failure last year. Dialysis keeps him well enough to enjoy time with his grandchildren.\n\nWe have sold what we could and borrowed from relatives. Any help with the next sessions gives our family breathing room while his insurance claim is processed.',
  'medical', 65000.00, 'INR', 0, 0, 'IN', 'Pune', current_date + 14,
  '[{"label": "Dialysis sessions (10 x 4,500)", "amount": "45000.00"}, {"label": "Medication and injections", "amount": "14000.00"}, {"label": "Blood tests", "amount": "6000.00"}]',
  'active', 'verified', false, null, true, now() - interval '9 days', now() - interval '10 days'
),
(
  '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000014',
  'Annual energy settlement back-payment',
  'My annual electricity settlement came back far higher than expected and it is due in one payment next month.',
  E'I am a freelance illustrator and work from home, so my energy use rose a lot this year. My annual settlement arrived with a large back-payment due in full.\n\nI have already raised my monthly instalments for next year. This request covers the one-time back-payment so I can keep my studio running.',
  'electricity', 680.00, 'EUR', 0, 0, 'DE', 'Leipzig', current_date + 25,
  '[{"label": "Annual energy settlement", "amount": "610.00"}, {"label": "Reminder fees", "amount": "70.00"}]',
  'active', 'verified', false, null, true, now() - interval '5 days', now() - interval '6 days'
),
(
  '10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000011',
  'Prepayment meter top-up arrears',
  'Our prepayment meter built up debt over the cold weeks and now most of each top-up goes to arrears instead of heating.',
  E'During the cold snap we used emergency credit on the prepayment meter several times. Now a large share of every top-up is taken to repay that debt.\n\nClearing the arrears means our top-ups go back to keeping the flat warm for my two children.',
  'electricity', 520.00, 'GBP', 0, 0, 'GB', 'Manchester', current_date + 20,
  '[]', 'pending_review', 'pending', false, null, true, null, now() - interval '1 day'
),
(
  '10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000015',
  'Two months of rent arrears',
  'Reduced hours at work left me two months behind on rent, and my landlord has asked for a repayment plan.',
  E'My employer cut my hours over the winter and I fell two months behind on rent. My landlord has been understanding and asked for a repayment plan.\n\nMy hours are back to normal now. Help with the arrears means I can keep my tenancy and stay near my daughter''s school.',
  'rent', 950.00, 'GBP', 0, 0, 'GB', 'Bristol', current_date + 12,
  '[]', 'needs_info', 'pending', false,
  'Please upload the landlord''s arrears letter so we can review the amount.', true, null, now() - interval '4 days'
),
(
  '10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000012',
  'Water bill after a hidden leak',
  'A hidden leak under the slab tripled our water bill before we found it. The leak is fixed and now the bill is due.',
  E'We noticed the water meter spinning with every tap off. A plumber found a leak under the slab and fixed it, but the bill for the leak period is far above our usual amount.\n\nThe utility offered a small adjustment. This request covers the rest so the account stays in good standing.',
  'water', 290.00, 'USD', 290.00, 6, 'US', 'Phoenix, AZ', current_date - 3,
  '[]', 'completed', 'verified', false, null, true, now() - interval '40 days', now() - interval '42 days'
),
(
  '10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000015',
  'Urgent help needed with a large bill',
  'Please help me with this urgent bill. I cannot say more right now but it is very important and needs money fast.',
  E'This is an urgent situation and I need help as soon as possible. I cannot share many details right now, but the bill is very large and must be paid quickly.\n\nPlease send help fast. Thank you to anyone who can help me with this important bill today.',
  'emergency', 3000.00, 'USD', 0, 0, 'US', 'Unknown', current_date + 2,
  '[]', 'rejected', 'rejected', true,
  'Rejected: no supporting details or document were provided.', true, null, now() - interval '12 days'
);

-- ---------------------------------------------------------------------------
-- Reviews for the published requests (all three checks passed, approved by the demo admin)
-- ---------------------------------------------------------------------------
insert into public.verification_reviews (request_id, reviewer_id, identity_check, document_check, recipient_check, decision, notes, created_at)
select id, '00000000-0000-4000-8000-000000000001', 'passed', 'passed', 'passed', 'approve', 'Demo review: fictional documents checked.', published_at
from public.bill_requests
where is_demo and verification_status = 'verified';

insert into public.verification_reviews (request_id, reviewer_id, identity_check, document_check, recipient_check, decision, notes)
values ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 'passed', 'pending', 'pending', 'request_info', 'Waiting for the landlord letter.');

-- ---------------------------------------------------------------------------
-- Simulated activity (no real money)
-- ---------------------------------------------------------------------------
insert into public.contributions (request_id, donor_id, amount, currency, kind, status, message, created_at) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 25.00, 'USD', 'simulated', 'recorded', 'Wishing you a quick recovery!', now() - interval '6 days'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 45.00, 'USD', 'simulated', 'recorded', null, now() - interval '2 days'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 50.00, 'EUR', 'commitment', 'open', 'I will fulfil this next week.', now() - interval '1 day'),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000002', 290.00, 'USD', 'simulated', 'recorded', null, now() - interval '20 days');

insert into public.swipes (user_id, request_id, direction) values
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'right'),
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'left'),
  ('00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'right');

insert into public.saved_requests (user_id, request_id) values
  ('00000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003');

insert into public.reports (request_id, reporter_id, reason, details) values
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'duplicate', 'Demo report: looks similar to another request.');

insert into public.notifications (user_id, title, body, href, tone) values
  ('00000000-0000-4000-8000-000000000012', 'Your request is live', '"Physiotherapy after knee surgery" was approved and is now visible to donors.', '/dashboard/requester', 'success'),
  ('00000000-0000-4000-8000-000000000015', 'More information needed', 'Please upload the landlord''s arrears letter so we can review the amount.', '/dashboard/requester', 'warning');

insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
select '00000000-0000-4000-8000-000000000001', 'decide_request', 'bill_requests', id, jsonb_build_object('decision', 'approve', 'seed', true)
from public.bill_requests where is_demo and verification_status = 'verified';

insert into public.bill_partners (name, category, country_code, website_url, is_demo) values
  ('Demo City Power (fictional)', 'electricity', 'US', null, true),
  ('Demo Water Board (fictional)', 'water', 'IN', null, true),
  ('Demo Energie GmbH (fictional)', 'electricity', 'DE', null, true);
