"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FilePlus2, FileText, Hourglass, PiggyBank, Wallet } from "lucide-react";
import { RequireAuth } from "@/components/layout/require-auth";
import { EmptyState, PageContainer, PageHeader, SimulatedNote, StatCard } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { ActivityFeed, OwnRequestCard } from "@/components/dashboard/requester-sections";
import { RequesterWelcome, TAB_EMPTY } from "@/components/dashboard/requester-welcome";
import {
  ChartCard,
  FundingByRequestChart,
  RangeToggle,
  TrendAreaChart,
  WEEK_RANGES,
  weeklySeries,
  type FundingDatum,
} from "@/components/dashboard/charts";
import type { BillRequest, CurrencyCode } from "@/lib/types";
import { formatCurrency, formatDate, percent, toUsd } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useRequestsStore } from "@/store/requests-store";

function MoneyStat({ items, pick }: { items: BillRequest[]; pick: (r: BillRequest) => number }) {
  const currencies = [...new Set(items.map((r) => r.currency))];
  if (currencies.length <= 1) {
    const cur: CurrencyCode = currencies[0] ?? "USD";
    return <>{formatCurrency(items.reduce((s, r) => s + pick(r), 0), cur)}</>;
  }
  return <>≈ {formatCurrency(items.reduce((s, r) => s + toUsd(pick(r), r.currency), 0), "USD")}</>;
}

function perCurrencyHint(items: BillRequest[], pick: (r: BillRequest) => number, base: string) {
  const currencies = [...new Set(items.map((r) => r.currency))];
  if (currencies.length <= 1) return base;
  const parts = currencies.map((c) =>
    formatCurrency(
      items.filter((r) => r.currency === c).reduce((s, r) => s + pick(r), 0),
      c,
    ),
  );
  return `USD at demo rates · ${parts.join(" + ")}`;
}

const TABS = [
  { id: "active", label: "Active", match: (r: BillRequest) => r.status === "active" },
  { id: "pending", label: "Pending review", match: (r: BillRequest) => r.status === "pending_review" || r.status === "needs_info" },
  { id: "completed", label: "Completed", match: (r: BillRequest) => r.status === "completed" },
  { id: "closed", label: "Withdrawn / rejected", match: (r: BillRequest) => r.status === "withdrawn" || r.status === "rejected" },
] as const;

