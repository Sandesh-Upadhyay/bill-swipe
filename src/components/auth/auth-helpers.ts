import type { Role } from "@/lib/types";
import { safeNextPath } from "@/lib/auth/redirects";

/** Only allow internal, same-origin redirect targets (null when there's nothing safe). */
export function safeNext(next: string | null | undefined) {
  if (!next) return null;
  const safe = safeNextPath(next, "");
  return safe || null;
}

export function defaultRouteFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "requester") return "/dashboard/requester";
  return "/discover";
}
