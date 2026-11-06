"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  FileSearch,
  FileText,
  Flag,
  HandCoins,
  History,
  ShieldAlert,
  StickyNote,
  Users,
} from "lucide-react";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/basic";
import { Separator, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CategoryBadge, CountryLabel, FictionalTag, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress } from "@/components/requests/money";
import { useRequestsStore } from "@/store/requests-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useAdminStore } from "@/store/admin-store";
import { REPORT_REASONS } from "@/lib/constants";
import { formatCurrency, formatDate, dueLabel, timeAgo } from "@/lib/utils";
import { ModerationActions } from "./moderation-actions";
import { ChecklistBadges, VerificationChecklistPanel } from "./verification-checklist";
import { DuplicateWarning, RiskFlagList } from "./risk-flags";
import { BillDocumentPreview } from "./document-preview";
import { ModeratorNotes } from "./moderator-notes";
import { RequestAuditTrail } from "./audit-trail";
import { signalsFor, useReviewSignals } from "./use-review";

type DrawerTab = "review" | "details" | "notes";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Admin detail drawer. Always reads the live request from the store so actions reflect immediately.
 * Duplicate links switch the drawer to the matching request (with a "back" step), without the caller's involvement.
 */
export function RequestDetailDrawer({ requestId, onOpenChange }: { requestId: string | null; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const [history, setHistory] = React.useState<string[]>([]);
  const [tab, setTab] = React.useState<DrawerTab>("review");
  // Reset internal navigation whenever the caller opens a different request (adjusting state during render).
  const [openedId, setOpenedId] = React.useState(requestId);
  if (openedId !== requestId) {
    setOpenedId(requestId);
    setHistory([]);
    setTab("review");
  }
  const viewId = history.at(-1) ?? requestId;

  const request = useRequestsStore((s) => s.requests.find((r) => r.id === viewId));
  const previous = useRequestsStore((s) => (history.length ? s.requests.find((r) => r.id === (history.at(-2) ?? requestId)) : undefined));
  const allReports = useRequestsStore((s) => s.reports);
  const allContributions = useContributionsStore((s) => s.contributions);
  const users = useAdminStore((s) => s.users);
  const noteCount = useAdminStore((s) => {
    const notes = viewId ? s.moderatorNotes[viewId] : undefined;
    return Array.isArray(notes) ? notes.length : 0;
  });
  const signals = signalsFor(useReviewSignals(), request);

  const reports = React.useMemo(() => allReports.filter((r) => r.requestId === viewId), [allReports, viewId]);
  const contributions = React.useMemo(() => allContributions.filter((c) => c.requestId === viewId), [allContributions, viewId]);
  const requester = users.find((u) => u.id === request?.userId);
  const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
  const openDuplicate = (id: string) => {
    if (id === viewId) return;
    setHistory((h) => [...h, id]);
    setTab("review");
  };

  return (
    <Sheet open={!!requestId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-xl gap-0 p-0 sm:max-w-xl">
        {!request ? (
          <div className="grid gap-2 p-8">
            <SheetTitle>Request not found</SheetTitle>
            <SheetDescription>This request may have been removed or the demo data was reset.</SheetDescription>
          </div>
        ) : (
          <>
            <div className="grid gap-3 border-b p-6 pr-12">
              {history.length > 0 && (
                <Button variant="ghost" size="sm" className="-ml-2 justify-self-start" onClick={() => setHistory((h) => h.slice(0, -1))}>
                  <ArrowLeft /> Back{previous ? ` to “${previous.title.length > 28 ? `${previous.title.slice(0, 28)}…` : previous.title}”` : ""}
                </Button>
              )}
              <div className="flex items-start gap-4">
                <DemoAvatar seed={request.image} className="size-14" rounded="2xl" label={request.name} />
                <div className="grid min-w-0 gap-1">
                  <SheetTitle className="text-lg leading-snug wrap-anywhere">{request.title}</SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-2">
                    <span>{request.name}</span>
                    <span aria-hidden>·</span>
                    <CountryLabel country={request.country} city={request.city} />
                  </SheetDescription>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusBadge status={request.status} />
                    <VerificationBadge state={request.verification} />
                    <CategoryBadge category={request.category} />
                    {request.flagged && (
                      <Badge className="bg-red-500/12 text-red-700 dark:text-red-300">
                        <Flag /> Flagged
                      </Badge>
                    )}
                    <FictionalTag className="text-muted-foreground" />
                  </div>
                </div>
              </div>
              <ChecklistBadges requestId={request.id} />
            </div>

            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 p-6">
              <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4">
                <ModerationActions request={request} />
                <p className="text-xs text-muted-foreground">
                  Demo-approval is a prototype moderation state and never an independent verification of the person or bill.
                </p>
                {request.adminNote && (
                  <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                    <strong>Note to requester:</strong> {request.adminNote}
                  </p>
                )}
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as DrawerTab)} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="review" className="px-2">
                    Review
                  </TabsTrigger>
                  <TabsTrigger value="details" className="px-2">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="px-2">
                    Notes & log
                    {noteCount > 0 && <span className="sr-only"> ({noteCount} notes)</span>}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="review" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
                  <Section title="Verification checklist (simulated)" icon={ClipboardList}>
                    <VerificationChecklistPanel request={request} />
                  </Section>

                  <Separator />

                  <Section title={`Risk signals (${signals.flags.length})`} icon={ShieldAlert}>
                    <DuplicateWarning matches={signals.duplicates} onOpen={openDuplicate} />
                    <RiskFlagList flags={signals.flags} />
                  </Section>

                  <Separator />

                  <Section title="Bill document" icon={FileSearch}>
                    <BillDocumentPreview request={request} />
                  </Section>
                </TabsContent>

                <TabsContent value="details" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
                  <Section title="Funding (simulated)" icon={HandCoins}>
                    <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} />
                    <dl className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Supporters</dt>
                        <dd className="font-medium">{request.supporters}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Due</dt>
                        <dd className="font-medium">{formatDate(request.dueDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Created</dt>
                        <dd className="font-medium">{formatDate(request.createdAt)}</dd>
                      </div>
                    </dl>
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarClock className="size-3.5" /> {dueLabel(request.dueDate)}
                    </p>
                  </Section>

                  <Separator />

                  <Section title="Story" icon={FileText}>
                    <p className="text-sm font-medium wrap-anywhere">{request.summary}</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground wrap-anywhere">{request.story}</p>
                  </Section>

                  <Section title="Requester" icon={Users}>
                    <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <DemoAvatar seed={requester?.image ?? request.image} className="size-10" label={request.name} />
                        <div className="grid min-w-0 text-sm">
                          <span className="truncate font-medium">{requester?.name ?? request.name}</span>
                          <span className="truncate text-xs text-muted-foreground">{requester?.email ?? "Local demo account"}</span>
                          {requester && (
                            <span className="text-xs text-muted-foreground">Member since {formatDate(requester.memberSince)}</span>
                          )}
                        </div>
                      </div>
                      {requester && (
                        <Badge variant={requester.status === "active" ? "default" : "muted"} className="capitalize">
                          {requester.status}
                        </Badge>
                      )}
                    </div>
                  </Section>

                  <Section title={`Reports (${reports.length})`} icon={Flag}>
                    {reports.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No reports for this request.</p>
                    ) : (
                      <ul className="grid gap-2">
                        {reports.map((rep) => (
                          <li key={rep.id} className="rounded-2xl border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{reasonLabel(rep.reason)}</span>
                              <Badge variant="muted" className="capitalize">
                                {rep.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-muted-foreground wrap-anywhere">{rep.details}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{timeAgo(rep.createdAt)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Section title={`Simulated contributions (${contributions.length})`} icon={HandCoins}>
                    {contributions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No simulated contributions yet.</p>
                    ) : (
                      <ul className="divide-y rounded-2xl border">
                        {contributions.slice(0, 8).map((c) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                            <span className="min-w-0 truncate">{c.donorName}</span>
                            <span className="flex items-center gap-2">
                              <Badge variant="muted" className="capitalize">
                                {c.kind === "simulated" ? "simulated" : `commitment · ${c.status}`}
                              </Badge>
                              <span className="font-medium tabular-nums">{formatCurrency(c.amount, c.currency)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Section>

                  <Button asChild variant="outline">
                    <Link href={`/requests/${request.id}`}>
                      <ExternalLink /> Open public request page
                    </Link>
                  </Button>
                </TabsContent>

                <TabsContent value="notes" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
                  <Section title="Internal moderator notes" icon={StickyNote}>
                    <ModeratorNotes key={request.id} request={request} />
                  </Section>

                  <Separator />

                  <Section title="Audit trail" icon={History}>
                    <RequestAuditTrail requestId={request.id} />
                    {pathname !== "/admin/audit" && (
                      <Button asChild variant="ghost" size="sm" className="justify-self-start">
                        <Link href="/admin/audit">
                          <History /> Open full audit log
                        </Link>
                      </Button>
                    )}
                  </Section>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
