import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { DEMO_COOKIE, hasSupabaseAuthCookie } from "./cookies";
import { PROFILE_COLUMNS, toAuthProfile, type AuthProfile, type ProfileRow } from "./profile";

/**
 * Who is making this request, verified on the server.
 *
 *  unconfigured  Supabase isn't set up: the app runs fully in demo mode (client guards apply)
 *  user          verified Supabase session; profile + admin flag read from the database
 *  demo          explicit demo session (fictional data in this browser only; no server data)
 *  anonymous     nobody signed in; `sessionExpired` when an auth cookie was present but invalid
 */
export type Viewer =
  | { kind: "unconfigured" }
  | { kind: "user"; profile: AuthProfile }
  | { kind: "demo" }
  | { kind: "anonymous"; sessionExpired: boolean };

/** Resolved once per request (React cache) so layouts and pages share one lookup. */
export const getViewer = cache(async (): Promise<Viewer> => {
  if (!isSupabaseConfigured) return { kind: "unconfigured" };

  const cookieStore = await cookies();
  const supabase = await createClient();

  // getClaims() verifies the JWT (signature + expiry); never trust a decoded-but-unverified token.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claims?.sub) {
    const [{ data: row }, { data: isAdmin }] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", claims.sub).maybeSingle<ProfileRow>(),
      supabase.rpc("is_admin"),
    ]);
    if (row) {
      const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
      return {
        kind: "user",
        profile: toAuthProfile(row, { email: typeof claims.email === "string" ? claims.email : null, isAdmin: isAdmin === true, providerAvatar: meta.avatar_url }),
      };
    }
    // Authenticated but no profile row (shouldn't happen: the sign-up trigger creates one).
    return { kind: "anonymous", sessionExpired: false };
  }

  if (cookieStore.get(DEMO_COOKIE)?.value === "1") return { kind: "demo" };

  return { kind: "anonymous", sessionExpired: hasSupabaseAuthCookie(cookieStore.getAll().map((c) => c.name)) };
});
