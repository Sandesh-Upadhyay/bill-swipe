import { formatDate } from "@/lib/utils";

/** Absolute timestamp used throughout the admin audit trail, e.g. "6 Nov 2026, 14:05". */
export function formatAuditTime(iso: string) {
  return formatDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
