# Authentication setup — BillSwipe v2.0, Phase 2

Real accounts use **Supabase Auth** with secure, httpOnly-capable cookies managed by `@supabase/ssr`. The demo profiles still work, side by side, and are clearly separated (see "Demo mode" below).

Related: [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) · [SUPABASE_SETUP.md](SUPABASE_SETUP.md) · [SECURITY.md](SECURITY.md)

---

## 1. How it works

| Flow | Where | Notes |
|---|---|---|
| Sign up | `signUpAction` (Server Action) | Full name, email, password + confirm, country, terms. Server re-validates. Sends a confirmation email. |
| Email confirmation | `/auth/callback` (code) or `/auth/confirm` (token hash) | Creates the session, then sends new users to `/onboarding`. |
| Resend confirmation | `/check-email`, login error banner | 60-second cooldown in the UI; never reveals whether an email exists. |
| Log in | `signInAction` | Email + password, "Keep me signed in". Suspended accounts are signed out with a message. |
| Remember me | `bs_remember` cookie | Off → Supabase auth cookies become browser-session cookies (deleted when the browser closes). |
| Log out | `signOutAction` | Clears Supabase cookies and the remember preference. |
| Forgot / reset password | `requestPasswordResetAction` → email → `/auth/callback` → `/reset-password` → `updatePasswordAction` | Neutral "if an account exists" message. |
| Google | `signInWithGoogleAction` → Google → `/auth/callback` | See GOOGLE_OAUTH_SETUP.md. Shows "not set up yet" if the provider is disabled. |
| Session refresh | `src/proxy.ts` | Refreshes tokens on every request (`getClaims()`). |
| Expired session | proxy + `RouteGuard` | Auth cookie present but invalid → `/login?reason=expired&next=…`. |
| Route protection | `RouteGuard` in each protected layout | Server-side: verifies the JWT and reads `profiles.status` and `is_admin()` from the database. |

Protected routes: `/dashboard/*`, `/discover`, `/submit`, `/profile`, `/saved`, `/notifications`, `/admin/*` (admin also requires `is_admin()`), `/onboarding`. Public: home, marketing pages, `/explore`, `/requests/[id]`, auth pages.

### Profiles
- Created by the `handle_new_user` trigger on sign-up (email or Google). It is **idempotent** (`on conflict do nothing`) and never overwrites an existing profile on later logins.
- Editable by the owner: name, bio, country, preferred currency, avatar (stored in the public `avatars` bucket under the user's own folder), donor/requester mode, onboarding flag.
- Not editable by users: `is_admin`, `status`, `terms_accepted_at`, `created_at` (column grants + guard trigger).
- No username: the schema has no username column, and display names are enough for this phase.

### Donor and requester
One account can do both. `profiles.active_mode` is only the experience currently shown; no database rule restricts actions by it. Switching (account menu or Profile) saves the preference and keeps saved requests, activity and profile untouched. **Admin is a separate privilege** (`profiles.is_admin`), never derived from mode, sign-up data, URL parameters or client state.

### Demo mode
- Demo profiles (one-click buttons on the login page) keep fictional data in this browser only. A `bs_demo` cookie lets demo pages render; it grants nothing else on the server.
- A real session always wins: signing in to a real account clears the demo session, and choosing a demo profile signs the real account out first.
- Real-account sessions store only display info in LocalStorage (no email, no tokens). Tokens live in Supabase's cookies.
- The demo admin console at `/admin` is reachable only in demo mode and only manages fictional browser data. Real accounts need `is_admin()`.

---

## 2. Required Supabase Dashboard settings (manual)

**Authentication → URL Configuration**
- **Site URL:** your production URL, e.g. `https://bill-swipe-five.vercel.app`
- **Redirect URLs** (allow-list), add all that apply:
  - `http://localhost:3000/**`
  - `http://localhost:3001/**`
  - `https://bill-swipe-five.vercel.app/**`
  - your preview domain pattern, e.g. `https://*-your-team.vercel.app/**`

**Authentication → Sign In / Providers → Email**
- Enable email sign-ups. Keep **Confirm email** ON (it is ON for this project).
- Minimum password length: **8**, and require letters + digits, to match the app's validation.

**Authentication → Emails → SMTP Settings**
- The built-in email service is for testing only: it sends to your project's team members only and is heavily rate-limited. Configure a custom SMTP provider (e.g. Resend, Postmark, SES) before real users sign up, or confirmation and reset emails won't reach them.

**Authentication → Emails → Templates** (recommended)
- The default templates work with `/auth/callback`, but only when the link is opened in the same browser that requested it (PKCE).
- To make links work in any browser, change the templates to use `/auth/confirm`:
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

**Vercel → Environment Variables** (when you're ready to switch the live site to real accounts)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL=https://bill-swipe-five.vercel.app`
- Never add the secret key as a `NEXT_PUBLIC_` variable.

**Database:** apply `supabase/migrations/20261120000001_auth_profiles.sql` (see SUPABASE_SETUP.md). It adds `preferred_currency` and `terms_accepted_at` and makes profile creation idempotent and Google-aware.

---

## 3. Manual test checklist (needs a real inbox)

These need a real email account, so run them yourself on `http://localhost:3000` (with `.env.local`) after the steps above:

1. **Sign up** with your email → you land on "Confirm your email".
2. **Sign up again** with the same email → same neutral screen (no "already registered" leak).
3. **Confirmation email** → click the link → `/onboarding` → choose a mode → you land on Discover or the requester dashboard.
4. **Log out** (account menu) → protected pages redirect to `/login?next=…`.
5. **Log in** with a wrong password → "Incorrect email or password." Then the right password → back to where you were going.
6. **Remember me:** log in with it unticked, close the browser completely, reopen → you're signed out. Ticked → you stay signed in.
7. **Forgot password** → email link → choose a new password → signed in. Reusing the link → "expired".
8. **Profile:** change name, country, preferred currency and bio; upload an avatar → reload → changes persist.
9. **Mode switching:** switch donor ↔ requester from the account menu → saved requests stay; reload → mode persists.
10. **Admin:** visit `/admin` as a normal account → "Administrators only". Grant admin in SQL (SUPABASE_SETUP.md) → reload → admin panel.
11. **Suspension:** in SQL, `select public.admin_set_user_status('<user id>', 'suspended', 'test');` as another admin (or `update public.profiles set status='suspended' …` in the SQL editor) → protected pages show "This account is suspended", and logging in is refused.
12. **Session expiry:** delete the `sb-…-auth-token` cookies in DevTools → reload a protected page → "Your session expired".
