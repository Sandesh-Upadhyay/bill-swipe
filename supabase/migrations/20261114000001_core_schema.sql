-- =============================================================================
-- BillSwipe v2.0 · Phase 1 · Migration 1 of 4: core schema
--
-- Tables, types, constraints, indexes and updated_at triggers.
-- Security (RLS, grants) is in migration 3; storage in migration 4.
--
-- Money rules
--   * Every monetary amount is NUMERIC(14,2) and is stored next to its ISO 4217
--     currency code. Amounts in different currencies are never summed together.
--   * No real payments exist in Phase 1: contributions are simulated, enforced by
--     a CHECK constraint.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

-- ISO 4217 codes the product currently supports. Extend this list (and the app's
-- CURRENCIES constant) together when adding a market.
create domain public.currency_code as char(3)
  check (value ~ '^[A-Z]{3}$' and value in ('USD', 'GBP', 'CAD', 'AUD', 'INR', 'AED', 'EUR'));

-- ISO 3166-1 alpha-2 country codes supported by the product.
create domain public.country_code as char(2)
  check (value ~ '^[A-Z]{2}$' and value in ('US', 'GB', 'CA', 'AU', 'IN', 'AE', 'DE', 'FR'));

-- Positive money amount with two decimal places.
create domain public.money_amount as numeric(14, 2)
  check (value > 0);

create type public.user_mode as enum ('donor', 'requester');
create type public.account_status as enum ('active', 'suspended');
create type public.bill_category as enum ('medical', 'education', 'rent', 'electricity', 'water', 'emergency', 'other');
create type public.request_status as enum ('draft', 'pending_review', 'needs_info', 'active', 'completed', 'rejected', 'withdrawn');
-- Verification is never automatic. "verified" can only be set by an admin function
-- after all three review checks pass (see migration 2).
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.review_check_status as enum ('pending', 'passed', 'failed');
create type public.review_decision as enum ('approve', 'reject', 'request_info');
create type public.document_status as enum ('uploaded', 'under_review', 'accepted', 'rejected');
create type public.swipe_direction as enum ('left', 'right');
create type public.contribution_kind as enum ('simulated', 'commitment');
create type public.contribution_status as enum ('recorded', 'open', 'fulfilled', 'cancelled');
create type public.report_reason as enum ('suspicious', 'duplicate', 'inappropriate', 'misleading', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.notification_tone as enum ('default', 'success', 'warning');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. profiles — one row per auth user, created by trigger (migration 2)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 500),
  country_code public.country_code,
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  -- Which experience the user is currently using. Users may switch this themselves.
  active_mode public.user_mode not null default 'donor',
  onboarded boolean not null default false,
  -- Trusted fields: never writable by the user (column grants + guard trigger).
  is_admin boolean not null default false,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public profile and app preferences for each auth user.';
comment on column public.profiles.is_admin is 'Trusted. Only changeable by the service role or the database owner, never by the user.';
comment on column public.profiles.status is 'Trusted. Changed only through admin_set_user_status().';

create index profiles_is_admin_idx on public.profiles (id) where is_admin;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. bill_requests
-- ---------------------------------------------------------------------------
create table public.bill_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 8 and 80),
  summary text not null check (char_length(btrim(summary)) between 30 and 220),
  story text not null check (char_length(btrim(story)) between 120 and 2500),
  category public.bill_category not null,
  amount public.money_amount not null,
  currency public.currency_code not null,
  -- Simulated progress, always in the request's own currency. Only server functions change it.
  amount_raised numeric(14, 2) not null default 0 check (amount_raised >= 0),
  supporters_count integer not null default 0 check (supporters_count >= 0),
  country_code public.country_code not null,
  city text not null check (char_length(btrim(city)) between 2 and 60),
  due_date date not null,
  -- Optional itemisation: [{ "label": text, "amount": "12.50" }, ...] in the request currency.
  breakdown jsonb not null default '[]'::jsonb check (jsonb_typeof(breakdown) = 'array' and jsonb_array_length(breakdown) <= 8),
  status public.request_status not null default 'pending_review',
  verification_status public.verification_status not null default 'unverified',
  is_flagged boolean not null default false,
  -- Message from moderators shown to the requester (e.g. "please add a document").
  moderator_message text check (moderator_message is null or char_length(moderator_message) <= 1000),
  -- Development seed rows only. Real submissions are always false (enforced by trigger).
  is_demo boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_requests_raised_within_goal check (amount_raised <= amount),
  constraint bill_requests_verified_only_when_live check (
    verification_status <> 'verified' or status in ('active', 'completed', 'withdrawn')
  )
);

