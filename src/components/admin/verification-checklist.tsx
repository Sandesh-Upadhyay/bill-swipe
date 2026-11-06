"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, RotateCcw, XCircle } from "lucide-react";
import type { BillRequest, VerificationCheckStatus } from "@/lib/types";
import { Badge } from "@/components/ui/basic";
import { Button } from "@/components/ui/button";
import { useAdminStore } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { CHECK_IDS, CHECK_META, CHECK_STATUS_LABEL, getCheck } from "@/lib/admin/checks";
import { formatAuditTime } from "@/lib/admin/audit";
import { cn } from "@/lib/utils";
import { useModeratorName } from "./use-review";

const STATUS_TONE: Record<VerificationCheckStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  passed: "bg-emerald-500/14 text-emerald-700 dark:text-emerald-300",
  failed: "bg-red-500/12 text-red-700 dark:text-red-300",
};

const STATUS_ICON = { pending: CircleDashed, passed: CheckCircle2, failed: XCircle } as const;

/** Compact, separate badges for the three simulated checks (queue cards, drawer header). */
export function ChecklistBadges({ requestId, className }: { requestId: string; className?: string }) {
  const list = useAdminStore((s) => s.verificationChecks[requestId]);
  return (
    <ul aria-label="Simulated review checks" className={cn("flex flex-wrap gap-1.5", className)}>
      {CHECK_IDS.map((id) => {
        const { status } = getCheck(list, id);
        const Icon = STATUS_ICON[status];
        return (
          <li key={id}>
            <Badge className={STATUS_TONE[status]} title={`${CHECK_META[id].label}: ${CHECK_STATUS_LABEL[status]} (simulated prototype state)`}>
              <Icon aria-hidden />
              {CHECK_META[id].short}
              <span className="sr-only"> check</span>: {CHECK_STATUS_LABEL[status]}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** Full checklist with pass / fail / reset controls. Every change is written to the moderation log. */
export function VerificationChecklistPanel({ request }: { request: BillRequest }) {
  const list = useAdminStore((s) => s.verificationChecks[request.id]);
  const setCheck = useAdminStore((s) => s.setVerificationCheck);
  const activity = useRequestsStore((s) => s.activity);
  const actor = useModeratorName();

  // Checks recorded before the requester's latest edit may no longer apply.
  const lastEdit = React.useMemo(
    () =>
      activity
        .filter((a) => a.requestId === request.id && a.kind === "updated")
        .reduce<string | null>((max, a) => (!max || a.createdAt > max ? a.createdAt : max), null),
    [activity, request.id],
  );
  const passed = CHECK_IDS.filter((id) => getCheck(list, id).status === "passed").length;
  const update = (id: (typeof CHECK_IDS)[number], status: VerificationCheckStatus) =>
    setCheck(request.id, id, status, actor, { title: request.title, userId: request.userId });

  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">
        Prototype states recorded by a demo moderator. BillSwipe does not perform real identity, document or payee verification — marking a
        check “passed” only records a moderator&apos;s judgement in this browser.
      </p>
      <ul className="grid gap-2">
        {CHECK_IDS.map((id) => {
          const c = getCheck(list, id);
          const meta = CHECK_META[id];
          const Icon = STATUS_ICON[c.status];
          const stale = !!(c.at && lastEdit && lastEdit > c.at && c.status !== "pending");
          const labelId = `check-${request.id}-${id}`;
          return (
            <li key={id} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span id={labelId} className="text-sm font-medium">
                    {meta.label}
                  </span>
                  <Badge className={STATUS_TONE[c.status]}>
                    <Icon aria-hidden /> {CHECK_STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{meta.help}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.at ? (
                    <>
                      {c.status === "pending" ? "Reset" : CHECK_STATUS_LABEL[c.status]} by {c.by ?? "Demo admin"} ·{" "}
                      <time dateTime={c.at}>{formatAuditTime(c.at)}</time>
                    </>
                  ) : (
                    "Not reviewed yet"
                  )}
                </p>
                {stale && (
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Recorded before the requester&apos;s last edit — consider re-checking.</p>
                )}
              </div>
              <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant={c.status === "passed" ? "default" : "outline"}
                  aria-pressed={c.status === "passed"}
                  onClick={() => update(id, "passed")}
                >
                  <CheckCircle2 /> Pass
                </Button>
                <Button
                  size="sm"
                  variant={c.status === "failed" ? "destructive" : "outline"}
                  aria-pressed={c.status === "failed"}
                  onClick={() => update(id, "failed")}
                >
                  <XCircle /> Fail
                </Button>
                <Button size="sm" variant="ghost" disabled={c.status === "pending"} onClick={() => update(id, "pending")} aria-label={`Reset ${meta.label}`}>
                  <RotateCcw /> <span className="sm:sr-only">Reset</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {passed} of {CHECK_IDS.length} simulated checks passed.
      </p>
    </div>
  );
}
