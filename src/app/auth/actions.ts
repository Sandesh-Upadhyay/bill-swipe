"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_COOKIE, REMEMBER_COOKIE } from "@/lib/auth/cookies";
import { authErrorMessage } from "@/lib/auth/errors";
import { PROFILE_COLUMNS, toAuthProfile, type AuthProfile, type ProfileRow } from "@/lib/auth/profile";
import { safeNextPath } from "@/lib/auth/redirects";
import { authCallbackUrl } from "@/lib/auth/site-url";
import {
  emailSchema,
  isValidAvatarPath,
  loginSchema,
  modeSchema,
  onboardingSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
  type LoginInput,
  type OnboardingInput,
  type ProfileInput,
  type ResetPasswordInput,
  type SignupInput,
} from "@/lib/auth/validation";

/*
 * Server Actions for Supabase authentication and profile management.
 *
 * Rules followed everywhere below:
 *  - Inputs are re-validated with zod on the server.
 *  - The acting user is always taken from the verified session (getClaims), never from input.
 *  - Profile writes go through RLS (the user can only update their own row and permitted columns).
 *  - Messages never reveal whether an email is registered (sign-up, resend, reset).
 *  - Passwords, tokens and session values are never logged or returned.
 */

export type ActionFailure = { ok: false; error: string; field?: string; code?: string };
export type ActionResult<T = object> = ({ ok: true } & T) | ActionFailure;

const NOT_CONFIGURED: ActionFailure = { ok: false, error: "Accounts aren't available yet. Try the demo instead.", code: "not_configured" };

function firstIssue(issues: { path: PropertyKey[]; message: string }[]) {
  const i = issues[0];
  return { ok: false as const, error: i?.message ?? "Please check the form.", field: i?.path?.[0]?.toString() };
}

async function clearDemoCookie() {
  (await cookies()).delete(DEMO_COOKIE);
}

/** Loads the signed-in user's profile (RLS: own row) plus the trusted admin flag. */
async function loadProfile(supabase: Awaited<ReturnType<typeof createClient>>): Promise<AuthProfile | null> {
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;
  const [{ data: row }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", claims.sub).maybeSingle<ProfileRow>(),
    supabase.rpc("is_admin"),
  ]);
  if (!row) return null;
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  return toAuthProfile(row, { email: typeof claims.email === "string" ? claims.email : null, isAdmin: isAdmin === true, providerAvatar: meta.avatar_url });
}

function landingFor(profile: AuthProfile, next: string | undefined) {
  if (!profile.onboarded) return `/onboarding?next=${encodeURIComponent(safeNextPath(next))}`;
  const fallback = profile.mode === "requester" ? "/dashboard/requester" : "/discover";
  return safeNextPath(next, fallback);
}

// ---------------------------------------------------------------------------
// Sign up / sign in / sign out
// ---------------------------------------------------------------------------

export async function signUpAction(input: SignupInput): Promise<ActionResult<{ next: string; needsConfirmation: boolean; profile?: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const v = parsed.data;

  const supabase = await createClient({ remember: true });
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: await authCallbackUrl("/onboarding"),
      // Only harmless profile fields. The database ignores anything role/admin related.
      data: { display_name: v.name, country_code: v.country, terms_accepted: "true" },
    },
  });
  if (error) {
    const field = error.code === "weak_password" ? "password" : error.code === "email_address_invalid" ? "email" : undefined;
    return { ok: false, error: authErrorMessage(error), field, code: error.code };
  }
  await clearDemoCookie();

  // Email confirmation off: signed in immediately.
  if (data.session) {
    const profile = await loadProfile(supabase);
    return { ok: true, needsConfirmation: false, next: profile ? landingFor(profile, v.next) : "/onboarding", profile: profile ?? undefined };
  }
  // Confirmation on. If the email was already registered Supabase returns a user with no
  // identities; we deliberately show the same "check your email" screen (no account enumeration).
  return { ok: true, needsConfirmation: true, next: "/check-email" };
}

