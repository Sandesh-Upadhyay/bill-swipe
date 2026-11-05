"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, ExternalLink, FileText, Flag, HandCoins, ShieldAlert, Users } from "lucide-react";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { Badge } from "@/components/ui/basic";
import { Separator } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { CategoryBadge, CountryLabel, FictionalTag, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress } from "@/components/requests/money";
import { useRequestsStore } from "@/store/requests-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useAdminStore } from "@/store/admin-store";
import { REPORT_REASONS } from "@/lib/constants";
import { formatCurrency, formatDate, dueLabel, timeAgo } from "@/lib/utils";
import { ModerationActions } from "./moderation-actions";

function Section({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" /> {title}
      </h3>
      {children}
    </section>
  );
}

/** Admin detail drawer. Always reads the live request from the store so actions reflect immediately. */
export function RequestDetailDrawer({ requestId, onOpenChange }: { requestId: string | null; onOpenChange: (open: boolean) => void }) {
  const request = useRequestsStore((s) => s.requests.find((r) => r.id === requestId));
  const allReports = useRequestsStore((s) => s.reports);
  const allContributions = useContributionsStore((s) => s.contributions);
  const users = useAdminStore((s) => s.users);

  const reports = React.useMemo(() => allReports.filter((r) => r.requestId === requestId), [allReports, requestId]);
  const contributions = React.useMemo(() => allContributions.filter((c) => c.requestId === requestId), [allContributions, requestId]);
  const requester = users.find((u) => u.id === request?.userId);
  const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

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
            <div className="border-b p-6 pr-12">
              <div className="flex items-start gap-4">
                <DemoAvatar seed={request.image} className="size-14" rounded="2xl" label={request.name} />
                <div className="grid min-w-0 gap-1">
                  <SheetTitle className="text-lg leading-snug">{request.title}</SheetTitle>
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
            </div>

            <div className="grid gap-7 p-6">
              <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4">
                <ModerationActions request={request} />
                <p className="text-xs text-muted-foreground">
                  Demo-approval is a prototype moderation state and never an independent verification of the person or bill.
                </p>
                {request.adminNote && (
                  <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
                    <strong>Moderator note:</strong> {request.adminNote}
                  </p>
                )}
              </div>

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
                <p className="text-sm font-medium">{request.summary}</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{request.story}</p>
              </Section>

              <Section title="Bill document" icon={ShieldAlert}>
                {request.document ? (
                  <div className="flex items-center gap-3 rounded-2xl border p-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-muted">
                      <FileText className="size-4" />
                    </span>
                    <div className="grid text-sm">
                      <span className="font-medium">{request.document.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {request.document.type} · {request.document.sizeKb} KB · metadata only
                      </span>
                    </div>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  No document stored — this prototype never uploads or stores bill documents. Only file metadata is kept for review simulation.
                </p>
              </Section>

              <Section title="Requester" icon={Users}>
                <div className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                  <div className="flex items-center gap-3">
                    <DemoAvatar seed={requester?.image ?? request.image} className="size-10" label={request.name} />
                    <div className="grid text-sm">
                      <span className="font-medium">{requester?.name ?? request.name}</span>
                      <span className="text-xs text-muted-foreground">{requester?.email ?? "Local demo account"}</span>
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
                        <p className="mt-1 text-muted-foreground">{rep.details}</p>
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
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
