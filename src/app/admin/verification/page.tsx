"use client";

import * as React from "react";
import { CalendarClock, ClipboardCheck, Eye, FileText, Info, Search, SearchX } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/basic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { CategoryBadge, CountryLabel, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { useRequestsStore } from "@/store/requests-store";
import { formatCurrency, timeAgo, dueLabel } from "@/lib/utils";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";

type QueueTab = "all" | "pending_review" | "needs_info" | "unverified";

export default function VerificationQueuePage() {
  const requests = useRequestsStore((s) => s.requests);
  const [tab, setTab] = React.useState<QueueTab>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const queue = React.useMemo(
    () =>
      requests
        .filter(
          (r) =>
            r.status === "pending_review" ||
            r.status === "needs_info" ||
            (r.status === "active" && (r.verification === "pending" || r.verification === "unverified")),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [requests],
  );
  const counts = {
    all: queue.length,
    pending_review: queue.filter((r) => r.status === "pending_review").length,
    needs_info: queue.filter((r) => r.status === "needs_info").length,
    unverified: queue.filter((r) => r.status === "active").length,
  };
  const q = query.trim().toLowerCase();
  const shown = queue
    .filter((r) => (tab === "all" ? true : tab === "unverified" ? r.status === "active" : r.status === tab))
    .filter((r) => !q || [r.title, r.name, r.city, r.id].some((f) => f.toLowerCase().includes(q)));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Moderation"
        title="Verification queue"
        description="Review new and updated requests, oldest first. Live requests that are still pending or unverified are included so they can be reviewed too."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Demo-approve</strong> sets a prototype moderation state only. It is never an independent verification of a person, their identity or
          their bill. Documents are not stored in this prototype — only file metadata is shown.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending_review">Pending review ({counts.pending_review})</TabsTrigger>
            <TabsTrigger value="needs_info">Awaiting info ({counts.needs_info})</TabsTrigger>
            <TabsTrigger value="unverified">Live, unreviewed ({counts.unverified})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, name, city or ID"
            aria-label="Search the verification queue"
            className="pl-9"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        query.trim() ? (
          <EmptyState
            icon={SearchX}
            title="No matching requests"
            description={`Nothing in this view matches “${query.trim()}”.`}
            action={
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Every request in this view has been moderated. Nice work." />
        )
      ) : (
        <ul className="grid gap-4">
          {shown.map((r) => (
            <li key={r.id}>
              <Card className="grid gap-4 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <DemoAvatar seed={r.image} className="size-12" rounded="2xl" label={r.name} />
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{r.title}</h2>
                      <StatusBadge status={r.status} />
                      <VerificationBadge state={r.verification} />
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{r.name}</span>
                      <CountryLabel country={r.country} city={r.city} />
                      <span>Submitted {timeAgo(r.createdAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5" /> {dueLabel(r.dueDate)}
                      </span>
                    </p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                  </div>
                  <div className="grid gap-1 sm:text-right">
                    <span className="text-lg font-semibold tabular-nums">{formatCurrency(r.amount, r.currency)}</span>
                    <CategoryBadge category={r.category} className="sm:justify-self-end" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  {r.document ? `${r.document.name} · ${r.document.type} · ${r.document.sizeKb} KB (metadata only)` : "No document stored — prototype never stores documents"}
                </div>
                {r.adminNote && (
                  <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                    <strong>Note to requester:</strong> {r.adminNote}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <ModerationActions request={r} showFlag={false} />
                  <Button variant="ghost" size="sm" onClick={() => setOpenId(r.id)}>
                    <Eye /> Full details
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