export async function signInAction(input: LoginInput): Promise<ActionResult<{ next: string; profile: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const v = parsed.data;

  const cookieStore = await cookies();
  const supabase = await createClient({ remember: v.remember });
  const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
  if (error) return { ok: false, error: authErrorMessage(error, "Couldn't log you in. Please try again."), code: error.code };

  // Remember the choice so session refreshes keep the same cookie lifetime.
  cookieStore.set(REMEMBER_COOKIE, v.remember ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(v.remember ? { maxAge: 60 * 60 * 24 * 400 } : {}),
  });
  await clearDemoCookie();

  const profile = await loadProfile(supabase);
  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "We couldn't load your profile. Please try again." };
  }
  if (profile.status === "suspended") {
    await supabase.auth.signOut();
    return { ok: false, error: "This account has been suspended. Contact support if you think this is a mistake.", code: "suspended" };
  }
  return { ok: true, profile, next: landingFor(profile, v.next) };
}

export async function signOutAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(REMEMBER_COOKIE);
  return { ok: true };
}

/**
 * Whether the Google provider is enabled in the Supabase project (public auth settings endpoint).
 * Cached briefly so enabling Google in the dashboard takes effect without a redeploy.
 */
async function isGoogleEnabled() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) return true; // Unknown: let Supabase decide and report.
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return true;
  }
}

/** Starts Google OAuth. On success the browser is redirected to Google. */
export async function signInWithGoogleAction(nextRaw?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (!(await isGoogleEnabled())) {
    return { ok: false, error: "Google sign-in isn't set up yet. Please use email and password for now.", code: "provider_disabled" };
  }
  const supabase = await createClient({ remember: true });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await authCallbackUrl(safeNextPath(nextRaw)) },
  });
  if (error || !data?.url) return { ok: false, error: authErrorMessage(error, "Google sign-in isn't available right now."), code: error?.code };
  await clearDemoCookie();
  redirect(data.url);
}

// ---------------------------------------------------------------------------
// Email confirmation and password recovery
// ---------------------------------------------------------------------------

export async function resendConfirmationAction(emailRaw: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address", field: "email" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: await authCallbackUrl("/onboarding") },
  });
  // Only surface rate limits / config problems; never whether the address exists.
  if (error && (error.status === 429 || error.code?.startsWith("over_") || error.code === "email_address_not_authorized")) {
    return { ok: false, error: authErrorMessage(error), code: error.code };
  }
  return { ok: true };
}

export async function requestPasswordResetAction(emailRaw: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = emailSchema.safeParse(emailRaw);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address", field: "email" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: await authCallbackUrl("/reset-password") });
  if (error && (error.status === 429 || error.code?.startsWith("over_") || error.code === "email_address_not_authorized")) {
    return { ok: false, error: authErrorMessage(error), code: error.code };
  }
  return { ok: true };
}

/** Sets a new password. Requires the recovery session created by the emailed link. */
export async function updatePasswordAction(input: ResetPasswordInput): Promise<ActionResult<{ next: string }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { ok: false, error: "Your reset link has expired or was already used. Request a new one.", code: "session_missing" };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error), field: error.code === "weak_password" || error.code === "same_password" ? "password" : undefined, code: error.code };
  const profile = await loadProfile(supabase);
  return { ok: true, next: profile ? landingFor(profile, undefined) : "/discover" };
}

// ---------------------------------------------------------------------------
// Profile (RLS restricts every update to the caller's own row and permitted columns)
// ---------------------------------------------------------------------------

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

const SESSION_EXPIRED: ActionFailure = { ok: false, error: "Your session has expired. Please log in again.", code: "session_expired" };

