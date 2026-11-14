-- =============================================================================
-- BillSwipe v2.0 · Phase 1 · Migration 2 of 4: functions and guard triggers
--
-- Conventions
--   * Every SECURITY DEFINER function sets search_path = '' and fully qualifies names.
--   * Admin rights come only from public.profiles.is_admin, read inside the database
--     via public.is_admin(). No function accepts an admin identity as a parameter;
--     the actor is always auth.uid().
--   * "Trusted context" = statement not running as the anon/authenticated API roles
--     (i.e. inside a SECURITY DEFINER function owned by postgres, the service role,
--     or a migration). Guard triggers allow protected changes only there.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity helpers
-- ---------------------------------------------------------------------------

-- True when the statement runs outside the client API roles.
create or replace function public.is_trusted_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user not in ('anon', 'authenticated');
$$;

-- Trusted, server-side admin check. Reads the database; ignores anything the client claims.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_admin
      and p.status = 'active'
  );
$$;

comment on function public.is_admin() is 'Trusted admin check used by RLS policies, storage policies and server code.';

-- Whether a user exists and isn't suspended. SECURITY DEFINER so policies on other tables
-- can call it without depending on (or recursing into) the profiles policies.
create or replace function public.is_active_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = p_user_id and p.status = 'active');
$$;

-- Whether a request may be shown to donors / the public.
create or replace function public.is_request_discoverable(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bill_requests r
    join public.profiles p on p.id = r.requester_id
    where r.id = p_request_id
      and r.status = 'active'
      and r.verification_status = 'verified'
      and not r.is_flagged
      and p.status = 'active'
  );
$$;

-- Whether the current user owns a request.
create or replace function public.owns_request(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bill_requests r where r.id = p_request_id and r.requester_id = (select auth.uid()));
$$;

