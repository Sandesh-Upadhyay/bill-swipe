"use client";

import * as React from "react";
import {
  BadgeCheck,
  ClipboardList,
  Flag,
  History,
  MessageSquareMore,
  StickyNote,
  Tags,
  UserCog,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAdminStore, type ModerationKind } from "@/store/admin-store";
import { formatAuditTime } from "@/lib/admin/audit";
import { cn } from "@/lib/utils";

export const AUDIT_KIND_META: Record<ModerationKind, { label: string; icon: LucideIcon; tone: string }> = {
  approved: { label: "Demo-approved", icon: BadgeCheck, tone: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300" },
  rejected: { label: "Rejected", icon: XCircle, tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
  info: { label: "Info requested", icon: MessageSquareMore, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  flag: { label: "Flag", icon: Flag, tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300" },
  report: { label: "Report decision", icon: Flag, tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
  checklist: { label: "Checklist", icon: ClipboardList, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  note: { label: "Internal note", icon: StickyNote, tone: "bg-primary/12 text-primary" },
  user: { label: "User management", icon: UserCog, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300" },
  category: { label: "Category", icon: Tags, tone: "bg-muted text-muted-foreground" },
};

/** Falls back gracefully for unknown kinds in older or hand-edited LocalStorage data. */
export function auditKindMeta(kind: string) {
  return AUDIT_KIND_META[kind as ModerationKind] ?? { label: "Moderation", icon: History, tone: "bg-muted text-muted-foreground" };
}

/** Per-request audit trail with absolute timestamps, newest first. */
export function RequestAuditTrail({ requestId }: { requestId: string }) {
  const log = useAdminStore((s) => s.moderationLog);
  const entries = React.useMemo(
    () => log.filter((m) => m.requestId === requestId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [log, requestId],
  );

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No moderator actions recorded for this request yet.</p>;
  }

  return (
    <ol className="grid gap-3" aria-label="Audit trail for this request">
      {entries.map((m) => {
        const meta = auditKindMeta(m.kind);
        return (
          <li key={m.id} className="flex items-start gap-3">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", meta.tone)} aria-hidden>
              <meta.icon className="size-4" />
            </span>
            <div className="grid min-w-0 flex-1 gap-0.5">
              <p className="text-sm leading-snug wrap-anywhere">
                <span className="sr-only">{meta.label}: </span>
                {m.text}
              </p>
              <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <time dateTime={m.createdAt}>{formatAuditTime(m.createdAt)}</time>
                <span aria-hidden>·</span>
                <span>{meta.label}</span>
                {m.actor && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{m.actor}</span>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
