import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_COOKIE } from "@/lib/auth/cookies";
import { safeNextPath } from "@/lib/auth/redirects";

/**
 * OAuth (Google) and PKCE email-link callback.
 * Exchanges the one-time `code` for a session (cookies), then continues to a SAFE internal path.
 * Errors from the provider are shown on the login page without echoing raw provider text.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const login = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}&next=${encodeURIComponent(next)}`, url.origin));

  if (!isSupabaseConfigured) return login("not_configured");

  // Provider-side failure (e.g. user cancelled Google consent).
  if (url.searchParams.get("error")) {
    return login(url.searchParams.get("error") === "access_denied" ? "oauth_cancelled" : "oauth_failed");
  }

  const code = url.searchParams.get("code");
  if (!code || code.length > 512) return login("link_invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return login(error.code === "otp_expired" || /expired/i.test(error.message) ? "link_expired" : "link_invalid");

  (await cookies()).delete(DEMO_COOKIE);

  // Password recovery goes straight to the reset form.
  if (next.startsWith("/reset-password")) return NextResponse.redirect(new URL("/reset-password", url.origin));

  // New users (including first Google sign-in) finish onboarding first.
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (uid) {
    const { data: profile } = await supabase.from("profiles").select("onboarded, status, active_mode").eq("id", uid).maybeSingle();
    if (profile?.status === "suspended") {
      await supabase.auth.signOut();
      return login("suspended");
    }
    if (profile && !profile.onboarded) {
      return NextResponse.redirect(new URL(`/onboarding?next=${encodeURIComponent(next)}`, url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
