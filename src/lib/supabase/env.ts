/**
 * Public Supabase configuration. Both values are safe to expose to the browser:
 * the publishable key only grants what Row Level Security allows.
 *
 * Never put a secret / service-role key in a NEXT_PUBLIC_ variable.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * Phase 1: the app still runs on demo data. Supabase is optional until it's configured,
 * so the existing prototype keeps working on deployments without these variables.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example and SUPABASE_SETUP.md).",
    );
  }
}
