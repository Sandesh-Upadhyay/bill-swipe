# Database schema — BillSwipe v2.0

Source of truth: `supabase/migrations/`. This document summarises it.

## Conventions

- **Primary keys:** `uuid` (`gen_random_uuid()`), except `profiles.id`, which equals `auth.users.id`.
- **Timestamps:** every table has `created_at` and `updated_at` (`timestamptz`); `updated_at` is maintained by the `set_updated_at` trigger.
- **Money:** `numeric(14,2)` only (domain `money_amount`, which must be > 0). Every amount sits next to an ISO 4217 `currency` (domain `currency_code`: USD, GBP, CAD, AUD, INR, AED, EUR). Amounts in different currencies are never summed; progress is always in the request's own currency. There are no floating-point columns.
- **Countries:** domain `country_code` (ISO 3166-1 alpha-2: US, GB, CA, AU, IN, AE, DE, FR).
- **Demo data:** `is_demo` on `bill_requests` and `bill_partners` is true only for the development seed. Real submissions can't set it.

## Enums

| Type | Values |
|---|---|
| `user_mode` | donor, requester |
| `account_status` | active, suspended |
| `bill_category` | medical, education, rent, electricity, water, emergency, other |
| `request_status` | draft, pending_review, needs_info, active, completed, rejected, withdrawn |
| `verification_status` | unverified, pending, verified, rejected |
| `review_check_status` | pending, passed, failed |
| `review_decision` | approve, reject, request_info |
| `document_status` | uploaded, under_review, accepted, rejected |
| `swipe_direction` | left, right |
| `contribution_kind` / `contribution_status` | simulated, commitment / recorded, open, fulfilled, cancelled |
| `report_reason` / `report_status` | suspicious, duplicate, inappropriate, misleading, other / open, resolved, dismissed |
| `notification_tone` | default, success, warning |

## Tables

### 1. `profiles`
One per auth user, created by the `on_auth_user_created` trigger.
`display_name` (1–80), `bio` (≤500), `country_code`, `avatar_path`, `active_mode` (user-switchable donor/requester), `onboarded`, **`is_admin`** (trusted), **`status`** (trusted).

### 2. `bill_requests`
`requester_id → profiles`, `title` (8–80), `summary` (30–220), `story` (120–2500), `category`, `amount` + `currency`, `amount_raised` (simulated, 0 ≤ raised ≤ amount), `supporters_count`, `country_code`, `city`, `due_date`, `breakdown` (jsonb array ≤ 8 lines; trigger checks labels and that the amounts sum exactly to `amount`), `status`, `verification_status`, `is_flagged`, `moderator_message`, `is_demo`, `published_at`.
Constraint: `verified` is only possible while active/completed/withdrawn.
Indexes: requester + created_at; partial discovery index (active, verified, unflagged); partial review-queue index; category + country.

### 3. `bill_documents`
Private metadata for files in the `bill-documents` bucket. `request_id`, `owner_id`, `storage_path` (unique; must be `{owner_id}/{request_id}/{file}`), `file_name`, `mime_type` (PDF/PNG/JPEG/WebP), `size_bytes` (1 B–10 MB), `sha256` (optional, for duplicate detection), `status`.

### 4. `swipes`
`user_id`, `request_id`, `direction`. **Unique (user_id, request_id)** prevents duplicate swipes; undo deletes the row.

### 5. `saved_requests`
`user_id`, `request_id`, unique per pair.

### 6. `contributions` (simulated only)
`request_id`, `donor_id`, `amount` + `currency` (trigger: must equal the request's currency), `kind`, `status` (kind/status pairs constrained), `message` (≤280), `is_simulated` (CHECK: must be true; no real payments in Phase 1). Written only by `record_simulated_contribution()` / `set_commitment_status()`.

### 7. `verification_reviews`
`request_id`, `reviewer_id`, `identity_check`, `document_check`, `recipient_check`, `decision`, internal `notes`, `review_seq` (strictly increasing, defines "latest review"). CHECK: `approve` requires all three checks passed. Trigger: reviewer ≠ requester.

### 8. `notifications`
`user_id`, `title`, `body`, `href` (relative paths only), `tone`, `read_at`. Created by server functions.

### 9. `reports`
`request_id`, `reporter_id`, `reason`, `details`, `status`, `resolved_by`, `resolved_at`, `resolution_note`. Partial unique index: one **open** report per reporter per request. Three open reports auto-flag the request.

### 10. `admin_audit_logs` (append-only)
`actor_id` (always `auth.uid()` of the caller, set server-side), `action`, `target_table`, `target_id`, `details` (jsonb object). A trigger blocks every UPDATE and DELETE, even by the owner.

### 11. `bill_partners`
Billers/utilities for future direct-to-biller payments: `name`, `category`, `country_code`, `website_url` (https only), `is_active`, `is_demo`. Unique (name, country).

## Relationships

```
auth.users 1─1 profiles
profiles 1─* bill_requests ─┬─* bill_documents
                            ├─* swipes            (*─1 profiles)
                            ├─* saved_requests    (*─1 profiles)
                            ├─* contributions     (*─1 profiles as donor)
                            ├─* verification_reviews (*─1 profiles as reviewer)
                            └─* reports           (*─1 profiles as reporter / resolver)
profiles 1─* notifications
profiles 1─* admin_audit_logs (actor)
```

Deleting a user cascades to their profile, requests and personal rows. Requests with contributions can't be deleted (`on delete restrict`), and reviewers can't be deleted while their reviews exist.

## Functions

| Function | Who can call | Purpose |
|---|---|---|
| `is_admin()` | anon, authenticated | Trusted admin check (reads `profiles.is_admin` and `status`) |
| `is_request_discoverable(id)`, `is_active_user(id)`, `owns_request(id)`, `is_public_requester(id)`, `is_trusted_context()` | anon, authenticated | Boolean helpers used by policies and guards |
| `record_simulated_contribution(request, amount, kind, message)` | authenticated | Simulated contribution / commitment; updates progress atomically |
| `set_commitment_status(id, fulfilled\|cancelled)` | authenticated (owner) | Fulfil or cancel an open commitment |
| `admin_record_review(...)`, `admin_decide_request(...)`, `admin_set_flag(...)`, `admin_set_user_status(...)`, `admin_resolve_report(...)`, `admin_set_document_status(...)` | authenticated (checked: admin) | Moderation actions; each writes an audit entry |
| `record_audit_event`, `notify_user`, `require_admin`, `handle_new_user`, trigger functions | none (internal) | Called only from the functions above |

## Request status flow

```
draft ──submit──▶ pending_review ◀──resubmit── needs_info
                     │   ▲                        ▲
     admin_decide:   │   └── owner edits ─────────┤ (edits send live requests back to review)
       approve ──────┼──▶ active ──(simulated goal reached)──▶ completed
       request_info ─┼──▶ needs_info
       reject ───────┴──▶ rejected
owner: withdraw from any non-final status ──▶ withdrawn
```
Approval requires the latest review (by `review_seq`) to have identity, document and recipient all **passed**. Nothing is ever verified automatically.
