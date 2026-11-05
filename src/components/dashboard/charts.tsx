"use client";

import * as React from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/basic";
import { cn, formatCurrency } from "@/lib/utils";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.65 0.12 20)", "oklch(0.7 0.1 120)"];

export interface Datum {
  label: string;
  value: number;
}

const usd = (v: number) => formatCurrency(v, "USD");

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number | string; name?: string; payload?: Datum }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-medium">{label ?? p.payload?.label ?? p.name}</p>
      <p className="text-muted-foreground">≈ {usd(Number(p.value ?? 0))} (simulated)</p>
    </div>
  );
}

export function ChartCard({
  title,
  description,
  children,
  className,
  empty,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1">
        {empty ? (
          <div className="grid h-56 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">No data yet</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function TrendAreaChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Simulated contributions over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={48} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#trend-fill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
      <div className="relative h-52 w-full" role="img" aria-label="Simulated contributions by category">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((d, i) => (
                <Cell key={d.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-lg font-semibold tabular-nums">{formatCurrency(total, "USD", { compact: true })}</p>
            <p className="text-[11px] text-muted-foreground">≈ USD total</p>
          </div>
        </div>
      </div>
      <ul className="grid gap-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SimpleBarChart({ data }: { data: Datum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Simulated contributions by country">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" width={48} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--chart-1)" maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
