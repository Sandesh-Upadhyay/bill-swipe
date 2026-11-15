import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, applyRememberPreference } from "@/lib/auth/cookies";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseConfigured } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new client per request; never share one across requests.
 *
 * Authorization decisions (for example "is this user an admin?") must use data the
 * database itself verifies, such as the `is_admin()` RPC, never a role sent by the client.
 *
 * `remember` overrides the stored "remember me" preference (used at sign-in, before the
 * preference cookie exists). When false, auth cookies are written as session cookies.
 */
export async function createClient(opts: { remember?: boolean } = {}) {
  assertSupabaseConfigured();
  const cookieStore = await cookies();
  const remember = opts.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== "0";

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, applyRememberPreference(options, remember)));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: src/proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}
