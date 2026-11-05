"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Handshake, HandHeart, Heart, Sparkles, Users } from "lucide-react";
import { RequireAuth } from "@/components/layout/require-auth";
import { EmptyState, PageContainer, PageHeader, SimulatedNote, StatCard } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/requests/request-card";
import {
  ChartCard,
  DonutChart,
  RangeToggle,
  SimpleBarChart,
  TrendAreaChart,
  WEEK_RANGES,
  weeklySeries,
  type Datum,
} from "@/components/dashboard/charts";
import { CommitmentsList, ContributionHistory } from "@/components/dashboard/donor-sections";
import { ActivityTimeline, type TimelineEntry } from "@/components/dashboard/timeline";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatCurrency, formatDate, toUsd } from "@/lib/utils";
import type { BillRequest } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useRequestsStore } from "@/store/requests-store";
import { useSavedIds } from "@/store/saved-store";
import { useSwipeHistory } from "@/store/swipe-store";

function DonorDashboard() {
  const session = useAuthStore((s) => s.session)!;
  const allContributions = useContributionsStore((s) => s.contributions);
  const requests = useRequestsStore((s) => s.requests);
  const savedIds = useSavedIds(session.userId);
  const swipes = useSwipeHistory(session.userId);

  const requestsById = React.useMemo(() => new Map<string, BillRequest>(requests.map((r) => [r.id, r])), [requests]);
  const mine = React.useMemo(() => allContributions.filter((c) => c.userId === session.userId), [allContributions, session.userId]);
  const completed = React.useMemo(() => mine.filter((c) => c.status === "recorded" || c.status === "fulfilled"), [mine]);
  const openCommitments = mine.filter((c) => c.kind === "commitment" && c.status === "open");

  const totalUsd = completed.reduce((s, c) => s + toUsd(c.amount, c.currency), 0);
  const peopleHelped = new Set(completed.map((c) => c.requestId)).size;

  const interested = swipes
    .filter((s) => s.direction === "right")
    .map((s) => requestsById.get(s.requestId))
    .filter((r): r is BillRequest => !!r)
    .reverse();
  const saved = savedIds.map((id) => requestsById.get(id)).filter((r): r is BillRequest => !!r);

  const [weeks, setWeeks] = React.useState(8);
  const trend: Datum[] = React.useMemo(
    () =>
      weeklySeries(
        completed.map((c) => ({ at: c.createdAt, value: toUsd(c.amount, c.currency) })),
        weeks,
        (d) => formatDate(d.toISOString(), { day: "numeric", month: "short" }),
      ),
    [completed, weeks],
  );
  const trendHasData = trend.some((d) => d.value > 0);

  const timeline: TimelineEntry[] = React.useMemo(() => {
    const title = (id: string) => requestsById.get(id)?.title ?? "a request";
    const fromContribs: TimelineEntry[] = mine.map((c) => {
      const amount = <strong className="font-medium">{formatCurrency(c.amount, c.currency)}</strong>;
      const target = <>&ldquo;{title(c.requestId)}&rdquo;</>;
      const base = { id: c.id, createdAt: c.createdAt, href: `/requests/${c.requestId}` };
      if (c.kind === "simulated") return { ...base, kind: "contribution", text: <>You made a simulated contribution of {amount} to {target}</> };
      if (c.status === "fulfilled") return { ...base, kind: "fulfilled", text: <>You fulfilled your {amount} commitment to {target} (simulated)</> };
      if (c.status === "cancelled") return { ...base, kind: "cancelled", text: <>You cancelled a {amount} commitment to {target}</> };
      return { ...base, kind: "commitment", text: <>You committed {amount} to {target} for later</> };
    });
    const fromSwipes: TimelineEntry[] = swipes
      .filter((s) => s.direction === "right")
      .map((s) => ({
        id: `swipe_${s.requestId}`,
        kind: "interest",
        createdAt: s.at,
        href: `/requests/${s.requestId}`,
        text: <>You showed interest in &ldquo;{title(s.requestId)}&rdquo;</>,
      }));
    return [...fromContribs, ...fromSwipes];
  }, [mine, swipes, requestsById]);

  const byCategory: Datum[] = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of completed) {
      const r = requestsById.get(c.requestId);
      if (!r) continue;
      const k = CATEGORY_MAP[r.category].label;
      m.set(k, (m.get(k) ?? 0) + toUsd(c.amount, c.currency));
    }
    return [...m].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [completed, requestsById]);

  const byCountry: Datum[] = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const c of completed) {
      const r = requestsById.get(c.requestId);
      if (!r) continue;
      m.set(r.country, (m.get(r.country) ?? 0) + toUsd(c.amount, c.currency));
    }
    return [...m].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [completed, requestsById]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Donor dashboard"
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        description="Track your simulated impact, commitments and the requests you care about."
        actions={
          <Button asChild>
            <Link href="/discover">
              <Sparkles /> Discover requests
            </Link>
          </Button>
        }
      />
      <SimulatedNote className="mb-6" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total simulated contributions"
          value={formatCurrency(totalUsd, "USD")}
          hint={`≈ USD at demo rates · ${completed.length} contribution${completed.length === 1 ? "" : "s"}`}
          icon={HandHeart}
          tone="primary"
        />
        <StatCard label="Requests supported" value={peopleHelped} hint="Distinct fictional requests (simulated)" icon={Users} />
        <StatCard label="Saved requests" value={savedIds.length} hint={`${interested.length} marked interested`} icon={Bookmark} />
        <StatCard label="Active commitments" value={openCommitments.length} hint="Open pledges to fulfil later" icon={Handshake} tone="warning" />
      </div>

      <section aria-labelledby="impact-heading" className="mt-10 grid gap-4">
        <h2 id="impact-heading" className="text-lg font-semibold tracking-tight">
          Impact statistics
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard
            title="Contributions over time"
            description={`${weeks === 26 ? "Last 6 months" : `Last ${weeks} weeks`} · ≈ USD at fixed demo rates`}
            className="lg:col-span-2"
            empty={!trendHasData}
            emptyText={completed.length === 0 ? "No simulated contributions yet" : "No simulated contributions in this period. Try a longer range."}
            actions={<RangeToggle label="Time range" value={weeks} options={WEEK_RANGES} onChange={setWeeks} />}
          >
            <TrendAreaChart data={trend} />
          </ChartCard>
          <ChartCard title="By category" description="Share of simulated support" empty={byCategory.length === 0}>
            <DonutChart data={byCategory} />
          </ChartCard>
        </div>
        <ChartCard title="By country" description="Where your simulated support went · ≈ USD" empty={byCountry.length === 0}>
          <SimpleBarChart data={byCountry} />
        </ChartCard>
      </section>

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <CommitmentsList commitments={openCommitments} requestsById={requestsById} userId={session.userId} />
          <ContributionHistory contributions={mine} requestsById={requestsById} />
        </div>
        <ActivityTimeline
          className="xl:sticky xl:top-24 xl:self-start"
          description="Your interest, pledges and simulated contributions."
          entries={timeline}
          emptyText="Swipe right on a request or simulate a contribution to start your timeline."
        />
      </div>

      <section aria-labelledby="interested-heading" className="mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="interested-heading" className="text-lg font-semibold tracking-tight">
            Interested & saved
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/saved">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
        {interested.length + saved.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            description="Swipe right on a request in Discover or tap the bookmark to keep it here."
            action={
              <Button asChild>
                <Link href="/discover">Start swiping</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...new Map([...interested, ...saved].map((r) => [r.id, r])).values()].slice(0, 3).map((r) => (
              <RequestCard key={r.id} request={r} showStatus />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}

export default function DonorDashboardPage() {
  return (
    <RequireAuth>
      <DonorDashboard />
    </RequireAuth>
  );
}
