import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refreshes the Supabase auth session on each request (Next.js 16 Proxy), following the
 * official @supabase/ssr pattern.
 *
 * Phase 1 deliberately does NOT redirect signed-out visitors: the app still uses its demo
 * sign-in, so route protection stays in the existing client-side guards until Phase 2.
 * When Supabase isn't configured this is a no-op, so current deployments are unaffected.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  // Always create a new client per request (don't store it in a module-level variable).
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): doing so can make users
  // appear randomly signed out. getClaims() validates the JWT and refreshes it if needed.
  await supabase.auth.getClaims();

  // Return supabaseResponse as-is so refreshed cookies reach the browser. If you ever need a
  // different response, copy supabaseResponse's cookies (and cache headers) onto it.
  return supabaseResponse;
}
