"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Handshake, HandHeart, Heart, Sparkles, Users } from "lucide-react";
import { RequireAuth } from "@/components/layout/require-auth";
import { EmptyState, PageContainer, PageHeader, SimulatedNote, StatCard } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { RequestCard } from "@/components/requests/request-card";
import { ChartCard, DonutChart, SimpleBarChart, TrendAreaChart, type Datum } from "@/components/dashboard/charts";
import { CommitmentsList, ContributionHistory } from "@/components/dashboard/donor-sections";
import { CATEGORY_MAP } from "@/lib/constants";
import { formatCurrency, formatDate, toUsd } from "@/lib/utils";
import type { BillRequest } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useRequestsStore } from "@/store/requests-store";
import { useSavedIds } from "@/store/saved-store";
import { useSwipeHistory } from "@/store/swipe-store";

const WEEK = 7 * 86_400_000;

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

  const trend: Datum[] = React.useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 8 }, (_, i) => {
      const start = now - (8 - i) * WEEK;
      return { start, label: formatDate(new Date(start + WEEK).toISOString(), { day: "numeric", month: "short" }), value: 0 };
    });
    for (const c of completed) {
      const t = new Date(c.createdAt).getTime();
      const b = buckets.find((x) => t > x.start && t <= x.start + WEEK);
      if (b) b.value += toUsd(c.amount, c.currency);
    }
    return buckets.map((b) => ({ label: b.label, value: Math.round(b.value) }));
  }, [completed]);

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
            description="Last 8 weeks · ≈ USD, demo rates"
            className="lg:col-span-2"
            empty={completed.length === 0}
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

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-6">
        <CommitmentsList commitments={openCommitments} requestsById={requestsById} userId={session.userId} />
        <ContributionHistory contributions={mine} requestsById={requestsById} />
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
