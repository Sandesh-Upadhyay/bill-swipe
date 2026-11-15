# Google sign-in setup — BillSwipe

**Status:** the app code is ready, but Google is **not enabled** in the Supabase project yet (`external.google = false` in the project's public auth settings, checked 2026-11-15). Until it is, the "Continue with Google" button shows "Google sign-in isn't set up yet." No credentials are stored in this repository, and none should be.

## How the flow works

1. The user clicks **Continue with Google** → the `signInWithGoogleAction` Server Action asks Supabase for an authorization URL. The PKCE code verifier is stored in a cookie by `@supabase/ssr`.
2. The browser goes to Google, then back to **Supabase** (`https://<project-ref>.supabase.co/auth/v1/callback`).
3. Supabase redirects to the app's **`/auth/callback?code=…&next=…`**, which exchanges the code for a session.
4. **New users:** the `handle_new_user` trigger creates a profile from Google's `name`/`full_name`. The avatar URL is used only as a display fallback. The user then completes `/onboarding`.
5. **Existing users:** they sign straight in. The profile is never overwritten by later Google logins.
6. **Errors:** if the user cancels consent → `/login?error=oauth_cancelled`; any other failure → `/login?error=oauth_failed`. `next` is always sanitised to an internal path.

## 1. Google Cloud Console

1. Go to <https://console.cloud.google.com/> and create (or select) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**.
   - App name "BillSwipe", support email, and app logo (optional).
   - Authorized domains: `supabase.co` (Google redirects through Supabase), plus your own custom domain if you have one.
   - Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (the defaults).
   - Add test users while the app is in "Testing", or publish it.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://bill-swipe-five.vercel.app` (and any custom domain)
   - **Authorized redirect URIs:** exactly one, Supabase's callback:
     - `https://kqhebawqmtgdzjqddzps.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**. Keep the secret private: don't paste it into chat, code or `.env` files.

## 2. Supabase Dashboard

1. **Authentication → Sign In / Providers → Google**: enable, paste the Client ID and Client Secret, save.
2. **Authentication → URL Configuration → Redirect URLs**: make sure these are allowed (also listed in AUTHENTICATION_SETUP.md):
   - `http://localhost:3000/**`
   - `https://bill-swipe-five.vercel.app/**`
3. Set **Site URL** to your production URL.

## 3. App configuration

- No app code or env changes are needed for Google beyond what's already set.
- In production, set `NEXT_PUBLIC_SITE_URL` so the `redirectTo` is always your canonical domain.
- The app checks Supabase's public settings at most every 5 minutes, so the button starts working shortly after you enable the provider.

## 4. Verify

1. `http://localhost:3000/login` → **Continue with Google** → Google consent → back on BillSwipe.
2. First time: you land on `/onboarding`; afterwards, straight to Discover or `next`.
3. Profile shows your Google name; your Google photo shows if you haven't uploaded one.
4. Cancel on the Google consent screen → "Google sign-in was cancelled."

Google sign-in has **not** been tested end to end. That needs the credentials above, and only you should create and enter them.
