"use client";

import type { CurrencyCode } from "@/lib/types";
import { cn, formatCurrency, percent, toUsd } from "@/lib/utils";
import { usePreferencesStore } from "@/store/preferences-store";
import { Progress } from "@/components/ui/primitives";

/** Renders an amount in its original currency, optionally with a fictional-rate USD equivalent. */
export function Money({
  amount,
  currency,
  compact,
  className,
  showUsdHint = true,
}: {
  amount: number;
  currency: CurrencyCode;
  compact?: boolean;
  className?: string;
  showUsdHint?: boolean;
}) {
  const display = usePreferencesStore((s) => s.currencyDisplay);
  const primary = formatCurrency(amount, currency, { compact });
  if (display === "usd" && currency !== "USD" && showUsdHint) {
    return (
      <span className={className}>
        {primary}
        <span className="ml-1 text-[0.8em] font-normal opacity-60">≈ {formatCurrency(toUsd(amount, currency), "USD", { compact })}</span>
      </span>
    );
  }
  return <span className={className}>{primary}</span>;
}

export function FundingProgress({
  raised,
  goal,
  currency,
  className,
  onDark,
  size = "default",
}: {
  raised: number;
  goal: number;
  currency: CurrencyCode;
  className?: string;
  onDark?: boolean;
  size?: "default" | "lg";
}) {
  const pct = percent(raised, goal);
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={cn("font-semibold", size === "lg" && "text-lg")}>
          <Money amount={raised} currency={currency} showUsdHint={false} />
          <span className={cn("ml-1 font-normal", onDark ? "text-white/70" : "text-muted-foreground")}>
            of <Money amount={goal} currency={currency} showUsdHint={false} />
          </span>
        </span>
        <span className={cn("text-xs font-medium tabular-nums", onDark ? "text-white/80" : "text-muted-foreground")}>{pct}%</span>
      </div>
      <Progress
        value={pct}
        aria-label={`${pct}% of the goal raised (simulated)`}
        className={cn(onDark && "bg-white/20", size === "lg" && "h-3")}
        indicatorClassName={cn(onDark && "bg-mint", "bg-gradient-to-r from-primary to-mint")}
      />
    </div>
  );
}
