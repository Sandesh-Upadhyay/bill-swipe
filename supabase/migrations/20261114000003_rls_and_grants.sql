-- =============================================================================
-- BillSwipe v2.0 · Phase 1 · Migration 3 of 4: Row Level Security and grants
--
-- Two layers, both required:
--   1. GRANTs decide which operations/columns an API role may attempt at all.
--      Supabase grants broad table privileges to anon/authenticated by default;
--      we revoke them and grant back only what each table needs.
--   2. RLS policies decide which rows. One policy per operation (SELECT, INSERT,
--      UPDATE, DELETE). No table relies on a permissive "true" policy for writes.
--
-- Trusted writes (moderation, funding, verification, audit) happen only inside
-- SECURITY DEFINER functions from migration 2.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Grants: start from nothing for the API roles
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Future objects created in this schema also start without API-role privileges.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- The service role (server-only, never in browser code) keeps full access and bypasses RLS.
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Helper functions referenced by RLS policies and guard triggers must be executable by
-- the roles whose queries evaluate them. They only return booleans about the caller.
grant execute on function public.is_trusted_context() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_active_user(uuid) to anon, authenticated;
grant execute on function public.is_request_discoverable(uuid) to anon, authenticated;
grant execute on function public.owns_request(uuid) to anon, authenticated;
grant execute on function public.is_public_requester(uuid) to anon, authenticated;

-- Client RPCs (each re-checks the caller inside).
grant execute on function public.record_simulated_contribution(uuid, numeric, public.contribution_kind, text) to authenticated;
grant execute on function public.set_commitment_status(uuid, public.contribution_status) to authenticated;
grant execute on function public.admin_record_review(uuid, public.review_check_status, public.review_check_status, public.review_check_status, text) to authenticated;
grant execute on function public.admin_decide_request(uuid, public.review_decision, text) to authenticated;
grant execute on function public.admin_set_flag(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.account_status, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.admin_set_document_status(uuid, public.document_status) to authenticated;
-- Deliberately NOT granted: record_audit_event, notify_user, require_admin, handle_new_user,
-- and all trigger functions. Clients cannot write audit logs or notifications directly.

-- ---------------------------------------------------------------------------
-- Enable RLS on every application table
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.bill_requests enable row level security;
alter table public.bill_documents enable row level security;
alter table public.swipes enable row level security;
alter table public.saved_requests enable row level security;
alter table public.contributions enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.bill_partners enable row level security;

-- =============================================================================
-- profiles
-- =============================================================================
-- Readable columns exclude is_admin (use the is_admin() RPC for your own status).
grant select (id, display_name, bio, country_code, avatar_path, active_mode, onboarded, status, created_at, updated_at)
  on public.profiles to authenticated;
-- Anonymous visitors see only what's needed to show a public request's author.
grant select (id, display_name, country_code, avatar_path) on public.profiles to anon;
-- Users may edit only these columns. is_admin and status are not grantable.
grant update (display_name, bio, country_code, avatar_path, active_mode, onboarded) on public.profiles to authenticated;

create policy profiles_select_own_admin_or_public on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin() or public.is_public_requester(id));

create policy profiles_select_public_requesters on public.profiles
  for select to anon
  using (public.is_public_requester(id));

-- Profiles are created by the on_auth_user_created trigger, never by clients.
create policy profiles_insert_none on public.profiles
  for insert to authenticated
  with check (false);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Account deletion goes through Supabase Auth (cascades), not direct deletes.
create policy profiles_delete_none on public.profiles
  for delete to authenticated
  using (false);

-- =============================================================================
-- bill_requests
-- =============================================================================
grant select on public.bill_requests to anon, authenticated;
grant insert (requester_id, title, summary, story, category, amount, currency, country_code, city, due_date, breakdown, status)
  on public.bill_requests to authenticated;
grant update (title, summary, story, category, amount, currency, country_code, city, due_date, breakdown, status)
  on public.bill_requests to authenticated;
grant delete on public.bill_requests to authenticated;

create policy bill_requests_select_public on public.bill_requests
  for select to anon
  using (public.is_request_discoverable(id));

create policy bill_requests_select_visible on public.bill_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or public.is_admin() or public.is_request_discoverable(id));

create policy bill_requests_insert_own on public.bill_requests
  for insert to authenticated
  with check (requester_id = (select auth.uid()) and status in ('draft', 'pending_review'));

-- Owners edit their own requests; the guard trigger limits which columns/statuses change.
create policy bill_requests_update_own on public.bill_requests
  for update to authenticated
  using (requester_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()));

-- Owners may delete only unpublished requests with no contributions.
create policy bill_requests_delete_own_unpublished on public.bill_requests
  for delete to authenticated
  using (
    requester_id = (select auth.uid())
    and status in ('draft', 'pending_review', 'withdrawn', 'rejected')
    and published_at is null
  );

