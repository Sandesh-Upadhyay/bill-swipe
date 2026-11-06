"use client";

import * as React from "react";
import { AlertOctagon, AlertTriangle, Copy, Info, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/basic";
import { STATUS_META } from "@/lib/constants";
import { DUPLICATE_REASON_LABEL, type DuplicateMatch } from "@/lib/admin/duplicates";
import { SEVERITY_LABEL, type RiskFlag, type RiskSeverity } from "@/lib/admin/risk";
import { cn } from "@/lib/utils";

export const SEVERITY_TONE: Record<RiskSeverity, string> = {
  high: "bg-red-500/12 text-red-700 dark:text-red-300",
  medium: "bg-amber-500/14 text-amber-800 dark:text-amber-300",
  low: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
};

const SEVERITY_ICON = { high: AlertOctagon, medium: AlertTriangle, low: Info } as const;

/** Compact risk badges for queue cards: the most severe flags first, then "+N more". */
export function RiskFlagsCompact({ flags, max = 3, className }: { flags: RiskFlag[]; max?: number; className?: string }) {
  if (flags.length === 0) {
    return (
      <Badge className={cn("bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", className)} title="No computed risk signals (demo heuristics)">
        <ShieldCheck aria-hidden /> No risk signals
      </Badge>
    );
  }
  const shown = flags.slice(0, max);
  return (
    <ul aria-label={`${flags.length} computed risk signal${flags.length === 1 ? "" : "s"}`} className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((f) => {
        const Icon = SEVERITY_ICON[f.severity];
        return (
          <li key={f.id}>
            <Badge className={SEVERITY_TONE[f.severity]} title={f.detail}>
              <Icon aria-hidden />
              <span className="sr-only">{SEVERITY_LABEL[f.severity]} risk: </span>
              {f.label}
            </Badge>
          </li>
        );
      })}
      {flags.length > max && (
        <li>
          <Badge variant="muted" title={flags.slice(max).map((f) => f.label).join(", ")}>
            +{flags.length - max} more
          </Badge>
        </li>
      )}
    </ul>
  );
}

/** Full risk list with explanations (drawer). */
export function RiskFlagList({ flags }: { flags: RiskFlag[] }) {
  return (
    <div className="grid gap-3">
      {flags.length === 0 ? (
        <p className="flex items-center gap-2 rounded-2xl border p-3 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden /> No risk signals computed for this request.
        </p>
      ) : (
        <ul className="grid gap-2">
          {flags.map((f) => {
            const Icon = SEVERITY_ICON[f.severity];
            return (
              <li key={f.id} className="flex items-start gap-3 rounded-2xl border p-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", SEVERITY_TONE[f.severity])} aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{f.label}</span>
                    <Badge className={SEVERITY_TONE[f.severity]}>{SEVERITY_LABEL[f.severity]}</Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground wrap-anywhere">{f.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Computed fresh from demo data each time — simple heuristics to guide a human review, not a fraud score and never stored.
      </p>
    </div>
  );
}

/** Warning listing the requests this one may duplicate. Each match opens that request. */
export function DuplicateWarning({
  matches,
  onOpen,
  className,
}: {
  matches: DuplicateMatch[];
  onOpen: (requestId: string) => void;
  className?: string;
}) {
  if (matches.length === 0) return null;
  return (
    <div
      role="note"
      className={cn(
        "grid gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 font-semibold">
        <Copy className="size-3.5 shrink-0" aria-hidden /> Possible duplicate of {matches.length} request{matches.length === 1 ? "" : "s"}
      </p>
      <ul className="grid gap-1.5">
        {matches.map((m) => (
          <li key={m.requestId} className="min-w-0 wrap-anywhere">
            <button
              type="button"
              onClick={() => onOpen(m.requestId)}
              className="rounded text-left font-medium underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              “{m.title}”
            </button>{" "}
            <span className="opacity-80">
              · {m.name} · {STATUS_META[m.status]?.label ?? m.status} — {m.reasons.map((r) => DUPLICATE_REASON_LABEL[r]).join("; ")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