-- Whether a profile belongs to someone with at least one publicly discoverable request.
create or replace function public.is_public_requester(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bill_requests r
    where r.requester_id = p_user_id and public.is_request_discoverable(r.id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers (not executable by API roles; see migration 3)
-- ---------------------------------------------------------------------------

-- Appends an audit entry. The actor is always the authenticated caller.
create or replace function public.record_audit_event(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values ((select auth.uid()), p_action, p_target_table, p_target_id, coalesce(p_details, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.notify_user(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_href text default null,
  p_tone public.notification_tone default 'default'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, title, body, href, tone)
  values (p_user_id, left(p_title, 120), left(p_body, 1000), p_href, p_tone);
$$;

-- Raises unless the caller is an active admin.
create or replace function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- New user → profile
-- ---------------------------------------------------------------------------
-- Copies only harmless fields from sign-up metadata. Role/admin values in metadata are ignored.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', ''));
  v_country text := upper(coalesce(new.raw_user_meta_data ->> 'country_code', ''));
  v_mode text := coalesce(new.raw_user_meta_data ->> 'active_mode', 'donor');
begin
  if v_name = '' then
    v_name := coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'New member');
  end if;
  insert into public.profiles (id, display_name, country_code, active_mode)
  values (
    new.id,
    left(v_name, 80),
    case when v_country in ('US', 'GB', 'CA', 'AU', 'IN', 'AE', 'DE', 'FR') then v_country::public.country_code end,
    case when v_mode = 'requester' then 'requester'::public.user_mode else 'donor'::public.user_mode end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard: profiles
-- ---------------------------------------------------------------------------
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
    or new.created_at is distinct from old.created_at then
    raise exception 'You cannot change protected profile fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Guard: bill_requests (client inserts/updates)
-- ---------------------------------------------------------------------------
create or replace function public.guard_bill_request_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_content_changed boolean;
begin
  if public.is_trusted_context() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.requester_id is distinct from (select auth.uid()) then
      raise exception 'Requests can only be created for yourself' using errcode = '42501';
    end if;
    if not public.is_active_user(new.requester_id) then
      raise exception 'Suspended accounts cannot submit requests' using errcode = '42501';
    end if;
    if new.status not in ('draft', 'pending_review') then
      raise exception 'New requests must be drafts or pending review' using errcode = '42501';
    end if;
    -- Never trust client-supplied moderation or funding values.
    new.verification_status := case when new.status = 'pending_review' then 'pending'::public.verification_status else 'unverified'::public.verification_status end;
    new.amount_raised := 0;
    new.supporters_count := 0;
    new.is_flagged := false;
    new.is_demo := false;
    new.moderator_message := null;
    new.published_at := null;
    return new;
  end if;

  -- UPDATE
  if new.requester_id is distinct from old.requester_id
    or new.amount_raised is distinct from old.amount_raised
    or new.supporters_count is distinct from old.supporters_count
    or new.is_flagged is distinct from old.is_flagged
    or new.is_demo is distinct from old.is_demo
    or new.verification_status is distinct from old.verification_status
    or new.moderator_message is distinct from old.moderator_message
    or new.published_at is distinct from old.published_at
    or new.created_at is distinct from old.created_at then
    raise exception 'You cannot change moderation, verification or funding fields' using errcode = '42501';
  end if;

  if old.status in ('completed', 'rejected', 'withdrawn') then
    raise exception 'This request can no longer be changed' using errcode = '42501';
  end if;

  v_content_changed :=
    new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.story is distinct from old.story
    or new.category is distinct from old.category
    or new.amount is distinct from old.amount
    or new.currency is distinct from old.currency
    or new.country_code is distinct from old.country_code
    or new.city is distinct from old.city
    or new.due_date is distinct from old.due_date
    or new.breakdown is distinct from old.breakdown;

  -- Withdrawing is always allowed for the owner (content must be left alone).
  if new.status = 'withdrawn' then
    if v_content_changed then
      raise exception 'Withdraw a request without editing it' using errcode = '22023';
    end if;
    return new;
  end if;

  if v_content_changed then
    if (new.currency is distinct from old.currency or new.amount < old.amount_raised)
      and exists (select 1 from public.contributions c where c.request_id = old.id) then
      raise exception 'Amount and currency are locked once contributions exist' using errcode = '22023';
    end if;
    -- Any edit sends the request back for review (drafts stay drafts until submitted).
    if old.status = 'draft' and new.status = 'draft' then
      return new;
    end if;
    if new.status not in (old.status, 'pending_review') then
      raise exception 'Invalid status change' using errcode = '42501';
    end if;
    new.status := 'pending_review';
    new.verification_status := 'pending';
    return new;
  end if;

  if new.status is distinct from old.status then
    -- Submit a draft, or resubmit after a moderator asked for more information.
    if old.status in ('draft', 'needs_info') and new.status = 'pending_review' then
      new.verification_status := 'pending';
      return new;
    end if;
    raise exception 'Only moderators can change a request to %', new.status using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger bill_requests_guard_write
  before insert or update on public.bill_requests
  for each row execute function public.guard_bill_request_write();

-- ---------------------------------------------------------------------------
-- Guard: bill_documents (owners can't change review status)
-- ---------------------------------------------------------------------------
create or replace function public.guard_bill_document_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_context() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is distinct from (select auth.uid()) or not public.owns_request(new.request_id) then
      raise exception 'Documents can only be attached to your own requests' using errcode = '42501';
    end if;
    new.status := 'uploaded';
    return new;
  end if;
  raise exception 'Document metadata cannot be edited; upload a new document instead' using errcode = '42501';
end;
$$;

create trigger bill_documents_guard_write
  before insert or update on public.bill_documents
  for each row execute function public.guard_bill_document_write();

-- ---------------------------------------------------------------------------
-- Reports: auto-flag a request once open reports reach the threshold
-- ---------------------------------------------------------------------------
create or replace function public.auto_flag_reported_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open integer;
begin
  select count(*) into v_open from public.reports where request_id = new.request_id and status = 'open';
  if v_open >= 3 then
    update public.bill_requests set is_flagged = true where id = new.request_id and not is_flagged;
    if found then
      insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
      values (null, 'auto_flag_request', 'bill_requests', new.request_id, jsonb_build_object('open_reports', v_open));
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_auto_flag
  after insert on public.reports
  for each row execute function public.auto_flag_reported_request();

-- =============================================================================
-- Client RPCs: simulated contributions
-- =============================================================================

-- Records a simulated contribution or an open commitment. No money moves.
create or replace function public.record_simulated_contribution(
  p_request_id uuid,
  p_amount numeric,
  p_kind public.contribution_kind default 'simulated',
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_request public.bill_requests%rowtype;
  v_amount numeric(14, 2);
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in to contribute' using errcode = '42501';
  end if;
  if not public.is_active_user(v_uid) then
    raise exception 'Suspended accounts cannot contribute' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Enter a positive amount with at most 2 decimals' using errcode = '22023';
  end if;
  v_amount := p_amount;

  select * into v_request from public.bill_requests where id = p_request_id for update;
  if not found or not public.is_request_discoverable(p_request_id) then
    raise exception 'This request is not accepting simulated contributions' using errcode = '42501';
  end if;
  if v_request.requester_id = v_uid then
    raise exception 'You cannot contribute to your own request' using errcode = '42501';
  end if;

  if p_kind = 'simulated' then
    if v_amount > v_request.amount - v_request.amount_raised then
      raise exception 'Amount exceeds the remaining balance' using errcode = '22023';
    end if;
    insert into public.contributions (request_id, donor_id, amount, currency, kind, status, message)
    values (p_request_id, v_uid, v_amount, v_request.currency, 'simulated', 'recorded', nullif(btrim(coalesce(p_message, '')), ''))
    returning id into v_id;

    update public.bill_requests
    set amount_raised = amount_raised + v_amount,
        supporters_count = supporters_count + 1,
        status = case when amount_raised + v_amount >= amount then 'completed'::public.request_status else status end
    where id = p_request_id;

    perform public.notify_user(
      v_request.requester_id,
      'New simulated contribution',
      format('Someone made a simulated contribution of %s %s to "%s". No real money moved.', v_amount, v_request.currency, v_request.title),
      '/dashboard/requester',
      'success'
    );
  else
    insert into public.contributions (request_id, donor_id, amount, currency, kind, status, message)
    values (p_request_id, v_uid, v_amount, v_request.currency, 'commitment', 'open', nullif(btrim(coalesce(p_message, '')), ''))
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

-- Fulfils or cancels the caller's own open commitment.
create or replace function public.set_commitment_status(p_contribution_id uuid, p_status public.contribution_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_c public.contributions%rowtype;
  v_request public.bill_requests%rowtype;
begin
  if p_status not in ('fulfilled', 'cancelled') then
    raise exception 'Commitments can only be fulfilled or cancelled' using errcode = '22023';
  end if;
  select * into v_c from public.contributions where id = p_contribution_id for update;
  if not found or v_c.donor_id is distinct from v_uid then
    raise exception 'Commitment not found' using errcode = '42501';
  end if;
  if v_c.kind <> 'commitment' or v_c.status <> 'open' then
    raise exception 'Only open commitments can be changed' using errcode = '22023';
  end if;

  if p_status = 'fulfilled' then
    select * into v_request from public.bill_requests where id = v_c.request_id for update;
    if not public.is_request_discoverable(v_c.request_id) then
      raise exception 'This request is no longer accepting simulated contributions' using errcode = '42501';
    end if;
    if v_c.amount > v_request.amount - v_request.amount_raised then
      raise exception 'Amount exceeds the remaining balance' using errcode = '22023';
    end if;
    update public.bill_requests
    set amount_raised = amount_raised + v_c.amount,
        supporters_count = supporters_count + 1,
        status = case when amount_raised + v_c.amount >= amount then 'completed'::public.request_status else status end
    where id = v_c.request_id;
  end if;

  update public.contributions set status = p_status where id = p_contribution_id;
end;
$$;

-- =============================================================================
-- Admin RPCs (each checks public.is_admin() and writes an audit entry)
-- =============================================================================

-- Records the three review checks for a request. Reviewers can't review their own request.
create or replace function public.admin_record_review(
  p_request_id uuid,
  p_identity public.review_check_status,
  p_document public.review_check_status,
  p_recipient public.review_check_status,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_id uuid;
begin
  if public.owns_request(p_request_id) then
    raise exception 'You cannot review your own request' using errcode = '42501';
  end if;
  if not exists (select 1 from public.bill_requests where id = p_request_id) then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  insert into public.verification_reviews (request_id, reviewer_id, identity_check, document_check, recipient_check, notes)
  values (p_request_id, v_admin, p_identity, p_document, p_recipient, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  perform public.record_audit_event(
    'record_review', 'bill_requests', p_request_id,
    jsonb_build_object('review_id', v_id, 'identity', p_identity, 'document', p_document, 'recipient', p_recipient)
  );
  return v_id;
end;
$$;

-- Approve, reject or request more information. Approval requires the latest review to have
-- all three checks passed, by a reviewer who is not the requester.
create or replace function public.admin_decide_request(
  p_request_id uuid,
  p_decision public.review_decision,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_request public.bill_requests%rowtype;
  v_review public.verification_reviews%rowtype;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  select * into v_request from public.bill_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if v_request.requester_id = v_admin then
    raise exception 'You cannot decide on your own request' using errcode = '42501';
  end if;
  if v_request.status not in ('pending_review', 'needs_info') then
    raise exception 'Only requests awaiting review can be decided (current status: %)', v_request.status using errcode = '22023';
  end if;

  if p_decision = 'approve' then
    select * into v_review from public.verification_reviews
    where request_id = p_request_id
    order by review_seq desc
    limit 1;
    if not found or v_review.identity_check <> 'passed' or v_review.document_check <> 'passed' or v_review.recipient_check <> 'passed' then
      raise exception 'Record a review with identity, document and recipient checks all passed before approving' using errcode = '22023';
    end if;
    update public.verification_reviews set decision = 'approve' where id = v_review.id;
    update public.bill_requests
    set status = 'active', verification_status = 'verified', moderator_message = null, published_at = coalesce(published_at, now())
    where id = p_request_id;
    perform public.notify_user(v_request.requester_id, 'Your request is live', format('"%s" was approved and is now visible to donors.', v_request.title), '/dashboard/requester', 'success');
  else
    if v_message is null or char_length(v_message) < 8 then
      raise exception 'Give the requester a reason of at least 8 characters' using errcode = '22023';
    end if;
    update public.bill_requests
    set status = case when p_decision = 'reject' then 'rejected'::public.request_status else 'needs_info'::public.request_status end,
        verification_status = case when p_decision = 'reject' then 'rejected'::public.verification_status else 'pending'::public.verification_status end,
        moderator_message = v_message
    where id = p_request_id;
    perform public.notify_user(
      v_request.requester_id,
      case when p_decision = 'reject' then 'Request not approved' else 'More information needed' end,
      format('"%s": %s', v_request.title, v_message),
      '/dashboard/requester',
      'warning'
    );
  end if;

  perform public.record_audit_event(
    'decide_request', 'bill_requests', p_request_id,
    jsonb_build_object('decision', p_decision, 'previous_status', v_request.status, 'message', v_message)
  );
end;
$$;

create or replace function public.admin_set_flag(p_request_id uuid, p_flagged boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  update public.bill_requests set is_flagged = p_flagged where id = p_request_id;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  perform public.record_audit_event(
    case when p_flagged then 'flag_request' else 'unflag_request' end, 'bill_requests', p_request_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

-- Suspend or reactivate a user. Admins can't change their own status.
create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  if p_user_id = v_admin then
    raise exception 'You cannot change your own account status' using errcode = '42501';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  perform public.record_audit_event(
    case when p_status = 'suspended' then 'suspend_user' else 'reactivate_user' end, 'profiles', p_user_id,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_request uuid;
begin
  if p_status = 'open' then
    raise exception 'Resolve or dismiss the report' using errcode = '22023';
  end if;
  update public.reports
  set status = p_status, resolved_by = v_admin, resolved_at = now(), resolution_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_report_id and status = 'open'
  returning request_id into v_request;
  if not found then
    raise exception 'Open report not found' using errcode = 'P0002';
  end if;
  perform public.record_audit_event(
    case when p_status = 'resolved' then 'resolve_report' else 'dismiss_report' end, 'reports', p_report_id,
    jsonb_build_object('request_id', v_request, 'note', p_note)
  );
end;
$$;

create or replace function public.admin_set_document_status(p_document_id uuid, p_status public.document_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_doc public.bill_documents%rowtype;
begin
  select * into v_doc from public.bill_documents where id = p_document_id for update;
  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
  if v_doc.owner_id = v_admin then
    raise exception 'You cannot review your own document' using errcode = '42501';
  end if;
  update public.bill_documents set status = p_status where id = p_document_id;
  perform public.record_audit_event('set_document_status', 'bill_documents', p_document_id, jsonb_build_object('status', p_status, 'request_id', v_doc.request_id));
end;
$$;
