"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Eye, Flag, FlagOff, XCircle } from "lucide-react";
import type { RequestReport } from "@/lib/types";
import { PageHeader, StatCard } from "@/components/layout/page-parts";
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/basic";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/primitives";
import { useRequestsStore } from "@/store/requests-store";
import { useAdminStore } from "@/store/admin-store";
import { REPORT_REASONS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import { FilterSelect, ResultCount, SearchInput, TableEmpty, Toolbar } from "@/components/admin/table-tools";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";
import { useModeration } from "@/components/admin/moderation-actions";
import { useModeratorName } from "@/components/admin/use-review";

type PendingAction = { kind: "resolved" | "dismissed" | "flag"; report: RequestReport } | null;

function ReportStatusBadge({ status }: { status: RequestReport["status"] }) {
  const tone =
    status === "open"
      ? "bg-amber-500/14 text-amber-800 dark:text-amber-300"
      : status === "resolved"
        ? "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300"
        : "bg-zinc-500/14 text-zinc-700 dark:text-zinc-300";
  return <Badge className={`capitalize ${tone}`}>{status}</Badge>;
}

export default function AdminReportsPage() {
  const reports = useRequestsStore((s) => s.reports);
  const requests = useRequestsStore((s) => s.requests);
  const setReportStatus = useRequestsStore((s) => s.setReportStatus);
  const users = useAdminStore((s) => s.users);
  const logModeration = useAdminStore((s) => s.logModeration);
  const moderator = useModeratorName();
  const mod = useModeration();
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | RequestReport["status"]>("open");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingAction>(null);

  const reqMap = React.useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const userMap = React.useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

  const rows = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    return reports
      .filter((rep) => status === "all" || rep.status === status)
      .filter((rep) => {
        if (!term) return true;
        const r = reqMap.get(rep.requestId);
        return (
          rep.details.toLowerCase().includes(term) ||
          (r?.title.toLowerCase().includes(term) ?? false) ||
          (r?.name.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reports, status, q, reqMap]);

  const pendingRequest = pending ? reqMap.get(pending.report.requestId) : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Trust & safety" title="Reported requests" description="Reports submitted by demo users. Resolve after taking action, or dismiss if no action is needed." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={reports.filter((r) => r.status === "open").length} icon={Flag} tone="warning" />
        <StatCard label="Resolved" value={reports.filter((r) => r.status === "resolved").length} icon={CheckCircle2} tone="primary" />
        <StatCard label="Dismissed" value={reports.filter((r) => r.status === "dismissed").length} icon={XCircle} tone="muted" />
      </div>
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={q} onChange={setQ} placeholder="Search request or details" label="Search reports" />
          <FilterSelect
            label="Filter by report status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All reports" },
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
            ]}
          />
          <ResultCount shown={rows.length} total={reports.length} noun="reports" />
        </Toolbar>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Request</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={7} message={status === "open" ? "No open reports. The community is in good shape." : "No reports match your filters."} />
            ) : (
              rows.map((rep) => {
                const r = reqMap.get(rep.requestId);
                return (
                  <TableRow key={rep.id}>
                    <TableCell className="max-w-60">
                      <span className="grid">
                        <span className="flex items-center gap-1.5 truncate font-medium">
                          {r?.flagged && <Flag className="size-3.5 shrink-0 text-destructive" aria-label="Flagged" />}
                          <span className="truncate">{r?.title ?? "Deleted request"}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{r?.name}</span>
                      </span>
                    </TableCell>
                    <TableCell>{reasonLabel(rep.reason)}</TableCell>
                    <TableCell className="max-w-72 whitespace-normal text-muted-foreground">
                      <span className="line-clamp-2">{rep.details}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{userMap.get(rep.reporterId)?.name ?? "Demo user"}</TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(rep.createdAt)}</TableCell>
                    <TableCell>
                      <ReportStatusBadge status={rep.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <IconAction label="View request" disabled={!r} onClick={() => setOpenId(rep.requestId)}>
                          <Eye />
                        </IconAction>
                        <IconAction label={r?.flagged ? "Unflag request" : "Flag request"} disabled={!r} onClick={() => setPending({ kind: "flag", report: rep })}>
                          {r?.flagged ? <FlagOff /> : <Flag />}
                        </IconAction>
                        <IconAction label="Mark resolved" disabled={rep.status === "resolved"} onClick={() => setPending({ kind: "resolved", report: rep })}>
                          <CheckCircle2 />
                        </IconAction>
                        <IconAction label="Dismiss report" disabled={rep.status === "dismissed"} onClick={() => setPending({ kind: "dismissed", report: rep })}>
                          <XCircle />
                        </IconAction>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === "flag"
            ? pendingRequest?.flagged
              ? "Remove flag from this request?"
              : "Flag this request?"
            : pending?.kind === "resolved"
              ? "Mark report as resolved?"
              : "Dismiss this report?"
        }
        description={
          pending?.kind === "flag"
            ? pendingRequest?.flagged
              ? "The request may appear in Discover again if active."
              : `“${pendingRequest?.title ?? ""}” will be hidden from Discover and Explore until unflagged.`
            : pending?.kind === "resolved"
              ? "Use this once appropriate action has been taken on the request."
              : "Dismissed reports are kept for audit but need no further action."
        }
        confirmLabel={pending?.kind === "flag" ? (pendingRequest?.flagged ? "Unflag" : "Flag request") : pending?.kind === "resolved" ? "Resolve" : "Dismiss"}
        destructive={pending?.kind === "flag" && !pendingRequest?.flagged}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "flag") {
            if (pendingRequest) mod.flag(pendingRequest);
          } else {
            setReportStatus(pending.report.id, pending.kind);
            logModeration({
              kind: "report",
              actor: moderator,
              requestId: pending.report.requestId,
              text: `${pending.kind === "resolved" ? "Resolved" : "Dismissed"} a “${pending.report.reason}” report on “${pendingRequest?.title ?? "a request"}”`,
            });
            toast.success(pending.kind === "resolved" ? "Report resolved" : "Report dismissed");
          }
          setPending(null);
        }}
      />
      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
