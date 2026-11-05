import type { Role } from "@/lib/types";

/** Only allow internal, same-origin redirect targets. */
export function safeNext(next: string | null | undefined) {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

export function defaultRouteFor(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "requester") return "/dashboard/requester";
  return "/discover";
}