function RequesterDashboard() {
  const session = useAuthStore((s) => s.session)!;
  const requests = useRequestsStore((s) => s.requests);
  const activity = useRequestsStore((s) => s.activity);
  const contributions = useContributionsStore((s) => s.contributions);

  const mine = React.useMemo(
    () => requests.filter((r) => r.userId === session.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [requests, session.userId],
  );
  const counted = mine.filter((r) => r.status !== "withdrawn" && r.status !== "rejected");
  const requestsById = React.useMemo(() => new Map(mine.map((r) => [r.id, r])), [mine]);
  const myActivity = React.useMemo(() => activity.filter((a) => a.userId === session.userId), [activity, session.userId]);
  const myContribs = React.useMemo(() => contributions.filter((c) => requestsById.has(c.requestId)), [contributions, requestsById]);

  const count = (fn: (r: BillRequest) => boolean) => mine.filter(fn).length;

  const [weeks, setWeeks] = React.useState(8);
  const received = React.useMemo(() => myContribs.filter((c) => c.status === "recorded" || c.status === "fulfilled"), [myContribs]);
  const supportTrend = React.useMemo(
    () =>
      weeklySeries(
        received.map((c) => ({ at: c.createdAt, value: toUsd(c.amount, c.currency) })),
        weeks,
        (d) => formatDate(d.toISOString(), { day: "numeric", month: "short" }),
      ),
    [received, weeks],
  );
  const funding: FundingDatum[] = React.useMemo(
    () =>
      counted
        .filter((r) => r.status !== "pending_review")
        .map((r) => ({ label: r.title, pct: percent(r.amountRaised, r.amount), raised: r.amountRaised, goal: r.amount, currency: r.currency })),
    [counted],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Requester dashboard"
        title={`Hi ${session.name.split(" ")[0]}, here's where things stand`}
        description="Manage your bill requests, respond to moderators and follow simulated progress."
        actions={
          <Button asChild>
            <Link href="/submit">
              <FilePlus2 /> Submit a new bill
            </Link>
          </Button>
        }
      />
      <SimulatedNote className="mb-6">
        Amounts received are simulated. No money has been collected or paid out — BillSwipe is a prototype.
      </SimulatedNote>

      {mine.length === 0 ? (
        <RequesterWelcome name={session.name.split(" ")[0]} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total amount requested"
              value={<MoneyStat items={counted} pick={(r) => r.amount} />}
              hint={perCurrencyHint(counted, (r) => r.amount, "Across your open and completed requests")}
              icon={FileText}
            />
            <StatCard
              label="Simulated amount received"
              value={<MoneyStat items={counted} pick={(r) => r.amountRaised} />}
              hint={perCurrencyHint(counted, (r) => r.amountRaised, "Simulated — not real funds")}
              icon={PiggyBank}
              tone="primary"
            />
            <StatCard
              label="Remaining balance"
              value={<MoneyStat items={counted} pick={(r) => Math.max(0, r.amount - r.amountRaised)} />}
              hint={perCurrencyHint(counted, (r) => Math.max(0, r.amount - r.amountRaised), "Still outstanding (simulated)")}
              icon={Wallet}
              tone="warning"
            />
            <StatCard label="Active requests" value={count(TABS[0].match)} hint="Visible in Discover" icon={Clock} tone="primary" />
            <StatCard label="Pending review" value={count(TABS[1].match)} hint="Including requests needing more info" icon={Hourglass} tone="warning" />
            <StatCard label="Completed" value={count(TABS[2].match)} hint="Goal reached (simulated)" icon={CheckCircle2} />
          </div>

          {mine.length > 0 && (
            <section aria-labelledby="progress-heading" className="mt-10 grid gap-4">
              <h2 id="progress-heading" className="text-lg font-semibold tracking-tight">
                Progress
              </h2>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Funding by request"
                  description="Share of each goal reached · simulated, in each request's own currency"
                  empty={funding.length === 0}
                  emptyText="Funding progress appears once a request is approved."
                >
                  <FundingByRequestChart data={funding} />
                </ChartCard>
                <ChartCard
                  title="Simulated support received"
                  description={`${weeks === 26 ? "Last 6 months" : `Last ${weeks} weeks`} · ≈ USD at fixed demo rates`}
                  empty={!supportTrend.some((d) => d.value > 0)}
                  emptyText={received.length === 0 ? "No simulated contributions yet." : "No simulated contributions in this period. Try a longer range."}
                  actions={<RangeToggle label="Time range" value={weeks} options={WEEK_RANGES} onChange={setWeeks} />}
                >
                  <TrendAreaChart data={supportTrend} label="Simulated support received over time" />
                </ChartCard>
              </div>
            </section>
          )}

          <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-labelledby="my-requests">
              <h2 id="my-requests" className="mb-4 text-lg font-semibold tracking-tight">
                My requests
              </h2>
              <Tabs defaultValue={TABS.find((t) => count(t.match) > 0)?.id ?? "active"}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-none">
                  <TabsList>
                    {TABS.map((t) => (
                      <TabsTrigger key={t.id} value={t.id}>
                        {t.label}
                        <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{count(t.match)}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {TABS.map((t) => {
                  const list = mine.filter(t.match);
                  return (
                    <TabsContent key={t.id} value={t.id} className="mt-5 grid gap-4">
                      {list.length === 0 ? (
                        <EmptyState
                          icon={FileText}
                          title={TAB_EMPTY[t.id].title}
                          description={TAB_EMPTY[t.id].description}
                          className="py-10"
                          action={
                            t.id !== "closed" ? (
                              <Button asChild variant="outline" size="sm">
                                <Link href="/submit">
                                  <FilePlus2 /> Submit a bill
                                </Link>
                              </Button>
                            ) : undefined
                          }
                        />
                      ) : (
                        list.map((r) => <OwnRequestCard key={r.id} request={r} userId={session.userId} />)
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </section>
            <aside>
              <ActivityFeed activity={myActivity} contributions={myContribs} requestsById={requestsById} />
            </aside>
          </div>
        </>
      )}
    </PageContainer>
  );
}

export default function RequesterDashboardPage() {
  return (
    <RequireAuth>
      <RequesterDashboard />
    </RequireAuth>
  );
}
