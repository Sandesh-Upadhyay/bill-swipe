import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseConfigured } from "./env";

/**
 * Supabase client for Client Components. Uses the publishable key only; every query
 * is constrained by Row Level Security for the signed-in user (or the anon role).
 */
export function createClient() {
  assertSupabaseConfigured();
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
