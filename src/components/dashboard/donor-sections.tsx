"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Handshake, Search, X } from "lucide-react";
import type { BillRequest, Contribution } from "@/lib/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/basic";
import { ConfirmDialog } from "@/components/ui/overlays";
import { EmptyState } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { CategoryBadge } from "@/components/requests/badges";
import { useContributionsStore } from "@/store/contributions-store";
import { useNotificationsStore } from "@/store/notifications-store";

export function ContributionKindBadge({ c }: { c: Contribution }) {
  const map: Record<string, { label: string; tone: string }> = {
    recorded: { label: "Simulated", tone: "bg-emerald-500/14 text-emerald-800 dark:text-emerald-300" },
    open: { label: "Commitment · open", tone: "bg-sky-500/14 text-sky-800 dark:text-sky-300" },
    fulfilled: { label: "Commitment · fulfilled", tone: "bg-teal-500/14 text-teal-800 dark:text-teal-300" },
    cancelled: { label: "Commitment · cancelled", tone: "bg-zinc-500/14 text-zinc-700 dark:text-zinc-300" },
  };
  const m = map[c.status];
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", m.tone)}>{m.label}</span>;
}

export function CommitmentsList({
  commitments,
  requestsById,
  userId,
}: {
  commitments: Contribution[];
  requestsById: Map<string, BillRequest>;
  userId: string;
}) {
  const fulfil = useContributionsStore((s) => s.fulfillCommitment);
  const cancel = useContributionsStore((s) => s.cancelCommitment);
  const push = useNotificationsStore((s) => s.push);
  const [cancelId, setCancelId] = React.useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="size-4 text-primary" /> Active commitments
        </CardTitle>
        <CardDescription>Pledges you saved for later. Fulfilling one records a simulated contribution — nothing is charged.</CardDescription>
      </CardHeader>
      <CardContent>
        {commitments.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No open commitments"
            description="Choose “Commit for later” when contributing to a request to track a pledge here."
            className="py-10"
          />
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {commitments.map((c) => {
              const r = requestsById.get(c.requestId);
              return (
                <li key={c.id} className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <DemoAvatar seed={r?.image ?? c.requestId} className="size-11" label={r?.name} />
                    <div className="min-w-0">
                      <Link href={`/requests/${c.requestId}`} className="block truncate font-medium hover:text-primary">
                        {r?.title ?? "Request unavailable"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r?.name ?? "Unknown"} · pledged {formatDate(c.createdAt)} ·{" "}
                        <span className="font-medium text-foreground">{formatCurrency(c.amount, c.currency)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const res = fulfil(c.id);
                        if (!res.ok) {
                          toast.error(res.error);
                          return;
                        }
                        push(userId, {
                          title: "Commitment fulfilled (simulated)",
                          body: `${formatCurrency(c.amount, c.currency)} recorded for “${r?.title ?? "a request"}”. No real money moved.`,
                          href: `/requests/${c.requestId}`,
                          tone: "success",
                        });
                        toast.success("Commitment fulfilled — simulated contribution recorded. No money was moved.");
                      }}
                    >
                      <CheckCircle2 /> Fulfil (simulated)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setCancelId(c.id)}>
                      <X /> Cancel
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Cancel this commitment?"
        description="The pledge will be marked as cancelled. You can always make a new one later."
        confirmLabel="Cancel commitment"
        destructive
        onConfirm={() => {
          if (cancelId) cancel(cancelId);
          setCancelId(null);
          toast.success("Commitment cancelled");
        }}
      />
    </Card>
  );
}

export function ContributionHistory({
  contributions,
  requestsById,
}: {
  contributions: Contribution[];
  requestsById: Map<string, BillRequest>;
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "simulated" | "commitment">("all");

  const rows = contributions.filter((c) => {
    if (filter !== "all" && c.kind !== filter) return false;
    if (!query.trim()) return true;
    const r = requestsById.get(c.requestId);
    const hay = `${r?.title ?? ""} ${r?.name ?? ""} ${r?.city ?? ""}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1.5">
          <CardTitle>Contribution history</CardTitle>
          <CardDescription>Every entry is simulated. No payments were processed.</CardDescription>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search requests"
              aria-label="Search contribution history"
              className="h-10 pl-9 sm:w-56"
            />
          </div>
          <NativeSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label="Filter by type"
            className="h-10 sm:w-44"
          >
            <option value="all">All types</option>
            <option value="simulated">Simulated contributions</option>
            <option value="commitment">Commitments</option>
          </NativeSelect>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {rows.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              icon={Search}
              title={contributions.length ? "No matching entries" : "No contributions yet"}
              description={contributions.length ? "Try a different search or filter." : "Simulated contributions you make will appear here."}
              className="py-10"
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const r = requestsById.get(c.requestId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/requests/${c.requestId}`} className="font-medium hover:text-primary">
                        {r?.title ?? "Request unavailable"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r?.name}</p>
                    </TableCell>
                    <TableCell>{r ? <CategoryBadge category={r.category} /> : "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.amount, c.currency)}</TableCell>
                    <TableCell>
                      <ContributionKindBadge c={c} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
