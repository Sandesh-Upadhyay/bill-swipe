"use client";

import { ListChecks, ReceiptText } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { breakdownTotal, getBreakdown } from "@/lib/data/breakdowns";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/basic";

const BAR_TONES = ["bg-primary", "bg-mint", "bg-sky-500", "bg-amber-500", "bg-rose-500"];

/** Itemised bill lines with a proportional bar, so donors can see exactly what the amount covers. */
export function BillBreakdown({ request, className }: { request: BillRequest; className?: string }) {
  const items = getBreakdown(request);
  const total = breakdownTotal(items);
  const matches = items.length > 0 && total === request.amount;

  return (
    <Card className={cn("p-6 sm:p-8", className)} aria-labelledby="breakdown-heading">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 id="breakdown-heading" className="flex items-center gap-2 text-lg font-semibold">
            <ReceiptText className="size-5 text-primary" /> Bill breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">What the requested amount covers, as itemised by the requester.</p>
        </div>
        {items.length > 0 && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{request.currency}</span>}
      </div>

      {items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          <ListChecks className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong className="text-foreground">Not itemised.</strong> The requester gave a single total without a breakdown. Itemised requests are
            easier for moderators to review.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            {items.map((item, i) => (
              <span
                key={item.label}
                className={cn("h-full first:rounded-l-full last:rounded-r-full", BAR_TONES[i % BAR_TONES.length])}
                style={{ width: `${(item.amount / Math.max(total, 1)) * 100}%` }}
              />
            ))}
          </div>
          <table className="w-full text-sm">
            <caption className="sr-only">Itemised bill lines for this request</caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, i) => (
                <tr key={item.label}>
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <span className={cn("size-2.5 shrink-0 rounded-full", BAR_TONES[i % BAR_TONES.length])} aria-hidden />
                      {item.label}
                    </span>
                  </th>
                  <td className="py-2.5 text-right font-medium tabular-nums">{formatCurrency(item.amount, request.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <th scope="row" className="pt-3 text-left font-semibold">
                  Total requested
                </th>
                <td className="pt-3 text-right font-semibold tabular-nums">{formatCurrency(total, request.currency)}</td>
              </tr>
            </tfoot>
          </table>
          {!matches && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              The itemised lines add up to {formatCurrency(total, request.currency)}, which differs from the requested{" "}
              {formatCurrency(request.amount, request.currency)}.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
