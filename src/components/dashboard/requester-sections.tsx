"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Activity, CalendarClock, Eye, HandHeart, MessageSquareWarning, Pencil, Undo2, Users } from "lucide-react";
import type { ActivityItem, BillRequest, Contribution } from "@/lib/types";
import { cn, dueLabel, formatCurrency, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/basic";
import { ConfirmDialog } from "@/components/ui/overlays";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { EmptyState } from "@/components/layout/page-parts";
import { CategoryBadge, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress } from "@/components/requests/money";
import { EditRequestDialog } from "./edit-request-dialog";
import { useRequestsStore } from "@/store/requests-store";

export function OwnRequestCard({ request, userId }: { request: BillRequest; userId: string }) {
  const withdraw = useRequestsStore((s) => s.withdrawRequest);
  const [editOpen, setEditOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const editable = request.status !== "withdrawn" && request.status !== "completed" && request.status !== "rejected";
  const withdrawable = request.status !== "withdrawn" && request.status !== "completed";

  return (
    <article className="grid gap-4 rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <DemoAvatar seed={request.image} rounded="2xl" className="size-14" label={request.name} />
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={request.status} />
            <VerificationBadge state={request.verification} />
            <CategoryBadge category={request.category} />
          </div>
          <h3 className="font-semibold leading-snug tracking-tight">{request.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{request.summary}</p>
        </div>
      </div>

      {request.status === "needs_info" && request.adminNote && (
        <p className="flex items-start gap-2 rounded-xl bg-sky-500/10 px-3 py-2 text-sm text-sky-900 dark:text-sky-200">
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Moderator request:</strong> {request.adminNote}
          </span>
        </p>
      )}
      {request.status === "rejected" && request.adminNote && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">{request.adminNote}</p>
      )}

      <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {request.supporters} supporters
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> {dueLabel(request.dueDate)}
          </span>
          <span>Remaining {formatCurrency(Math.max(0, request.amount - request.amountRaised), request.currency)} (simulated)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/requests/${request.id}`}>
              <Eye /> View
            </Link>
          </Button>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
          )}
          {withdrawable && (
            <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setWithdrawOpen(true)}>
              <Undo2 /> Withdraw
            </Button>
          )}
        </div>
      </div>

      <EditRequestDialog request={request} userId={userId} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Withdraw this request?"
        description="It will be removed from Discover and Explore. Simulated progress is kept for your records. This can't be undone in the demo."
        confirmLabel="Withdraw request"
        destructive
        onConfirm={() => {
          const res = withdraw(request.id, userId);
          if (!res.ok) toast.error(res.error);
          else toast.success("Request withdrawn");
        }}
      />
    </article>
  );
}

type FeedEntry = { id: string; text: string; createdAt: string; kind: ActivityItem["kind"]; href?: string };

export function ActivityFeed({
  activity,
  contributions,
  requestsById,
}: {
  activity: ActivityItem[];
  contributions: Contribution[];
  requestsById: Map<string, BillRequest>;
}) {
  const entries: FeedEntry[] = React.useMemo(() => {
    const fromActivity: FeedEntry[] = activity
      .filter((a) => a.kind !== "contribution")
      .map((a) => ({ id: a.id, text: a.text, createdAt: a.createdAt, kind: a.kind, href: a.requestId ? `/requests/${a.requestId}` : undefined }));
    const fromContribs: FeedEntry[] = contributions
      .filter((c) => c.status === "recorded" || c.status === "fulfilled")
      .map((c) => ({
        id: c.id,
        kind: "contribution",
        createdAt: c.createdAt,
        href: `/requests/${c.requestId}`,
        text: `Simulated contribution from ${c.donorName} · ${formatCurrency(c.amount, c.currency)} on “${requestsById.get(c.requestId)?.title ?? "your request"}”`,
      }));
    return [...fromActivity, ...fromContribs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  }, [activity, contributions, requestsById]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4 text-primary" /> Recent activity
        </CardTitle>
        <CardDescription>Updates on your requests. Contributions shown are simulated.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" description="Submissions, reviews and simulated contributions will show up here." className="py-10" />
        ) : (
          <ol className="relative grid gap-5 border-l pl-5">
            {entries.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[27px] top-0.5 grid size-3.5 place-items-center rounded-full ring-4 ring-card",
                    e.kind === "contribution" ? "bg-primary" : e.kind === "withdrawn" ? "bg-muted-foreground" : "bg-amber-500",
                  )}
                />
                {e.href ? (
                  <Link href={e.href} className="text-sm hover:text-primary">
                    {e.kind === "contribution" && <HandHeart className="mr-1.5 inline size-3.5 text-primary" />}
                    {e.text}
                  </Link>
                ) : (
                  <p className="text-sm">{e.text}</p>
                )}
                <p className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
