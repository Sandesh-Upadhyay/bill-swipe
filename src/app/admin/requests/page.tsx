"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import type { CategoryId, CountryCode, RequestStatus, VerificationState } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/basic";
import { Switch, Label } from "@/components/ui/primitives";
import { CategoryBadge, StatusBadge, VerificationBadge } from "@/components/requests/badges";
import { useRequestsStore } from "@/store/requests-store";
import { CATEGORIES, COUNTRIES, COUNTRY_MAP, STATUS_META } from "@/lib/constants";
import { formatCurrency, formatDate, percent, toUsd } from "@/lib/utils";
import { FilterSelect, ResultCount, SearchInput, SortableHead, TableEmpty, Toolbar, sortBy, useSort } from "@/components/admin/table-tools";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";

type SortKey = "title" | "amount" | "progress" | "createdAt" | "dueDate";

export default function AdminRequestsPage() {
  const requests = useRequestsStore((s) => s.requests);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | RequestStatus>("all");
  const [category, setCategory] = React.useState<"all" | CategoryId>("all");
  const [country, setCountry] = React.useState<"all" | CountryCode>("all");
  const [verification, setVerification] = React.useState<"all" | VerificationState>("all");
  const [flaggedOnly, setFlaggedOnly] = React.useState(false);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { sort, toggle } = useSort<SortKey>({ key: "createdAt", dir: "desc" });

  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = requests.filter(
      (r) =>
        (!term || r.title.toLowerCase().includes(term) || r.name.toLowerCase().includes(term) || r.city.toLowerCase().includes(term)) &&
        (status === "all" || r.status === status) &&
        (category === "all" || r.category === category) &&
        (country === "all" || r.country === country) &&
        (verification === "all" || r.verification === verification) &&
        (!flaggedOnly || r.flagged),
    );
    return sortBy(filtered, sort, (r, k) =>
      k === "amount" ? toUsd(r.amount, r.currency) : k === "progress" ? percent(r.amountRaised, r.amount) : r[k],
    );
  }, [requests, q, status, category, country, verification, flaggedOnly, sort]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Moderation" title="All requests" description="Every fictional bill request in the demo. Select a row to review and take action." />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search title, name or city" label="Search requests" />
          <FilterSelect
            label="Filter by status"
            value={status}
            onChange={setStatus}
            options={[{ value: "all", label: "All statuses" }, ...Object.entries(STATUS_META).map(([value, m]) => ({ value: value as RequestStatus, label: m.label }))]}
          />
          <FilterSelect
            label="Filter by category"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c.id, label: c.label }))]}
          />
          <FilterSelect
            label="Filter by country"
            value={country}
            onChange={setCountry}
            options={[{ value: "all", label: "All countries" }, ...COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))]}
          />
          <FilterSelect
            label="Filter by verification"
            value={verification}
            onChange={setVerification}
            options={[
              { value: "all", label: "Any verification" },
              { value: "demo_approved", label: "Demo-approved" },
              { value: "pending", label: "Review pending" },
              { value: "unverified", label: "Unverified" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <div className="flex items-center gap-2">
            <Switch id="flagged-only" checked={flaggedOnly} onCheckedChange={setFlaggedOnly} />
            <Label htmlFor="flagged-only" className="text-sm font-normal">
              Flagged only
            </Label>
          </div>
          <ResultCount shown={rows.length} total={requests.length} noun="requests" />
        </Toolbar>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <SortableHead label="Request" sortKey="title" sort={sort} onSort={toggle} />
              <TableHead>Category</TableHead>
              <TableHead>Country</TableHead>
              <SortableHead label="Amount" sortKey="amount" sort={sort} onSort={toggle} />
              <SortableHead label="Progress" sortKey="progress" sort={sort} onSort={toggle} />
              <TableHead>Status</TableHead>
              <TableHead>Verification</TableHead>
              <SortableHead label="Created" sortKey="createdAt" sort={sort} onSort={toggle} />
              <SortableHead label="Due" sortKey="dueDate" sort={sort} onSort={toggle} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={9} />
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  tabIndex={0}
                  className="cursor-pointer"
                  onClick={() => setOpenId(r.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(r.id))}
                >
                  <TableCell className="max-w-72">
                    <span className="flex items-center gap-3">
                      <DemoAvatar seed={r.image} className="size-8" label={r.name} />
                      <span className="grid min-w-0">
                        <span className="flex items-center gap-1.5 truncate font-medium">
                          {r.flagged && <Flag className="size-3.5 shrink-0 text-destructive" aria-label="Flagged" />}
                          <span className="truncate">{r.title}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{r.name}</span>
                      </span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={r.category} />
                  </TableCell>
                  <TableCell>
                    {COUNTRY_MAP[r.country].flag} {r.country}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(r.amount, r.currency)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-primary/15">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent(r.amountRaised, r.amount)}%` }} />
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">{percent(r.amountRaised, r.amount)}%</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <VerificationBadge state={r.verification} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.dueDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