-- =============================================================================
-- bill_documents (private metadata)
-- =============================================================================
grant select on public.bill_documents to authenticated;
grant insert (request_id, owner_id, storage_path, file_name, mime_type, size_bytes, sha256) on public.bill_documents to authenticated;
grant delete on public.bill_documents to authenticated;

create policy bill_documents_select_owner_or_admin on public.bill_documents
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

create policy bill_documents_insert_own on public.bill_documents
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.owns_request(request_id));

-- Status changes go through admin_set_document_status().
create policy bill_documents_update_none on public.bill_documents
  for update to authenticated
  using (false);

create policy bill_documents_delete_own_unreviewed on public.bill_documents
  for delete to authenticated
  using (owner_id = (select auth.uid()) and status = 'uploaded');

-- =============================================================================
-- swipes
-- =============================================================================
grant select, delete on public.swipes to authenticated;
grant insert (user_id, request_id, direction) on public.swipes to authenticated;

create policy swipes_select_own on public.swipes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy swipes_insert_own_discoverable on public.swipes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_request_discoverable(request_id)
    and not public.owns_request(request_id)
  );

-- A swipe is a one-off response: undo it by deleting, not by changing direction.
create policy swipes_update_none on public.swipes
  for update to authenticated
  using (false);

create policy swipes_delete_own on public.swipes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =============================================================================
-- saved_requests
-- =============================================================================
grant select, delete on public.saved_requests to authenticated;
grant insert (user_id, request_id) on public.saved_requests to authenticated;

create policy saved_requests_select_own on public.saved_requests
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy saved_requests_insert_own on public.saved_requests
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_request_discoverable(request_id));

create policy saved_requests_update_none on public.saved_requests
  for update to authenticated
  using (false);

create policy saved_requests_delete_own on public.saved_requests
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =============================================================================
-- contributions (read-only for clients; written by RPCs)
-- =============================================================================
grant select on public.contributions to authenticated;

create policy contributions_select_related on public.contributions
  for select to authenticated
  using (donor_id = (select auth.uid()) or public.owns_request(request_id) or public.is_admin());

create policy contributions_insert_none on public.contributions
  for insert to authenticated
  with check (false);

create policy contributions_update_none on public.contributions
  for update to authenticated
  using (false);

create policy contributions_delete_none on public.contributions
  for delete to authenticated
  using (false);

-- =============================================================================
-- verification_reviews (admins only; written by RPCs)
-- =============================================================================
grant select on public.verification_reviews to authenticated;

create policy verification_reviews_select_admin on public.verification_reviews
  for select to authenticated
  using (public.is_admin());

create policy verification_reviews_insert_none on public.verification_reviews
  for insert to authenticated
  with check (false);

create policy verification_reviews_update_none on public.verification_reviews
  for update to authenticated
  using (false);

create policy verification_reviews_delete_none on public.verification_reviews
  for delete to authenticated
  using (false);

-- =============================================================================
-- notifications (own only; created by server functions)
-- =============================================================================
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_insert_none on public.notifications
  for insert to authenticated
  with check (false);

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- =============================================================================
-- reports
-- =============================================================================
grant select on public.reports to authenticated;
grant insert (request_id, reporter_id, reason, details) on public.reports to authenticated;

create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());

create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and resolved_by is null
    and not public.owns_request(request_id)
    and (public.is_request_discoverable(request_id) or public.is_admin())
  );

-- Resolution goes through admin_resolve_report().
create policy reports_update_none on public.reports
  for update to authenticated
  using (false);

create policy reports_delete_none on public.reports
  for delete to authenticated
  using (false);

-- =============================================================================
-- admin_audit_logs (admins read; only server functions write; append-only)
-- =============================================================================
grant select on public.admin_audit_logs to authenticated;

create policy admin_audit_logs_select_admin on public.admin_audit_logs
  for select to authenticated
  using (public.is_admin());

create policy admin_audit_logs_insert_none on public.admin_audit_logs
  for insert to authenticated
  with check (false);

create policy admin_audit_logs_update_none on public.admin_audit_logs
  for update to authenticated
  using (false);

create policy admin_audit_logs_delete_none on public.admin_audit_logs
  for delete to authenticated
  using (false);

-- =============================================================================
-- bill_partners (public directory of active partners; admins manage)
-- =============================================================================
grant select on public.bill_partners to anon, authenticated;
grant insert (name, category, country_code, website_url, is_active) on public.bill_partners to authenticated;
grant update (name, category, country_code, website_url, is_active) on public.bill_partners to authenticated;
grant delete on public.bill_partners to authenticated;

create policy bill_partners_select_active on public.bill_partners
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy bill_partners_insert_admin on public.bill_partners
  for insert to authenticated
  with check (public.is_admin());

create policy bill_partners_update_admin on public.bill_partners
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy bill_partners_delete_admin on public.bill_partners
  for delete to authenticated
  using (public.is_admin());
