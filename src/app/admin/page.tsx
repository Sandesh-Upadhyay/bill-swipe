"use client";

import * as React from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ClipboardCheck, Flag, HandCoins, ListChecks, Users } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { useRequestsStore } from "@/store/requests-store";
import { useAdminStore } from "@/store/admin-store";
import { useContributionsStore } from "@/store/contributions-store";
import { formatCurrency, formatNumber, timeAgo, toUsd } from "@/lib/utils";
import { ChartCard, ChartTooltip, axisProps, useContributionSeries, usdFormatter } from "@/components/admin/charts";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";
import { ActivityTimeline } from "@/components/dashboard/timeline";

export default function AdminOverviewPage() {
  const requests = useRequestsStore((s) => s.requests);
  const reports = useRequestsStore((s) => s.reports);
  const users = useAdminStore((s) => s.users);
  const moderationLog = useAdminStore((s) => s.moderationLog);
  const contributions = useContributionsStore((s) => s.contributions);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const simulated = contributions.filter((c) => c.kind === "simulated" || c.status === "fulfilled");
  const totalUsd = simulated.reduce((sum, c) => sum + toUsd(c.amount, c.currency), 0);
  const queue = requests.filter((r) => r.status === "pending_review" || r.status === "needs_info");
  const openReports = reports.filter((r) => r.status === "open");
  const recent = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const series = useContributionSeries(contributions, 30);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Overview"
        title="Moderation at a glance"
        description="Fictional demo data stored in this browser. Contribution figures are simulated — no money moves through BillSwipe."
        className="mb-2"
        actions={
          <Button asChild>
            <Link href="/admin/verification">
              <ClipboardCheck /> Review queue ({queue.length})
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total users" value={formatNumber(users.length)} hint={`${users.filter((u) => u.status === "suspended").length} suspended`} icon={Users} />
        <StatCard
          label="Active requests"
          value={formatNumber(requests.filter((r) => r.status === "active").length)}
          hint={`${requests.length} total requests`}
          icon={ListChecks}
          tone="primary"
        />
        <StatCard label="Pending review" value={queue.length} hint="Pending or awaiting info" icon={ClipboardCheck} tone="warning" />
        <StatCard label="Open reports" value={openReports.length} hint={`${reports.length} reports all-time`} icon={Flag} tone="warning" />
        <StatCard
          label="Simulated contributions"
          value={formatCurrency(totalUsd, "USD", { compact: true })}
          hint={`${simulated.length} records · USD equiv., fictional rates`}
          icon={HandCoins}
          tone="primary"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard title="Simulated contributions" description="Last 30 days · USD equivalent at fictional demo rates">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="ov-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={6} />
                <YAxis {...axisProps} width={56} tickFormatter={(v: number) => `$${formatNumber(v, true)}`} />
                <Tooltip content={<ChartTooltip valueFormatter={usdFormatter} />} />
                <Area type="monotone" dataKey="usd" name="Simulated (USD)" stroke="var(--chart-1)" strokeWidth={2} fill="url(#ov-area)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Verification queue"
          description="Oldest first"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/verification">
                View all <ArrowRight />
              </Link>
            </Button>
          }
        >
          {queue.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="Queue is clear" description="No requests are waiting for review." className="py-8" />
          ) : (
            <ul className="grid gap-2">
              {[...queue]
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
                .slice(0, 5)
                .map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => setOpenId(r.id)}
                      className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-muted/60"
                    >
                      <DemoAvatar seed={r.image} className="size-9" label={r.name} />
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate text-sm font-medium">{r.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.name} · {timeAgo(r.createdAt)}
                        </span>
                      </span>
                      <StatusBadge status={r.status} />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ChartCard
          title="Recent requests"
          description="Newest submissions across all countries"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/requests">
                All requests <ArrowRight />
              </Link>
            </Button>
          }
        >
          <ul className="divide-y">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setOpenId(r.id)}
                  className="flex w-full flex-col gap-2 py-3 text-left transition hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:px-2"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <DemoAvatar seed={r.image} className="size-9" label={r.name} />
                    <span className="grid min-w-0">
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.name} · {r.city} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatCurrency(r.amount, r.currency)}</span>
                    <StatusBadge status={r.status} />
                    <VerificationBadge state={r.verification} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ActivityTimeline
          title="Moderation log"
          description="Every moderator decision made in this browser, newest first."
          entries={moderationLog.map((m) => ({
            id: m.id,
            kind: m.kind,
            text: m.text,
            createdAt: m.createdAt,
            href: m.requestId ? `/requests/${m.requestId}` : m.userId ? "/admin/users" : m.kind === "category" ? "/admin/categories" : undefined,
          }))}
          emptyText="Approvals, rejections, flags, report decisions and user changes will be recorded here."
          initialCount={6}
        />
      </div>

      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
