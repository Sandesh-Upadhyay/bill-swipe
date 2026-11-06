import type { BillRequest, DemoUser } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatCurrency, toUsd } from "@/lib/utils";
import { DUPLICATE_REASON_LABEL, type DuplicateMatch } from "./duplicates";

/**
 * Computed (never stored) review signals for the demo moderation console.
 * These are simple heuristics over fictional demo data — prompts for a human moderator, not a fraud score.
 */
export type RiskSeverity = "high" | "medium" | "low";

export type RiskFlagId =
  | "no-document"
  | "open-reports"
  | "flagged"
  | "over-limit"
  | "due-soon"
  | "overdue"
  | "short-story"
  | "vague-location"
  | "new-requester"
  | "unknown-requester"
  | "suspended-requester"
  | "duplicate";

export interface RiskFlag {
  id: RiskFlagId;
  severity: RiskSeverity;
  label: string;
  detail: string;
}

export interface RiskContext {
  /** Open (unresolved) reports on this request. */
  openReports: number;
  /** Reports that auto-flag a request (admin setting). 0 disables. */
  autoFlagThreshold?: number;
  requester?: DemoUser;
  /** Category cap in USD (admin category settings). */
  categoryMaxUsd?: number;
  /** Platform-wide cap in USD (admin settings). */
  platformMaxUsd?: number;
  requireDocument?: boolean;
  duplicates?: DuplicateMatch[];
  /** Override "now" for deterministic results (ms since epoch). */
  now?: number;
}

export const SEVERITY_RANK: Record<RiskSeverity, number> = { high: 3, medium: 2, low: 1 };

export const SEVERITY_LABEL: Record<RiskSeverity, string> = { high: "High", medium: "Medium", low: "Low" };

const DAY = 86_400_000;
const SHORT_STORY_CHARS = 120;
const SHORT_SUMMARY_CHARS = 40;
const DUE_SOON_DAYS = 3;
const NEW_ACCOUNT_DAYS = 7;

export function computeRiskFlags(r: BillRequest, ctx: RiskContext): RiskFlag[] {
  const now = ctx.now ?? Date.now();
  const flags: RiskFlag[] = [];

  if (r.flagged) {
    flags.push({ id: "flagged", severity: "high", label: "Flagged", detail: "A moderator (or the report threshold) flagged this request. It is hidden from Discover." });
  }

  if (ctx.openReports > 0) {
    const threshold = ctx.autoFlagThreshold ?? 0;
    flags.push({
      id: "open-reports",
      severity: threshold > 0 && ctx.openReports >= threshold ? "high" : "medium",
      label: `${ctx.openReports} open report${ctx.openReports === 1 ? "" : "s"}`,
      detail: "Donors reported this request and the reports are still unresolved. Review them before approving.",
    });
  }

  if (ctx.requester?.status === "suspended") {
    flags.push({ id: "suspended-requester", severity: "high", label: "Requester suspended", detail: "The requester's demo account is suspended by a moderator." });
  }

  const dupes = ctx.duplicates ?? [];
  if (dupes.length) {
    const reasons = Array.from(new Set(dupes.flatMap((d) => d.reasons)));
    flags.push({
      id: "duplicate",
      severity: reasons.includes("document") || reasons.includes("same-user-amount-category") ? "high" : "medium",
      label: `Possible duplicate (${dupes.length})`,
      detail: `Matches ${dupes.length} other request${dupes.length === 1 ? "" : "s"}: ${reasons.map((x) => DUPLICATE_REASON_LABEL[x].toLowerCase()).join("; ")}.`,
    });
  }

  const usd = toUsd(r.amount, r.currency);
  const category = CATEGORY_MAP[r.category]?.label ?? r.category;
  if (ctx.categoryMaxUsd !== undefined && usd > ctx.categoryMaxUsd) {
    flags.push({
      id: "over-limit",
      severity: "high",
      label: "Above category limit",
      detail: `${formatCurrency(r.amount, r.currency)} (≈ ${formatCurrency(usd, "USD")}) exceeds the ${category} limit of ${formatCurrency(ctx.categoryMaxUsd, "USD")} (fictional demo rates).`,
    });
  } else if (ctx.platformMaxUsd !== undefined && usd > ctx.platformMaxUsd) {
    flags.push({
      id: "over-limit",
      severity: "high",
      label: "Above platform limit",
      detail: `${formatCurrency(r.amount, r.currency)} (≈ ${formatCurrency(usd, "USD")}) exceeds the platform limit of ${formatCurrency(ctx.platformMaxUsd, "USD")}.`,
    });
  }

  if (!r.document) {
    flags.push({
      id: "no-document",
      severity: ctx.requireDocument ? "medium" : "low",
      label: "No bill document",
      detail: ctx.requireDocument
        ? "No bill document was attached, but platform settings require one for review."
        : "No bill document was attached to support the amount.",
    });
  }

  const days = Math.ceil((new Date(r.dueDate).getTime() - now) / DAY);
  if (Number.isFinite(days) && days >= 0 && days <= DUE_SOON_DAYS) {
    flags.push({
      id: "due-soon",
      severity: "medium",
      label: days === 0 ? "Due today" : `Due in ${days}d`,
      detail: "Very short deadlines add pressure to approve quickly — a common pattern in misleading requests. Take the usual care.",
    });
  } else if (Number.isFinite(days) && days < 0 && r.status !== "completed") {
    flags.push({ id: "overdue", severity: "low", label: "Already overdue", detail: "The bill's due date has passed; confirm the amount is still owed." });
  }

  const story = r.story.trim();
  const summary = r.summary.trim();
  if (story.length < SHORT_STORY_CHARS || summary.length < SHORT_SUMMARY_CHARS) {
    flags.push({
      id: "short-story",
      severity: "medium",
      label: "Very little detail",
      detail: `The ${story.length < SHORT_STORY_CHARS ? `story is only ${story.length} characters` : `summary is only ${summary.length} characters`} — there isn't enough context to review the need.`,
    });
  }

  if (!r.city.trim() || /^(unknown|n\/?a|none|-+)$/i.test(r.city.trim())) {
    flags.push({ id: "vague-location", severity: "low", label: "Vague location", detail: "The city is missing or set to a placeholder value." });
  }

  if (!ctx.requester) {
    flags.push({ id: "unknown-requester", severity: "low", label: "Not in user directory", detail: "The requester's demo account isn't in the admin user list (e.g. created in another browser)." });
  } else if (ctx.requester.status !== "suspended") {
    const age = Math.floor((now - new Date(ctx.requester.memberSince).getTime()) / DAY);
    if (Number.isFinite(age) && age < NEW_ACCOUNT_DAYS) {
      flags.push({
        id: "new-requester",
        severity: "low",
        label: "Brand-new account",
        detail: `The requester joined ${age <= 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`}. New accounts are not suspicious on their own.`,
      });
    }
  }

  return flags.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

/** Highest severity present, or null when there are no flags. */
export function topSeverity(flags: RiskFlag[]): RiskSeverity | null {
  return flags.reduce<RiskSeverity | null>((top, f) => (!top || SEVERITY_RANK[f.severity] > SEVERITY_RANK[top] ? f.severity : top), null);
}

/** Simple sortable score: 3 per high, 2 per medium, 1 per low. */
export function riskScore(flags: RiskFlag[]) {
  return flags.reduce((sum, f) => sum + SEVERITY_RANK[f.severity], 0);
}
