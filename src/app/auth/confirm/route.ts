import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DEMO_COOKIE } from "@/lib/auth/cookies";
import { safeNextPath } from "@/lib/auth/redirects";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Token-hash email links (recommended Supabase email templates, see AUTHENTICATION_SETUP.md).
 * Works even if the link is opened in a different browser than the one that requested it.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  if (!isSupabaseConfigured) return fail("not_configured");
  if (!tokenHash || tokenHash.length > 512 || !type || !TYPES.includes(type)) return fail("link_invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail(/expired/i.test(error.message) || error.code === "otp_expired" ? "link_expired" : "link_invalid");

  (await cookies()).delete(DEMO_COOKIE);

  if (type === "recovery") return NextResponse.redirect(new URL("/reset-password", url.origin));
  const next = safeNextPath(url.searchParams.get("next"), "/onboarding");
  return NextResponse.redirect(new URL(type === "signup" || type === "email" ? `/onboarding?next=${encodeURIComponent(next)}` : next, url.origin));
}