comment on table public.bill_requests is 'Bill requests. Discoverable only when active, verified, unflagged and the requester is active.';
comment on column public.bill_requests.is_demo is 'True only for development seed data.';

create index bill_requests_requester_idx on public.bill_requests (requester_id, created_at desc);
create index bill_requests_discovery_idx on public.bill_requests (created_at desc)
  where status = 'active' and verification_status = 'verified' and not is_flagged;
create index bill_requests_review_queue_idx on public.bill_requests (created_at)
  where status in ('pending_review', 'needs_info');
create index bill_requests_category_country_idx on public.bill_requests (category, country_code);

create trigger bill_requests_set_updated_at
  before update on public.bill_requests
  for each row execute function public.set_updated_at();

-- Validates the itemised breakdown: labelled lines with positive amounts that add up to the total.
create or replace function public.validate_bill_breakdown()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  item jsonb;
  item_total numeric(14, 2) := 0;
begin
  if jsonb_array_length(new.breakdown) = 0 then
    return new;
  end if;
  for item in select * from jsonb_array_elements(new.breakdown) loop
    if jsonb_typeof(item) <> 'object'
      or char_length(btrim(coalesce(item ->> 'label', ''))) not between 2 and 60
      or (item ->> 'amount') is null
      or (item ->> 'amount') !~ '^[0-9]+(\.[0-9]{1,2})?$'
      or (item ->> 'amount')::numeric <= 0 then
      raise exception 'Each breakdown line needs a label (2-60 characters) and a positive amount with at most 2 decimals'
        using errcode = '22023';
    end if;
    item_total := item_total + (item ->> 'amount')::numeric;
  end loop;
  if item_total <> new.amount then
    raise exception 'Breakdown lines add up to %, but the requested amount is %', item_total, new.amount
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger bill_requests_validate_breakdown
  before insert or update of breakdown, amount on public.bill_requests
  for each row execute function public.validate_bill_breakdown();

-- ---------------------------------------------------------------------------
-- 3. bill_documents — metadata for files in the private "bill-documents" bucket
-- ---------------------------------------------------------------------------
create table public.bill_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.bill_requests (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- Object path inside the bill-documents bucket: {owner_id}/{request_id}/{file}
  storage_path text not null unique check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  -- Optional content hash for duplicate-document detection.
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  status public.document_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_documents_path_matches_owner check (split_part(storage_path, '/', 1) = owner_id::text),
  constraint bill_documents_path_matches_request check (split_part(storage_path, '/', 2) = request_id::text)
);

comment on table public.bill_documents is 'Private document metadata. Never publicly readable.';

create index bill_documents_request_idx on public.bill_documents (request_id);
create index bill_documents_owner_idx on public.bill_documents (owner_id);
create index bill_documents_sha256_idx on public.bill_documents (sha256) where sha256 is not null;

create trigger bill_documents_set_updated_at
  before update on public.bill_documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. swipes — one response per user per request
-- ---------------------------------------------------------------------------
create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null references public.bill_requests (id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swipes_one_per_user_request unique (user_id, request_id)
);

create index swipes_request_idx on public.swipes (request_id);

create trigger swipes_set_updated_at
  before update on public.swipes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. saved_requests
-- ---------------------------------------------------------------------------
create table public.saved_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null references public.bill_requests (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_requests_unique unique (user_id, request_id)
);

create index saved_requests_request_idx on public.saved_requests (request_id);

create trigger saved_requests_set_updated_at
  before update on public.saved_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. contributions — SIMULATED ONLY in Phase 1
-- ---------------------------------------------------------------------------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.bill_requests (id) on delete restrict,
  donor_id uuid not null references public.profiles (id) on delete cascade,
  amount public.money_amount not null,
  currency public.currency_code not null,
  kind public.contribution_kind not null,
  status public.contribution_status not null,
  message text check (message is null or char_length(message) <= 280),
  -- No real money moves in Phase 1. Real payments will need a separate, audited design.
  is_simulated boolean not null default true check (is_simulated),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributions_kind_status check (
    (kind = 'simulated' and status = 'recorded')
    or (kind = 'commitment' and status in ('open', 'fulfilled', 'cancelled'))
  )
);

