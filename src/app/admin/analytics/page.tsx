"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Gauge, HandCoins, ListChecks, Percent } from "lucide-react";
import { PageHeader, StatCard } from "@/components/layout/page-parts";
import { useRequestsStore } from "@/store/requests-store";
import { useContributionsStore } from "@/store/contributions-store";
import { CATEGORIES, COUNTRIES, STATUS_META } from "@/lib/constants";
import { formatCurrency, formatNumber, percent, toUsd } from "@/lib/utils";
import { CHART_COLORS, ChartCard, ChartTooltip, axisProps, useContributionSeries, usdFormatter } from "@/components/admin/charts";
import { RangeToggle } from "@/components/dashboard/charts";

const tooltipCursor = { fill: "var(--muted)", opacity: 0.5 };

export default function AdminAnalyticsPage() {
  const requests = useRequestsStore((s) => s.requests);
  const contributions = useContributionsStore((s) => s.contributions);
  const [days, setDays] = React.useState(30);
  const series = useContributionSeries(contributions, days);

  const byCategory = React.useMemo(
    () =>
      CATEGORIES.map((c) => {
        const rs = requests.filter((r) => r.category === c.id);
        return {
          name: c.label,
          requests: rs.length,
          requestedUsd: Math.round(rs.reduce((s, r) => s + toUsd(r.amount, r.currency), 0)),
          raisedUsd: Math.round(rs.reduce((s, r) => s + toUsd(r.amountRaised, r.currency), 0)),
        };
      }),
    [requests],
  );

  const byCountry = React.useMemo(
    () =>
      COUNTRIES.map((c) => ({
        name: c.code,
        label: `${c.flag} ${c.name}`,
        requests: requests.filter((r) => r.country === c.code).length,
      })).filter((c) => c.requests > 0),
    [requests],
  );

  const byStatus = React.useMemo(
    () =>
      (Object.keys(STATUS_META) as (keyof typeof STATUS_META)[])
        .map((s) => ({ name: STATUS_META[s].label, value: requests.filter((r) => r.status === s).length }))
        .filter((s) => s.value > 0),
    [requests],
  );

  const progressBuckets = React.useMemo(() => {
    const buckets = [
      { name: "0–24%", count: 0 },
      { name: "25–49%", count: 0 },
      { name: "50–74%", count: 0 },
      { name: "75–99%", count: 0 },
      { name: "100%", count: 0 },
    ];
    for (const r of requests.filter((x) => x.status === "active" || x.status === "completed")) {
      const p = percent(r.amountRaised, r.amount);
      buckets[p >= 100 ? 4 : Math.min(3, Math.floor(p / 25))].count += 1;
    }
    return buckets;
  }, [requests]);

  const live = requests.filter((r) => r.status === "active" || r.status === "completed");
  const requestedUsd = live.reduce((s, r) => s + toUsd(r.amount, r.currency), 0);
  const raisedUsd = live.reduce((s, r) => s + toUsd(r.amountRaised, r.currency), 0);
  const approvalRate = percent(
    requests.filter((r) => r.verification === "demo_approved").length,
    requests.filter((r) => r.verification === "demo_approved" || r.verification === "rejected").length,
  );
  const periodTotal = series.reduce((s, b) => s + b.usd, 0);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Platform health across categories and countries. All amounts are simulated USD equivalents at fictional demo rates."
        className="mb-2"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requested (live)" value={formatCurrency(requestedUsd, "USD", { compact: true })} hint={`${live.length} active or completed`} icon={ListChecks} />
        <StatCard label="Raised (simulated)" value={formatCurrency(raisedUsd, "USD", { compact: true })} hint={`${percent(raisedUsd, requestedUsd)}% of requested`} icon={HandCoins} tone="primary" />
        <StatCard
          label={`Last ${days} days (simulated)`}
          value={formatCurrency(periodTotal, "USD", { compact: true })}
          hint="Recorded contributions · ≈ USD at demo rates"
          icon={Gauge}
          tone="primary"
        />
        <StatCard label="Demo approval rate" value={`${approvalRate}%`} hint="Demo-approved vs rejected" icon={Percent} />
      </div>

      <ChartCard
        title="Simulated contributions over time"
        description={`Daily total, last ${days} days · ≈ USD at fixed demo rates`}
        action={
          <RangeToggle
            label="Time range"
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: "7D" },
              { value: 30, label: "30D" },
              { value: 90, label: "90D" },
            ]}
          />
        }
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -8, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="an-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...axisProps} width={56} tickFormatter={(v: number) => `$${formatNumber(v, true)}`} />
              <Tooltip content={<ChartTooltip valueFormatter={usdFormatter} />} />
              <Area type="monotone" dataKey="usd" name="Simulated (USD)" stroke="var(--chart-1)" strokeWidth={2} fill="url(#an-area)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Requests by category" description="Requested vs raised (simulated) · ≈ USD at fixed demo rates">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
                <YAxis {...axisProps} width={56} tickFormatter={(v: number) => `$${formatNumber(v, true)}`} />
                <Tooltip cursor={tooltipCursor} content={<ChartTooltip valueFormatter={usdFormatter} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="requestedUsd" name="Requested" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="raisedUsd" name="Raised (simulated)" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Requests by country" description="Number of requests per country">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCountry} layout="vertical" margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="name" {...axisProps} width={36} />
                <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} />
                <Bar dataKey="requests" name="Requests" radius={[0, 6, 6, 0]}>
                  {byCountry.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Status breakdown" description="Share of requests by moderation status">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTooltip />} />
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Funding progress distribution" description="Active and completed requests by % of goal (simulated)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressBuckets} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip cursor={tooltipCursor} content={<ChartTooltip />} />
                <Bar dataKey="count" name="Requests" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
