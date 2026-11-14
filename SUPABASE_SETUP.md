# Supabase setup — BillSwipe v2.0, Phase 1

Phase 1 adds the Supabase **backend foundation** only: database schema, security, storage, server functions, seed data and tests. The app's screens still run on the existing demo data (Zustand + LocalStorage) and work exactly as before, with or without Supabase configured. Wiring screens to Supabase is Phase 2.

Related docs: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [SECURITY.md](SECURITY.md)

---

## 1. What exists today (preserved in Phase 1)

| Area | Current implementation |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack), React 19, TypeScript, Tailwind v4 |
| Routes (30) | `/`, `/how-it-works`, `/explore`, `/mission`, `/faq`, `/contact`, `/login`, `/signup`, `/forgot-password`, `/onboarding`, `/discover`, `/requests/[id]`, `/submit`, `/saved`, `/dashboard`, `/dashboard/donor`, `/dashboard/requester`, `/profile`, `/admin` + `analytics`, `audit`, `categories`, `donations`, `reports`, `requests`, `settings`, `users`, `verification` |
| State | Zustand stores in `src/store/`: auth, requests (+reports, activity), swipes, saved (+blocked), contributions, notifications, preferences, admin (users, categories, settings, moderation log, checks, notes), submit drafts, hydration |
| Persistence | LocalStorage keys `billswipe:v1:*` (via `src/store/persist.ts`) |
| Mock data | `src/lib/data/` — requests, users, breakdowns, document metadata, content |
| Features to keep | Swipe deck with undo/save/story sheet, filters, request details + breakdown, 7-step submission with drafts, donor/requester dashboards, role switching, simulated contributions/commitments, report/block, admin verification workflow (checks, notes, risk flags, duplicates, audit log), regional formats |

## 2. Migration plan

| Phase | Scope |
|---|---|
| **1 (this)** | Schema, RLS, grants, storage, server functions, dev seed, tests, docs. Supabase clients + session-refresh proxy that are **inactive until configured**. No UI changes. |
| 2 | Supabase Auth (email sign-in/sign-up) replacing demo auth; profiles + role switching (`active_mode`) backed by the database; route protection in `src/proxy.ts`. |
| 3 | Data layer: requests, discovery, swipes, saved, contributions (via RPCs) and notifications read from Supabase, replacing the matching Zustand stores one at a time. |
| 4 | Document upload to the private bucket + reviewer previews via signed URLs; admin panel on the admin RPCs and `admin_audit_logs`. |
| 5 | Remove demo-only stores/mock data from production builds; keep the seed for local development. |

Each phase keeps the app working: a store is only removed once its Supabase replacement is tested.

## 3. Files added in Phase 1

```
.env.example
src/proxy.ts                         Next.js 16 Proxy → refreshes the Supabase session
src/lib/supabase/env.ts              public config + isSupabaseConfigured
src/lib/supabase/client.ts           browser client (publishable key)
src/lib/supabase/server.ts           server client (cookies, server-only)
src/lib/supabase/proxy.ts            updateSession() used by src/proxy.ts
src/lib/supabase/documents.ts        signed-URL + file validation helpers (server-only)
supabase/config.toml                 local stack config (supabase init)
supabase/migrations/20261114000001_core_schema.sql
supabase/migrations/20261114000002_functions.sql
supabase/migrations/20261114000003_rls_and_grants.sql
supabase/migrations/20261114000004_storage.sql
supabase/seed.sql                    fictional dev data (local only)
supabase/tests/database/*.test.sql   pgTAP tests (+ _helpers.psql)
scripts/db-test/                     Docker-free test runner (PGlite)
```

## 4. Create and configure a Supabase project (manual)

1. Create a project at <https://supabase.com/dashboard> (Postgres 17).
2. Copy `.env.example` to `.env.local` and fill in, from **Project Settings → API Keys / Data API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_…` key)

   Never put the secret / service-role key in `.env.local` for the browser or in any `NEXT_PUBLIC_` variable. Phase 1 doesn't need it.
3. Add the same two variables to Vercel (**Project → Settings → Environment Variables**) when you're ready for Phase 2. Until then, leaving them unset keeps the deployed app exactly as it is.
4. **Auth settings** (Dashboard → Authentication): keep email confirmation on, and set the Site URL and redirect URLs to your domain(s).

## 5. Apply the migrations (review first; nothing is applied automatically)

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --dry-run        # review exactly what will run
supabase db push                  # applies supabase/migrations only (not seed.sql)
```

`supabase db push` never runs `seed.sql` unless you pass `--include-seed`. Don't pass it for production.

After pushing, grant your first admin from the **SQL Editor** (runs as the database owner, which is the only way to grant admin):

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@yourdomain.com');
```

## 6. Local development (Docker)

```bash
supabase start          # local Postgres, Auth, Storage, Studio
supabase db reset       # applies all migrations + seed.sql (fictional demo data)
```

Local demo sign-ins are listed at the top of `supabase/seed.sql` (local stack only). The seed refuses to run on a database containing any non-demo account.

## 7. Tests

```bash
pnpm db:test            # = supabase test db  (needs the local stack running)
pnpm db:test:local      # Docker-free: PGlite + Supabase shim, same test files
```

`pnpm db:test:local` boots Postgres in WebAssembly, loads a minimal shim of Supabase's `auth`/`storage` schemas and API roles (`scripts/db-test/supabase-shim.sql`), applies every migration and the seed, then runs `supabase/tests/database/*.test.sql`. It exercises real RLS by switching to the `anon` and `authenticated` roles with JWT claims. Differences from a real stack:

- Storage file-size and MIME limits are enforced by the Storage API (from bucket settings), so they're checked as bucket configuration, not by uploading files.
- The shim implements a subset of pgTAP (`plan`, `ok`, `is`, `isnt`, `throws_ok`, `lives_ok`, `finish`); the tests use only these, so they run unchanged under real pgTAP.

## 8. Generate TypeScript types (after linking)

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Then pass `Database` as the generic to `createBrowserClient` / `createServerClient` in Phase 2.
