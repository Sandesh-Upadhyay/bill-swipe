/**
 * Cookie names and helpers for auth preferences. Pure (no framework imports).
 */

/** "0" = don't remember: auth cookies become browser-session cookies. Not sensitive. */
export const REMEMBER_COOKIE = "bs_remember";

/**
 * Marks an explicit demo session (fictional data stored only in this browser).
 * Grants nothing on the server except permission to render demo pages. A real
 * Supabase session always takes precedence and clears it.
 */
export const DEMO_COOKIE = "bs_demo";

type CookieOptionsLike = { maxAge?: number; expires?: Date | number | string; [key: string]: unknown };

/** Strips persistence from auth cookies when the user chose not to be remembered. */
export function applyRememberPreference<T extends CookieOptionsLike>(options: T | undefined, remember: boolean): T | undefined {
  if (!options || remember) return options;
  // A cookie with maxAge 0 is a deletion (sign-out); keep those intact.
  if (options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

/** True if the request carries a Supabase auth cookie (used to detect expired sessions). */
export function hasSupabaseAuthCookie(names: string[]) {
  return names.some((n) => n.startsWith("sb-") && n.includes("-auth-token"));
}
