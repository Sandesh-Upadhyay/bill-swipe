import "server-only";
import { headers } from "next/headers";

/**
 * Absolute site origin for auth emails and OAuth redirects.
 *
 * Prefers NEXT_PUBLIC_SITE_URL (set it in production). Falls back to the request host for
 * localhost and preview deployments. Supabase Auth only redirects to URLs on the project's
 * Redirect URLs allow-list, so a spoofed Host header can't send users to another site.
 */
export async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\/[^\s/]+$/.test(configured.replace(/\/$/, ""))) {
    return configured.replace(/\/$/, "");
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Callback URL that exchanges an auth code for a session, then continues to `next`. */
export async function authCallbackUrl(next: string) {
  return `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
