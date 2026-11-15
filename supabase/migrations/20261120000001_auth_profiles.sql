-- =============================================================================
-- BillSwipe v2.0 · Phase 2 · Migration 5: profile fields for real authentication
--
-- Additive only. No existing rows are modified except by the backfill, which only
-- INSERTS profiles for auth users that have none (on conflict do nothing).
--
-- Security notes (why grants change):
--   * preferred_currency joins the existing per-column UPDATE grant on profiles, because
--     users choose it themselves (same as country_code).
--   * terms_accepted_at is recorded once at sign-up by the trigger and is NOT user-updatable.
--   * No RLS policy changes.
--
-- Donor/requester: active_mode is only the experience currently shown. No RLS policy or
-- function restricts actions by it, so every account can already both give and request.
-- Admin stays a separate privilege (is_admin), never derived from active_mode or sign-up data.
-- =============================================================================

alter table public.profiles
  add column if not exists preferred_currency public.currency_code,
  add column if not exists terms_accepted_at timestamptz;

comment on column public.profiles.preferred_currency is 'Currency the user prefers to see amounts in (ISO 4217). Display preference only.';
comment on column public.profiles.terms_accepted_at is 'When the user accepted the terms at sign-up. Set by handle_new_user; not user-editable.';

-- Readable by the owner (and others under the existing row policies).
grant select (preferred_currency, terms_accepted_at) on public.profiles to authenticated;
-- Editable by the owner, alongside the other profile preferences.
grant update (preferred_currency) on public.profiles to authenticated;

-- terms_accepted_at must not change after sign-up from the client.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;
  if new.id is distinct from old.id
    or new.is_admin is distinct from old.is_admin
    or new.status is distinct from old.status
    or new.terms_accepted_at is distinct from old.terms_accepted_at
    or new.created_at is distinct from old.created_at then
    raise exception 'You cannot change protected profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Default currency for a country, used to pre-fill preferred_currency.
create or replace function public.default_currency_for(p_country text)
returns public.currency_code
language sql
immutable
set search_path = ''
as $$
  select (case p_country
    when 'US' then 'USD' when 'GB' then 'GBP' when 'CA' then 'CAD' when 'AU' then 'AUD'
    when 'IN' then 'INR' when 'AE' then 'AED' when 'DE' then 'EUR' when 'FR' then 'EUR'
  end)::public.currency_code;
$$;

-- Profile creation on sign-up (email or OAuth). Idempotent: never overwrites an existing
-- profile, so signing in again (or a provider re-sending metadata) can't change user data.
-- Only harmless fields are read from metadata; admin/role/status values there are ignored.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := btrim(coalesce(v_meta ->> 'display_name', v_meta ->> 'full_name', v_meta ->> 'name', ''));
  v_country text := upper(coalesce(v_meta ->> 'country_code', ''));
  v_mode text := coalesce(v_meta ->> 'active_mode', 'donor');
  v_terms boolean := coalesce((v_meta ->> 'terms_accepted') = 'true', false);
begin
  if v_name = '' then
    v_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member');
  end if;
  if v_country not in ('US', 'GB', 'CA', 'AU', 'IN', 'AE', 'DE', 'FR') then
    v_country := null;
  end if;

  insert into public.profiles (id, display_name, country_code, active_mode, preferred_currency, terms_accepted_at)
  values (
    new.id,
    left(v_name, 80),
    v_country::public.country_code,
    case when v_mode = 'requester' then 'requester'::public.user_mode else 'donor'::public.user_mode end,
    public.default_currency_for(v_country),
    case when v_terms then now() end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Backfill: any auth user without a profile gets one (no existing profile is touched).
insert into public.profiles (id, display_name)
select u.id, left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'New member'), 80)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Internal helpers stay non-executable for API roles (default privileges already revoke;
-- explicit for clarity). default_currency_for is harmless but not needed by clients.
revoke execute on function public.default_currency_for(text) from public, anon, authenticated;
grant execute on function public.default_currency_for(text) to service_role;
