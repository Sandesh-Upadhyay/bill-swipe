-- Phase 2: profile creation for email and OAuth sign-ups, and profile editing rules.
begin;
\ir _helpers.psql
select plan(14);

-- Email sign-up with country + accepted terms
select tests.remember('email_user', tests.create_user('email@test.local', 'Email User',
  '{"country_code": "GB", "terms_accepted": "true", "active_mode": "requester"}'));
select is((select preferred_currency::text from public.profiles where id = tests.uid('email_user')), 'GBP',
  'preferred currency defaults from the sign-up country');
select ok((select terms_accepted_at is not null from public.profiles where id = tests.uid('email_user')),
  'terms acceptance is recorded at sign-up');
select is((select active_mode::text from public.profiles where id = tests.uid('email_user')), 'requester',
  'the chosen starting experience is stored');

-- Google-style metadata (full_name / name / avatar_url), no country, no terms flag
select tests.remember('google_user', gen_random_uuid());
insert into auth.users (id, email, aud, role, raw_user_meta_data)
values (tests.uid('google_user'), 'g@test.local', 'authenticated', 'authenticated',
        '{"name": "Grace Google", "avatar_url": "https://lh3.googleusercontent.com/a/x", "is_admin": true, "status": "suspended"}');
select is((select display_name from public.profiles where id = tests.uid('google_user')), 'Grace Google',
  'an OAuth sign-up gets a profile named from provider metadata');
select is((select is_admin from public.profiles where id = tests.uid('google_user')), false,
  'provider metadata cannot grant admin');
select is((select status::text from public.profiles where id = tests.uid('google_user')), 'active',
  'provider metadata cannot set account status');
select ok((select preferred_currency is null and country_code is null and terms_accepted_at is null
           from public.profiles where id = tests.uid('google_user')),
  'missing optional fields stay empty rather than guessed');

-- Logging in again never overwrites the profile
update public.profiles set display_name = 'Chosen Name' where id = tests.uid('google_user');
update auth.users set raw_user_meta_data = '{"name": "Provider Changed Name"}' where id = tests.uid('google_user');
select is((select display_name from public.profiles where id = tests.uid('google_user')), 'Chosen Name',
  'provider metadata updates on later logins do not overwrite the profile');
select is((select count(*) from public.profiles where id = tests.uid('google_user')), 1::bigint,
  'exactly one profile per user');

-- Editing rules for the owner
select tests.authenticate_as(tests.uid('email_user'));
select lives_ok($$update public.profiles set preferred_currency = 'EUR', display_name = 'Renamed', bio = 'Hello' where id = tests.uid('email_user')$$,
  'users can update name, bio and preferred currency');
select throws_ok($$update public.profiles set preferred_currency = 'XYZ' where id = tests.uid('email_user')$$, '23514', null,
  'preferred currency must be a supported ISO 4217 code');
select throws_ok($$update public.profiles set terms_accepted_at = now() - interval '1 year' where id = tests.uid('email_user')$$, '42501', null,
  'users cannot rewrite their terms acceptance time');
select throws_ok($$select public.default_currency_for('GB')$$, '42501', null,
  'internal helper functions are not callable by clients');
select is((select count(*) from public.profiles where id = tests.uid('google_user') and preferred_currency is not null), 0::bigint,
  'users cannot change someone else''s profile (no rows visible or updated)');

select * from finish();
rollback;
