"use client";

import * as React from "react";
import { FlaskConical, HandCoins, Hourglass, Users } from "lucide-react";
import type { Contribution } from "@/lib/types";
import { PageHeader, StatCard } from "@/components/layout/page-parts";
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/basic";
import { useContributionsStore } from "@/store/contributions-store";
import { useRequestsStore } from "@/store/requests-store";
import { formatCurrency, formatDate, toUsd } from "@/lib/utils";
import { FilterSelect, ResultCount, SearchInput, SortableHead, TableEmpty, Toolbar, sortBy, useSort } from "@/components/admin/table-tools";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";

type SortKey = "createdAt" | "usd" | "donorName";
type KindFilter = "all" | "simulated" | "commitment";
type StatusFilter = "all" | Contribution["status"];

function KindBadge({ c }: { c: Contribution }) {
  if (c.kind === "simulated") return <Badge className="bg-primary/12 text-primary">Simulated</Badge>;
  const tone =
    c.status === "open"
      ? "bg-amber-500/14 text-amber-800 dark:text-amber-300"
      : c.status === "fulfilled"
        ? "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300"
        : "bg-zinc-500/14 text-zinc-700 dark:text-zinc-300";
  return <Badge className={`capitalize ${tone}`}>Commitment · {c.status}</Badge>;
}

export default function AdminDonationsPage() {
  const contributions = useContributionsStore((s) => s.contributions);
  const requests = useRequestsStore((s) => s.requests);
  const [q, setQ] = React.useState("");
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { sort, toggle } = useSort<SortKey>({ key: "createdAt", dir: "desc" });
  const reqMap = React.useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);

  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = contributions.filter((c) => {
      const r = reqMap.get(c.requestId);
      return (
        (!term || c.donorName.toLowerCase().includes(term) || (r?.title.toLowerCase().includes(term) ?? false) || (r?.name.toLowerCase().includes(term) ?? false)) &&
        (kind === "all" || c.kind === kind) &&
        (status === "all" || c.status === status)
      );
    });
    return sortBy(filtered, sort, (c, k) => (k === "usd" ? toUsd(c.amount, c.currency) : c[k]));
  }, [contributions, q, kind, status, sort, reqMap]);

  const recorded = contributions.filter((c) => c.kind === "simulated" || c.status === "fulfilled");
  const totalUsd = recorded.reduce((s, c) => s + toUsd(c.amount, c.currency), 0);
  const openCommitments = contributions.filter((c) => c.kind === "commitment" && c.status === "open");
  const openUsd = openCommitments.reduce((s, c) => s + toUsd(c.amount, c.currency), 0);
  const donors = new Set(contributions.map((c) => c.userId)).size;
  const filteredUsd = rows.reduce((s, c) => s + toUsd(c.amount, c.currency), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Ledger"
        title="Donations (simulated)"
        description="A record of simulated contributions and commitments made in the demo. No payment was processed for any entry."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
        <FlaskConical className="mt-0.5 size-4 shrink-0" />
        <p>
          Every figure on this page is <strong>simulated</strong>. BillSwipe Prototype v1.1 does not collect, hold or transfer money, and no
          requester has received funds. USD equivalents use fixed, fictional demo rates.
        </p>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Simulated total" value={formatCurrency(totalUsd, "USD")} hint={`${recorded.length} recorded entries`} icon={HandCoins} tone="primary" />
        <StatCard label="Open commitments" value={formatCurrency(openUsd, "USD")} hint={`${openCommitments.length} pledges`} icon={Hourglass} tone="warning" />
        <StatCard label="Unique donors" value={donors} icon={Users} />
        <StatCard label="Average entry" value={formatCurrency(recorded.length ? totalUsd / recorded.length : 0, "USD")} hint="≈ USD at fixed demo rates" icon={HandCoins} />
      </div>
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search donor or request" label="Search donations" />
          <FilterSelect
            label="Filter by type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "All types" },
              { value: "simulated", label: "Simulated" },
              { value: "commitment", label: "Commitments" },
            ]}
          />
          <FilterSelect
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Any status" },
              { value: "recorded", label: "Recorded" },
              { value: "open", label: "Open" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <p className="text-xs text-muted-foreground sm:ml-auto">
            Filtered total: <span className="font-medium text-foreground">{formatCurrency(filteredUsd, "USD")}</span>
          </p>
          <ResultCount shown={rows.length} total={contributions.length} noun="entries" />
        </Toolbar>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Date" sortKey="createdAt" sort={sort} onSort={toggle} />
              <SortableHead label="Donor" sortKey="donorName" sort={sort} onSort={toggle} />
              <TableHead>Request</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <SortableHead label="≈ USD (demo rate)" sortKey="usd" sort={sort} onSort={toggle} className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={6} />
            ) : (
              rows.map((c) => {
                const r = reqMap.get(c.requestId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="font-medium">{c.donorName}</TableCell>
                    <TableCell className="max-w-64">
                      {r ? (
                        <button onClick={() => setOpenId(r.id)} className="grid max-w-full text-left hover:text-primary">
                          <span className="truncate">{r.title}</span>
                          <span className="text-xs text-muted-foreground">{r.name}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">Removed request</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <KindBadge c={c} />
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(c.amount, c.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{formatCurrency(toUsd(c.amount, c.currency), "USD")}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
