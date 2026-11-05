"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurrencyCode } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/basic";
import { cn, formatCurrency } from "@/lib/utils";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.65 0.12 20)", "oklch(0.7 0.1 120)"];

export interface Datum {
  label: string;
  value: number;
}

const usd = (v: number) => formatCurrency(v, "USD");
const usdAxis = (v: number) => formatCurrency(v, "USD", { compact: true });

/** Charts animate on load unless the user prefers reduced motion. */
function useChartAnimation() {
  return !useReducedMotion();
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string; payload?: Datum }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-medium">{label ?? p.payload?.label ?? p.name}</p>
      <p className="tabular-nums">≈ {usd(Number(p.value ?? 0))}</p>
      <p className="text-muted-foreground">Simulated · fixed demo rates</p>
    </div>
  );
}

/** Screen-reader alternative to a chart: the same numbers as a table. */
function ChartDataTable({ caption, data, format = usd }: { caption: string; data: Datum[]; format?: (v: number) => string }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
        </table>
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  className,
  empty,
  emptyText = "No data yet",
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
  emptyText?: string;
  /** Controls shown next to the title, e.g. a range toggle. */
  actions?: React.ReactNode;
}) {
  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="grid gap-1.5">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="flex-1">
        {empty ? (
          <div className="grid h-56 place-items-center rounded-2xl border border-dashed px-6 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Segmented control for picking a time range. */
export function RangeToggle<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border bg-muted/50 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export const WEEK_RANGES = [
  { value: 4, label: "4W" },
  { value: 8, label: "8W" },
  { value: 12, label: "12W" },
  { value: 26, label: "6M" },
];

const WEEK_MS = 7 * 86_400_000;

/** Buckets dated values into the last `weeks` weeks. `label` is the bucket's end date. */
export function weeklySeries(points: { at: string; value: number }[], weeks: number, formatLabel: (d: Date) => string): Datum[] {
  const now = Date.now();
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = now - (weeks - i) * WEEK_MS;
    return { start, label: formatLabel(new Date(start + WEEK_MS)), value: 0 };
  });
  for (const p of points) {
    const t = new Date(p.at).getTime();
    const b = buckets.find((x) => t > x.start && t <= x.start + WEEK_MS);
    if (b) b.value += p.value;
  }
  return buckets.map((b) => ({ label: b.label, value: Math.round(b.value) }));
}

export function TrendAreaChart({ data, label = "Simulated contributions over time" }: { data: Datum[]; label?: string }) {
  const animate = useChartAnimation();
  return (
    <div className="w-full">
      <div className="h-56 w-full" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -6, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={52} tickFormatter={usdAxis} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#trend-fill)"
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={animate}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={`${label}, approximate USD at fixed demo rates`} data={data} />
    </div>
  );
}

export function DonutChart({ data, label = "Simulated contributions by category" }: { data: Datum[]; label?: string }) {
  const animate = useChartAnimation();
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const focused = activeIndex !== null ? data[activeIndex] : null;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
      <div className="relative h-52 w-full" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={animate}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.label}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                  className="transition-opacity"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(focused?.value ?? total, "USD", { compact: true })}</p>
            <p className="max-w-24 truncate text-[11px] text-muted-foreground">{focused ? focused.label : "≈ USD total"}</p>
          </div>
        </div>
      </div>
      <ChartDataTable caption={`${label}, approximate USD at fixed demo rates`} data={data} />
      <ul className="grid gap-1 text-sm">
        {data.map((d, i) => (
          <li key={d.label}>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50",
                activeIndex === i && "bg-muted",
              )}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onFocus={() => setActiveIndex(i)}
              onBlur={() => setActiveIndex(null)}
              aria-label={`${d.label}: ${usd(d.value)}, ${total ? Math.round((d.value / total) * 100) : 0}%`}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-muted-foreground">{d.label}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SimpleBarChart({ data, label = "Simulated contributions by country" }: { data: Datum[]; label?: string }) {
  const animate = useChartAnimation();
  return (
    <div className="w-full">
      <div className="h-56 w-full" role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -6, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={52} tickFormatter={usdAxis} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--chart-1)" maxBarSize={44} isAnimationActive={animate} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={`${label}, approximate USD at fixed demo rates`} data={data} />
    </div>
  );
}

export interface FundingDatum {
  label: string;
  pct: number;
  raised: number;
  goal: number;
  currency: CurrencyCode;
}

function FundingTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: FundingDatum }> }) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  return (
    <div className="max-w-56 rounded-xl border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-medium">{d.label}</p>
      <p className="tabular-nums">
        {formatCurrency(d.raised, d.currency)} of {formatCurrency(d.goal, d.currency)} · {d.pct}%
      </p>
      <p className="text-muted-foreground">Simulated progress</p>
    </div>
  );
}

/** Horizontal bars showing how far each request is towards its goal, in its own currency. */
export function FundingByRequestChart({ data }: { data: FundingDatum[] }) {
  const animate = useChartAnimation();
  const height = Math.max(160, data.length * 44 + 24);
  return (
    <div className="w-full">
      <div style={{ height }} role="img" aria-label="Simulated funding progress for each of your requests">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
            <YAxis
              type="category"
              dataKey="label"
              width={136}
              tickLine={false}
              axisLine={false}
              // Single-line labels: Recharts would otherwise wrap long titles into cramped stacks.
              tick={(props) => {
                const { x, y, payload } = props as unknown as { x: number; y: number; payload: { value: string } };
                const label = String(payload.value);
                return (
                  <text x={Number(x) - 6} y={y} dy={4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
                    {label.length > 20 ? `${label.slice(0, 19)}…` : label}
                  </text>
                );
              }}
            />
            <Tooltip content={<FundingTooltip />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="pct" radius={[0, 8, 8, 0]} maxBarSize={22} background={{ fill: "var(--muted)", radius: 8 }} isAnimationActive={animate}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.pct >= 100 ? "var(--chart-2)" : "var(--chart-1)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Simulated funding progress by request</caption>
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">Raised</th>
              <th scope="col">Goal</th>
              <th scope="col">Percent</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{formatCurrency(d.raised, d.currency)}</td>
                <td>{formatCurrency(d.goal, d.currency)}</td>
                <td>{d.pct}%</td>
              </tr>
            ))}
          </tbody>
          </table>
      </div>
    </div>
  );
}