create index contributions_request_idx on public.contributions (request_id, created_at desc);
create index contributions_donor_idx on public.contributions (donor_id, created_at desc);

create trigger contributions_set_updated_at
  before update on public.contributions
  for each row execute function public.set_updated_at();

-- A contribution's currency must equal its request's currency (no implicit conversion).
create or replace function public.check_contribution_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.currency <> (select r.currency from public.bill_requests r where r.id = new.request_id) then
    raise exception 'Contribution currency must match the request currency' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger contributions_check_currency
  before insert or update of currency, request_id on public.contributions
  for each row execute function public.check_contribution_currency();

-- ---------------------------------------------------------------------------
-- 7. verification_reviews — the three simulated/manual review checks per decision
-- ---------------------------------------------------------------------------
create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.bill_requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  identity_check public.review_check_status not null default 'pending',
  document_check public.review_check_status not null default 'pending',
  recipient_check public.review_check_status not null default 'pending',
  decision public.review_decision,
  -- Internal note for other reviewers. Never shown to requesters or donors.
  notes text check (notes is null or char_length(notes) <= 2000),
  -- Strictly increasing order of reviews. created_at alone can tie (now() is fixed per transaction),
  -- and "the latest review" must be unambiguous because approval depends on it.
  review_seq bigint generated always as identity unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint verification_reviews_approve_requires_all_checks check (
    decision is distinct from 'approve'
    or (identity_check = 'passed' and document_check = 'passed' and recipient_check = 'passed')
  )
);

comment on column public.verification_reviews.identity_check is 'Requester matches their profile.';
comment on column public.verification_reviews.document_check is 'Bill looks genuine and matches the requested amount and due date.';
comment on column public.verification_reviews.recipient_check is 'Payee / biller details are plausible.';

create index verification_reviews_request_idx on public.verification_reviews (request_id, review_seq desc);
create index verification_reviews_reviewer_idx on public.verification_reviews (reviewer_id);

create trigger verification_reviews_set_updated_at
  before update on public.verification_reviews
  for each row execute function public.set_updated_at();

-- Reviewers can never review their own request (defence in depth; functions also check).
create or replace function public.prevent_self_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewer_id = (select r.requester_id from public.bill_requests r where r.id = new.request_id) then
    raise exception 'Reviewers cannot review their own request' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger verification_reviews_prevent_self_review
  before insert or update of reviewer_id, request_id on public.verification_reviews
  for each row execute function public.prevent_self_review();

-- ---------------------------------------------------------------------------
-- 8. notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1000),
  href text check (href is null or href ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  tone public.notification_tone not null default 'default',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.bill_requests (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_resolution_consistent check (
    (status = 'open' and resolved_at is null) or (status <> 'open' and resolved_at is not null)
  )
);

-- One open report per reporter per request.
create unique index reports_one_open_per_reporter on public.reports (request_id, reporter_id) where status = 'open';
create index reports_status_idx on public.reports (status, created_at);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. admin_audit_logs — append-only
-- ---------------------------------------------------------------------------
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  -- Always auth.uid() of the caller, set inside record_audit_event(); never client-supplied.
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action ~ '^[a-z_]{3,60}$'),
  target_table text check (target_table is null or target_table ~ '^[a-z_]{3,60}$'),
  target_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_target_idx on public.admin_audit_logs (target_table, target_id);
create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id);

-- Audit rows are immutable, even for admins and the service role.
create or replace function public.prevent_audit_log_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'admin_audit_logs is append-only' using errcode = '42501';
end;
$$;

create trigger admin_audit_logs_append_only
  before update or delete on public.admin_audit_logs
  for each row execute function public.prevent_audit_log_changes();

-- ---------------------------------------------------------------------------
-- 11. bill_partners — billers/utilities for future direct-to-biller payments
-- ---------------------------------------------------------------------------
create table public.bill_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  category public.bill_category not null,
  country_code public.country_code not null,
  website_url text check (website_url is null or website_url ~ '^https://[^\s]+$'),
  is_active boolean not null default true,
  -- Development seed rows only.
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_partners_unique_name unique (name, country_code)
);

create index bill_partners_lookup_idx on public.bill_partners (country_code, category) where is_active;

create trigger bill_partners_set_updated_at
  before update on public.bill_partners
  for each row execute function public.set_updated_at();
