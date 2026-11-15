/**
 * Redirect helpers. Pure functions (no framework imports) so they can be unit tested.
 */

/** Paths that need a signed-in account (or an explicit demo session). */
export const PROTECTED_PREFIXES = ["/dashboard", "/discover", "/submit", "/profile", "/saved", "/notifications", "/admin", "/onboarding"] as const;

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

const MAX_NEXT_LENGTH = 512;

/**
 * Returns a safe, same-origin path for post-auth redirects, or `fallback`.
 * Blocks open redirects: absolute URLs, protocol-relative `//host`, backslash tricks,
 * encoded variants, control characters and auth-route loops.
 */
export function safeNextPath(raw: unknown, fallback = "/discover"): string {
  if (typeof raw !== "string") return fallback;
  let value = raw.trim();
  if (!value || value.length > MAX_NEXT_LENGTH) return fallback;

  // Decode once so "%2F%2Fevil.com" can't sneak past the checks below.
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;

  // Final guard: resolving against a dummy origin must keep that origin.
  let url: URL;
  try {
    url = new URL(value, "http://bs.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://bs.invalid") return fallback;

  // Never bounce back into auth callbacks (avoids loops and code replay).
  if (url.pathname.startsWith("/auth/")) return fallback;

  return url.pathname + url.search + url.hash;
}

/** Builds the login URL for a protected path, preserving where the user was going. */
export function loginRedirectPath(pathname: string, opts: { expired?: boolean } = {}) {
  const params = new URLSearchParams({ next: safeNextPath(pathname) });
  if (opts.expired) params.set("reason", "expired");
  return `/login?${params.toString()}`;
}
