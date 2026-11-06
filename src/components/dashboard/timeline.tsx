"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  CheckCircle2,
  ListChecks,
  MessageSquareMore,
  StickyNote,
  Tags,
  UserCog,
  XCircle,
  FilePlus2,
  Flag,
  HandHeart,
  Handshake,
  Heart,
  Pencil,
  ShieldCheck,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/basic";
import { EmptyState } from "@/components/layout/page-parts";

export type TimelineKind =
  | "interest"
  | "contribution"
  | "commitment"
  | "fulfilled"
  | "cancelled"
  | "created"
  | "updated"
  | "withdrawn"
  | "status"
  | "report"
  // Moderation log
  | "approved"
  | "rejected"
  | "info"
  | "flag"
  | "user"
  | "category"
  | "checklist"
  | "note";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  text: React.ReactNode;
  createdAt: string;
  href?: string;
}

const KIND_META: Record<TimelineKind, { icon: LucideIcon; tone: string; label: string }> = {
  interest: { icon: Heart, tone: "bg-rose-500/12 text-rose-600 dark:text-rose-300", label: "Interest" },
  contribution: { icon: HandHeart, tone: "bg-primary/12 text-primary", label: "Simulated contribution" },
  commitment: { icon: Handshake, tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300", label: "Commitment" },
  fulfilled: { icon: CheckCircle2, tone: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300", label: "Fulfilled" },
  cancelled: { icon: X, tone: "bg-muted text-muted-foreground", label: "Cancelled" },
  created: { icon: FilePlus2, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300", label: "Submitted" },
  updated: { icon: Pencil, tone: "bg-muted text-muted-foreground", label: "Edited" },
  withdrawn: { icon: Undo2, tone: "bg-muted text-muted-foreground", label: "Withdrawn" },
  status: { icon: ShieldCheck, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300", label: "Moderation" },
  report: { icon: Flag, tone: "bg-red-500/12 text-red-700 dark:text-red-300", label: "Report" },
  approved: { icon: BadgeCheck, tone: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300", label: "Approved" },
  rejected: { icon: XCircle, tone: "bg-red-500/12 text-red-700 dark:text-red-300", label: "Rejected" },
  info: { icon: MessageSquareMore, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300", label: "Info requested" },
  flag: { icon: Flag, tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300", label: "Flag" },
  user: { icon: UserCog, tone: "bg-violet-500/12 text-violet-700 dark:text-violet-300", label: "User management" },
  category: { icon: Tags, tone: "bg-muted text-muted-foreground", label: "Category" },
  checklist: { icon: ListChecks, tone: "bg-teal-500/12 text-teal-700 dark:text-teal-300", label: "Verification check" },
  note: { icon: StickyNote, tone: "bg-amber-500/14 text-amber-700 dark:text-amber-300", label: "Moderator note" },
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return formatDate(d.toISOString(), { weekday: "short", day: "numeric", month: "short" });
}

/** Vertical activity timeline grouped by day, with a "show more" toggle. */
export function ActivityTimeline({
  title = "Recent activity",
  description,
  entries,
  emptyText,
  initialCount = 8,
  className,
}: {
  title?: string;
  description?: string;
  entries: TimelineEntry[];
  emptyText: string;
  initialCount?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const sorted = React.useMemo(() => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries]);
  const visible = expanded ? sorted : sorted.slice(0, initialCount);

  const groups = React.useMemo(() => {
    const out: { key: string; label: string; items: TimelineEntry[] }[] = [];
    for (const e of visible) {
      const key = dayKey(e.createdAt);
      const last = out.at(-1);
      if (last?.key === key) last.items.push(e);
      else out.push({ key, label: dayLabel(e.createdAt), items: [e] });
    }
    return out;
  }, [visible]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" /> {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" description={emptyText} className="py-10" />
        ) : (
          <div className="grid gap-5">
            {groups.map((g) => (
              <section key={g.key} aria-label={g.label}>
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h3>
                <ol className="grid gap-3">
                  {g.items.map((e) => {
                    const meta = KIND_META[e.kind];
                    const body = (
                      <>
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", meta.tone)} aria-hidden>
                          <meta.icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="sr-only">{meta.label}: </span>
                          <span className="block text-sm leading-snug">{e.text}</span>
                          <time dateTime={e.createdAt} className="text-xs text-muted-foreground">
                            {timeAgo(e.createdAt)}
                          </time>
                        </span>
                      </>
                    );
                    return (
                      <li key={e.id}>
                        {e.href ? (
                          <Link
                            href={e.href}
                            className="-mx-2 flex items-start gap-3 rounded-xl px-2 py-1 transition outline-none hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="flex items-start gap-3 py-1">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
            {sorted.length > initialCount && (
              <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                {expanded ? "Show less" : `Show all ${sorted.length}`}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
