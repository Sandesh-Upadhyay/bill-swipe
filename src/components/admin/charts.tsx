"use client";

import * as React from "react";
import type { Contribution } from "@/lib/types";
import { formatCurrency, formatDate, toUsd } from "@/lib/utils";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

/** Themed Recharts tooltip. */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v: number) => String(v),
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lift">
      {label !== undefined && label !== "" && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color ?? (p.payload?.fill as string) }} />
          <span>{p.name}</span>
          <span className="ml-auto font-medium text-foreground tabular-nums">{valueFormatter(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

export const usdFormatter = (v: number) => formatCurrency(v, "USD");

/** Simulated contributions (USD-equivalent at fictional rates) per day for the last N days. */
export function useContributionSeries(contributions: Contribution[], days = 30) {
  return React.useMemo(() => {
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * 86_400_000;
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(start + i * 86_400_000);
      return { key: d.toISOString().slice(0, 10), label: formatDate(d.toISOString(), { day: "numeric", month: "short" }), usd: 0, count: 0 };
    });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const c of contributions) {
      if (c.kind === "commitment" && c.status !== "fulfilled") continue;
      const i = idx.get(c.createdAt.slice(0, 10));
      if (i === undefined) continue;
      buckets[i].usd += Math.round(toUsd(c.amount, c.currency));
      buckets[i].count += 1;
    }
    return buckets;
  }, [contributions, days]);
}

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-5 shadow-soft ${className ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
