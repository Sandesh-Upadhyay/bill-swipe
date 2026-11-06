"use client";

import * as React from "react";
import { CalendarClock, ClipboardCheck, FileSearch, FileText, FileX, Info, Search, SearchX } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Button } from "@/components/ui/button";
import { Card, Input, NativeSelect } from "@/components/ui/basic";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { CategoryBadge, CountryLabel, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { useRequestsStore } from "@/store/requests-store";
import { formatCurrency, timeAgo, dueLabel } from "@/lib/utils";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";
import { ChecklistBadges } from "@/components/admin/verification-checklist";
import { DuplicateWarning, RiskFlagsCompact } from "@/components/admin/risk-flags";
import { signalsFor, useReviewSignals } from "@/components/admin/use-review";
import { riskScore } from "@/lib/admin/risk";
import { fileTypeLabel, formatFileSize } from "@/lib/admin/mock-bill";

type QueueTab = "all" | "pending_review" | "needs_info" | "unverified";
type QueueSort = "oldest" | "risk" | "due";

export default function VerificationQueuePage() {
  const requests = useRequestsStore((s) => s.requests);
  const [tab, setTab] = React.useState<QueueTab>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<QueueSort>("oldest");
  const signals = useReviewSignals();

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
    .filter((r) => !q || [r.title, r.name, r.city, r.id].some((f) => f.toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === "risk"
        ? riskScore(signalsFor(signals, b).flags) - riskScore(signalsFor(signals, a).flags) || a.createdAt.localeCompare(b.createdAt)
        : sort === "due"
          ? a.dueDate.localeCompare(b.dueDate)
          : a.createdAt.localeCompare(b.createdAt),
    );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Moderation"
        title="Verification queue"
        description="Review new and updated requests. Live requests that are still pending or unverified are included so they can be reviewed too. Checks, risk signals and document previews are simulated."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Demo-approve</strong> sets a prototype moderation state only. It is never an independent verification of a person, their identity or
          their bill. Documents are not stored in this prototype — only file metadata is kept, and previews are generated mock bills. The checklist
          records a demo moderator&apos;s judgement, not a real identity, document or payee check.
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
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-[28rem]">
          <div className="relative">
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
          <NativeSelect aria-label="Sort the queue" value={sort} onChange={(e) => setSort(e.target.value as QueueSort)} className="sm:w-44">
            <option value="oldest">Oldest first</option>
            <option value="risk">Highest risk first</option>
            <option value="due">Due soonest</option>
          </NativeSelect>
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
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {shown.map((r) => {
            const sig = signalsFor(signals, r);
            return (
              <li key={r.id}>
                <Card className="grid gap-4 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <DemoAvatar seed={r.image} className="size-12" rounded="2xl" label={r.name} />
                    <div className="grid min-w-0 flex-1 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold wrap-anywhere">{r.title}</h2>
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
                  <div className="grid gap-2.5 rounded-2xl bg-muted/40 p-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Checks</span>
                      <ChecklistBadges requestId={r.id} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Risk</span>
                      <RiskFlagsCompact flags={sig.flags} />
                    </div>
                    <p className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
                      {r.document ? <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden /> : <FileX className="mt-0.5 size-3.5 shrink-0" aria-hidden />}
                      <span className="min-w-0 break-all">
                        {r.document
                          ? `${r.document.name} · ${fileTypeLabel(r.document.type)} · ${formatFileSize(r.document.sizeKb)} (metadata only)`
                          : "No document provided"}
                      </span>
                    </p>
                  </div>
                  <DuplicateWarning matches={sig.duplicates} onOpen={setOpenId} />
                  {r.adminNote && (
                    <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                      <strong>Note to requester:</strong> {r.adminNote}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                    <ModerationActions request={r} showFlag={false} />
                    <Button variant="outline" size="sm" onClick={() => setOpenId(r.id)}>
                      <FileSearch /> Review checks &amp; document
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
