"use client";

import * as React from "react";
import type { BillRequest } from "@/lib/types";
import { useAdminStore } from "@/store/admin-store";
import { useAuthStore } from "@/store/auth-store";
import { useRequestsStore } from "@/store/requests-store";
import { buildDuplicateIndex, type DuplicateMatch } from "@/lib/admin/duplicates";
import { computeRiskFlags, type RiskFlag } from "@/lib/admin/risk";

/** Display name recorded on checklist changes, notes and audit entries. Always a demo account. */
export function useModeratorName() {
  return useAuthStore((s) => s.session?.name) ?? "Demo admin";
}

export interface ReviewSignals {
  flags: RiskFlag[];
  duplicates: DuplicateMatch[];
}

const EMPTY: ReviewSignals = { flags: [], duplicates: [] };

/** Computed risk flags + duplicate matches for every request. Recomputed only when the inputs change. */
export function useReviewSignals(): Record<string, ReviewSignals> {
  const requests = useRequestsStore((s) => s.requests);
  const reports = useRequestsStore((s) => s.reports);
  const users = useAdminStore((s) => s.users);
  const categories = useAdminStore((s) => s.categories);
  const settings = useAdminStore((s) => s.settings);

  return React.useMemo(() => {
    const duplicates = buildDuplicateIndex(requests);
    const openReports = new Map<string, number>();
    for (const rep of reports) if (rep.status === "open") openReports.set(rep.requestId, (openReports.get(rep.requestId) ?? 0) + 1);
    const usersById = new Map(users.map((u) => [u.id, u]));
    const caps = new Map(categories.map((c) => [c.id, c.maxAmountUsd]));
    const now = Date.now();
    const out: Record<string, ReviewSignals> = {};
    for (const r of requests) {
      const dupes = duplicates[r.id] ?? [];
      out[r.id] = {
        duplicates: dupes,
        flags: computeRiskFlags(r, {
          openReports: openReports.get(r.id) ?? 0,
          autoFlagThreshold: settings.autoFlagThreshold,
          requester: usersById.get(r.userId),
          categoryMaxUsd: caps.get(r.category),
          platformMaxUsd: settings.maxRequestUsd,
          requireDocument: settings.requireDocument,
          duplicates: dupes,
          now,
        }),
      };
    }
    return out;
  }, [requests, reports, users, categories, settings]);
}

export function signalsFor(index: Record<string, ReviewSignals>, request: Pick<BillRequest, "id"> | undefined | null) {
  return (request && index[request.id]) || EMPTY;
}