export async function getMyProfileAction(): Promise<ActionResult<{ profile: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const profile = await loadProfile(supabase);
  return profile ? { ok: true, profile } : SESSION_EXPIRED;
}

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult<{ profile: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const supabase = await createClient();
  const uid = await requireUserId(supabase);
  if (!uid) return SESSION_EXPIRED;
  const v = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: v.name, bio: v.bio, country_code: v.country, preferred_currency: v.preferredCurrency })
    .eq("id", uid);
  if (error) return { ok: false, error: "Couldn't save your profile. Please try again." };
  const profile = await loadProfile(supabase);
  return profile ? { ok: true, profile } : SESSION_EXPIRED;
}

export async function setActiveModeAction(modeRaw: string): Promise<ActionResult<{ profile: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = modeSchema.safeParse(modeRaw);
  if (!parsed.success) return { ok: false, error: "Choose donor or requester." };
  const supabase = await createClient();
  const uid = await requireUserId(supabase);
  if (!uid) return SESSION_EXPIRED;
  const { error } = await supabase.from("profiles").update({ active_mode: parsed.data }).eq("id", uid);
  if (error) return { ok: false, error: "Couldn't switch experience. Please try again." };
  const profile = await loadProfile(supabase);
  return profile ? { ok: true, profile } : SESSION_EXPIRED;
}

export async function completeOnboardingAction(input: OnboardingInput, nextRaw?: string): Promise<ActionResult<{ profile: AuthProfile; next: string }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error.issues);
  const supabase = await createClient();
  const uid = await requireUserId(supabase);
  if (!uid) return SESSION_EXPIRED;
  const v = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ active_mode: v.mode, display_name: v.name, country_code: v.country, bio: v.bio, onboarded: true })
    .eq("id", uid);
  if (error) return { ok: false, error: "Couldn't save your details. Please try again." };
  const profile = await loadProfile(supabase);
  if (!profile) return SESSION_EXPIRED;
  const home = v.mode === "requester" ? "/dashboard/requester" : "/discover";
  const next = safeNextPath(nextRaw, home);
  // Sign-up links carry next=/onboarding; once onboarding is done, don't send the user back to it.
  return { ok: true, profile, next: next === "/onboarding" || next.startsWith("/onboarding?") || next.startsWith("/onboarding/") ? home : next };
}

/** Saves an avatar path after the browser uploaded it to the user's own avatars folder. */
export async function saveAvatarAction(path: string | null): Promise<ActionResult<{ profile: AuthProfile }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const uid = await requireUserId(supabase);
  if (!uid) return SESSION_EXPIRED;
  if (path !== null && !isValidAvatarPath(path, uid)) return { ok: false, error: "That image location isn't allowed." };
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
  if (error) return { ok: false, error: "Couldn't update your photo. Please try again." };
  const profile = await loadProfile(supabase);
  return profile ? { ok: true, profile } : SESSION_EXPIRED;
}

// ---------------------------------------------------------------------------
// Notifications (own rows only, via RLS)
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  tone: "default" | "success" | "warning";
  read: boolean;
  createdAt: string;
}

export async function listNotificationsAction(): Promise<ActionResult<{ items: NotificationItem[] }>> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  if (!(await requireUserId(supabase))) return SESSION_EXPIRED;
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, href, tone, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { ok: false, error: "Couldn't load notifications." };
  return {
    ok: true,
    items: (data ?? []).map((n) => ({
      id: n.id as string,
      title: n.title as string,
      body: n.body as string,
      href: (n.href as string | null) ?? null,
      tone: n.tone as NotificationItem["tone"],
      read: !!n.read_at,
      createdAt: n.created_at as string,
    })),
  };
}

export async function markNotificationsReadAction(ids: string[] | "all"): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase = await createClient();
  const uid = await requireUserId(supabase);
  if (!uid) return SESSION_EXPIRED;
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", uid).is("read_at", null);
  if (ids !== "all") {
    const valid = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
    if (valid.length === 0) return { ok: true };
    query = query.in("id", valid);
  }
  const { error } = await query;
  return error ? { ok: false, error: "Couldn't update notifications." } : { ok: true };
}
