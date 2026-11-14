# Security model — BillSwipe v2.0, Phase 1

## Principles

1. **The database enforces access.** The browser uses only the publishable key; what it can read or write is decided by table grants plus Row Level Security (RLS). Client-side checks are for UX only.
2. **Never trust client-supplied roles.** Admin rights come from `profiles.is_admin`, read inside the database by `public.is_admin()`. No function accepts an admin identity or role as input. The actor for every audited action is `auth.uid()`.
3. **Trusted changes only through server functions.** Moderation, verification, funding progress, account status and audit entries can only change inside `SECURITY DEFINER` functions, which re-check the caller.
4. **Private by default.** Bill documents and their metadata are never public. Previews use short-lived signed URLs.
5. **No real money.** Contributions are simulated, enforced by a CHECK constraint (`is_simulated` must be true).

## Keys

| Key | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server | Safe to expose; RLS applies. |
| Secret / service-role key | **Not used in Phase 1** | Bypasses RLS. If ever needed, server-only env var, never `NEXT_PUBLIC_`, never committed. `.env*` files are git-ignored except `.env.example`. |

## Layer 1 — grants

Migration 3 revokes Supabase's default broad privileges from `anon`/`authenticated` on every table, function and sequence (including future ones via default privileges), then grants back only what's needed:

- **Column-level grants** limit writes: e.g. users may update only `display_name, bio, country_code, avatar_path, active_mode, onboarded` on their profile, so `is_admin` and `status` can't even be attempted. Request inserts/updates exclude funding, moderation, verification and `is_demo` columns.
- `profiles.is_admin` isn't readable by API roles at all (use the `is_admin()` RPC).
- `contributions`, `verification_reviews`, `admin_audit_logs`: read-only to clients; writes happen via functions.
- Internal functions (`record_audit_event`, `notify_user`, …) aren't executable by API roles.

## Layer 2 — RLS policies (one per operation)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| profiles | own, admin, or authors of discoverable requests (anon: limited columns, public authors only) | none (trigger creates) | own (permitted columns) | none |
| bill_requests | discoverable (anon/auth), own, admin | own; status draft/pending only | own (guard trigger limits changes) | own, unpublished only |
| bill_documents | owner, admin | owner, own request only | none | owner, while unreviewed |
| swipes | own | own, discoverable, not own request | none | own (undo) |
| saved_requests | own | own, discoverable | none | own |
| contributions | donor, request owner, admin | none (RPC) | none (RPC) | none |
| verification_reviews | admin | none (RPC) | none (RPC) | none |
| notifications | own | none (server functions) | own (`read_at` only) | own |
| reports | reporter, admin | own, open, not own request | none (RPC) | none |
| admin_audit_logs | admin | none (functions) | none (append-only trigger) | none |
| bill_partners | active (or admin) | admin | admin | admin |

"Discoverable" = `status = active` and `verification_status = verified` and not flagged and the requester isn't suspended.

## Layer 3 — guard triggers

Even within what grants and RLS allow, triggers block privileged changes from the `anon`/`authenticated` roles:

- **profiles:** `is_admin`, `status`, `id`, `created_at` can't change.
- **bill_requests:**
  - New requests are forced to `pending` verification, zero funding, unflagged, `is_demo = false`.
  - Owners can't change status except to submit, resubmit or withdraw.
  - Any content edit sends the request back to `pending_review`.
  - Completed, rejected and withdrawn requests are locked.
- **bill_documents:** new metadata is forced to `uploaded`; existing metadata can't be edited.
- **verification_reviews:** a reviewer can never review their own request (also checked in every admin function).
- **admin_audit_logs:** UPDATE and DELETE always fail, for everyone.

Trusted context is detected with `current_user`: inside a `SECURITY DEFINER` function (owned by `postgres`), or for the service role, the guards step aside.

## SECURITY DEFINER practices

Every definer function:
- sets `search_path = ''` and schema-qualifies every object
- derives the actor from `auth.uid()`
- starts by checking authorization (`require_admin()` or ownership)
- validates inputs (amount precision, allowed statuses, required reasons)

Execute privileges are granted explicitly per function.

## Admin access

- Granted only by the database owner (SQL Editor or a migration): `update public.profiles set is_admin = true where id = …`. Users can't grant it: there's no column grant, and the guard trigger and RLS would block it anyway. Sign-up metadata is ignored.
- Suspended admins lose admin rights immediately (`is_admin()` requires `status = 'active'`).
- Admins can't review or decide their own requests, review their own documents, or change their own account status.
- Server code checks admin rights with `currentUserIsAdmin()` (`src/lib/supabase/documents.ts`), which calls the `is_admin` RPC; it never trusts client state.

## Storage

| Bucket | Public | Limit | Types | Write | Read |
|---|---|---|---|---|---|
| `bill-documents` | **No** | 10 MB | PDF, PNG, JPEG, WebP | owner, into `{uid}/{own request id}/` only | owner; admins via `is_admin()` |
| `verification-evidence` | **No** | 10 MB | PDF, images | admins | admins |
| `avatars` | Yes | 2 MB | PNG, JPEG, WebP | owner, own folder | everyone |

- Bill documents can't be overwritten (no UPDATE policy). Upload a new file instead.
- Previews must use `createBillDocumentSignedUrl()` (60-second signed URLs). Never `getPublicUrl()` for financial documents.
- Size and MIME limits are enforced by the Storage API from the bucket settings. Policies additionally check file extensions and folder ownership. `validateBillDocument()` gives users early feedback.

## Testing

`supabase/tests/database/` holds 121 assertions in 5 files:
- unauthorised access as anon and as other users
- ownership
- column-grant and guard-trigger bypass attempts
- admin authorisation and self-review prevention
- the verification workflow
- the append-only audit log
- simulated-contribution rules
- duplicate swipe prevention
- private storage access

Run them with `pnpm db:test` (local Supabase) or `pnpm db:test:local` (no Docker). See SUPABASE_SETUP.md.

## Known limits (to address in later phases)

- **Rate limiting:** no rate limiting on reports, swipes or sign-ups beyond Supabase defaults.
- **Duplicate detection:** document hashes (`sha256`) are stored if the client provides them; server-side hashing and duplicate detection come in Phase 4.
- **Realtime:** not enabled for any table. If enabled later, its authorization follows RLS and should be reviewed then.
