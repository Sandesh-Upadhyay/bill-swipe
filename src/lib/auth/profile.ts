import type { CountryCode, CurrencyCode } from "@/lib/types";
import { SUPABASE_URL } from "@/lib/supabase/env";

/** Profile columns read by the app (matches migrations 1 and 5). is_admin comes from the is_admin() RPC. */
export const PROFILE_COLUMNS =
  "id, display_name, bio, country_code, avatar_path, active_mode, onboarded, status, preferred_currency, created_at" as const;

export interface ProfileRow {
  id: string;
  display_name: string;
  bio: string;
  country_code: CountryCode | null;
  avatar_path: string | null;
  active_mode: "donor" | "requester";
  onboarded: boolean;
  status: "active" | "suspended";
  preferred_currency: CurrencyCode | null;
  created_at: string;
}

/** Signed-in user as the app sees it. `isAdmin` is a UI hint; the server re-checks it. */
export interface AuthProfile {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  country: CountryCode | null;
  avatarUrl: string | null;
  avatarPath: string | null;
  mode: "donor" | "requester";
  onboarded: boolean;
  status: "active" | "suspended";
  preferredCurrency: CurrencyCode | null;
  createdAt: string;
  isAdmin: boolean;
}

/** Public URL for an object in the public avatars bucket (avatars aren't sensitive). */
export function avatarPublicUrl(path: string | null) {
  if (!path || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Only allow https provider avatars (e.g. Google) as a fallback image. */
function safeProviderAvatar(url: unknown) {
  return typeof url === "string" && /^https:\/\/[^\s"']+$/.test(url) ? url : null;
}

export function toAuthProfile(
  row: ProfileRow,
  extra: { email: string | null | undefined; isAdmin: boolean; providerAvatar?: unknown },
): AuthProfile {
  return {
    id: row.id,
    email: extra.email ?? "",
    displayName: row.display_name,
    bio: row.bio ?? "",
    country: row.country_code,
    avatarPath: row.avatar_path,
    avatarUrl: avatarPublicUrl(row.avatar_path) ?? safeProviderAvatar(extra.providerAvatar),
    mode: row.active_mode,
    onboarded: row.onboarded,
    status: row.status,
    preferredCurrency: row.preferred_currency,
    createdAt: row.created_at,
    isAdmin: extra.isAdmin,
  };
}
