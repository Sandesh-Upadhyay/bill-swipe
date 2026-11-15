import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, REMEMBER_COOKIE, applyRememberPreference, hasSupabaseAuthCookie } from "@/lib/auth/cookies";
import { isProtectedPath, loginRedirectPath } from "@/lib/auth/redirects";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Refreshes the Supabase auth session on each request (Next.js 16 Proxy), following the
 * official @supabase/ssr pattern, and performs an OPTIMISTIC redirect for protected pages.
 *
 * Security note: this redirect is a convenience, not the authorization boundary. Protected
 * routes are enforced again on the server (RouteGuard, src/components/auth/route-guard.tsx)
 * and in the database (RLS), so a request that slips past the proxy still gets nothing.
 *
 * When Supabase isn't configured this is a no-op and the app runs in demo mode.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";
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
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, applyRememberPreference(options, remember)));
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): doing so can make users
  // appear randomly signed out. getClaims() validates the JWT and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  if (!signedIn && isProtectedPath(pathname) && request.cookies.get(DEMO_COOKIE)?.value !== "1") {
    const expired = hasSupabaseAuthCookie(request.cookies.getAll().map((c) => c.name));
    const redirect = NextResponse.redirect(new URL(loginRedirectPath(pathname + request.nextUrl.search, { expired }), request.url));
    // Keep any cookie changes from the refresh attempt (e.g. clearing a dead session).
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Return supabaseResponse as-is so refreshed cookies reach the browser.
  return supabaseResponse;
}
