"use client";

import * as React from "react";
import Link from "next/link";
import { History, SearchX } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/basic";
import { FilterSelect, ResultCount, SearchInput, Toolbar } from "@/components/admin/table-tools";
import { RequestDetailDrawer } from "@/components/admin/request-detail-drawer";
import { AUDIT_KIND_META, auditKindMeta } from "@/components/admin/audit-trail";
import { useAdminStore, type ModerationKind } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { formatAuditTime } from "@/lib/admin/audit";
import { cn } from "@/lib/utils";

type KindFilter = "all" | ModerationKind;

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All actions" },
  ...(Object.keys(AUDIT_KIND_META) as ModerationKind[]).map((k) => ({ value: k, label: AUDIT_KIND_META[k].label })),
];

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const log = useAdminStore((s) => s.moderationLog);
  const users = useAdminStore((s) => s.users);
  const requests = useRequestsStore((s) => s.requests);
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<KindFilter>("all");
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const titles = React.useMemo(() => new Map(requests.map((r) => [r.id, r.title])), [requests]);
  const names = React.useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);

  const sorted = React.useMemo(() => [...log].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [log]);
  const q = query.trim().toLowerCase();
  const filtered = sorted.filter(
    (m) =>
      (kind === "all" || m.kind === kind) &&
      (!q ||
        [m.text, m.actor ?? "", m.requestId ?? "", m.userId ?? "", titles.get(m.requestId ?? "") ?? "", names.get(m.userId ?? "") ?? ""].some((f) =>
          f.toLowerCase().includes(q),
        )),
  );
  const visible = filtered.slice(0, limit);
  // Start from the first page whenever the filters change.
  const updateQuery = (v: string) => {
    setQuery(v);
    setLimit(PAGE_SIZE);
  };
  const updateKind = (v: KindFilter) => {
    setKind(v);
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Moderation"
        title="Audit log"
        description="Every demo moderator action in this browser — approvals, rejections, info requests, flags, report decisions, checklist changes, internal notes and user or category changes — with absolute timestamps."
      />

      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={query} onChange={updateQuery} placeholder="Search text, moderator, request or ID" label="Search the audit log" />
          <FilterSelect value={kind} onChange={updateKind} options={KIND_OPTIONS} label="Filter by action type" />
          <ResultCount shown={filtered.length} total={log.length} noun="entries" />
        </Toolbar>

        {filtered.length === 0 ? (
          <div className="p-4 sm:p-6">
            {log.length === 0 ? (
              <EmptyState
                icon={History}
                title="No moderator actions yet"
                description="Decisions made in the verification queue, reports and user screens will appear here."
                action={
                  <Button asChild>
                    <Link href="/admin/verification">Open the verification queue</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No matching entries"
                description="Try a different search or action type."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateQuery("");
                      updateKind("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <ol className="divide-y" aria-label="Audit log entries, newest first">
            {visible.map((m) => {
              const meta = auditKindMeta(m.kind);
              const title = m.requestId ? titles.get(m.requestId) : undefined;
              return (
                <li key={m.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-6">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", meta.tone)} aria-hidden>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1">
                    <p className="text-sm leading-snug wrap-anywhere">{m.text}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <time dateTime={m.createdAt} className="font-medium text-foreground/80 tabular-nums">
                        {formatAuditTime(m.createdAt)}
                      </time>
                      <span aria-hidden>·</span>
                      <span>{meta.label}</span>
                      <span aria-hidden>·</span>
                      <span>{m.actor ?? "Demo admin"}</span>
                      {m.requestId && (
                        <>
                          <span aria-hidden>·</span>
                          {title ? (
                            <button
                              type="button"
                              onClick={() => setOpenId(m.requestId ?? null)}
                              className="rounded text-left font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 wrap-anywhere"
                            >
                              Open request<span className="sr-only">: {title}</span>
                            </button>
                          ) : (
                            <span>Request removed</span>
                          )}
                        </>
                      )}
                      {!m.requestId && m.userId && (
                        <>
                          <span aria-hidden>·</span>
                          <Link href="/admin/users" className="font-medium text-primary underline-offset-2 hover:underline">
                            {names.get(m.userId) ?? "View users"}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {filtered.length > visible.length && (
          <div className="border-t p-4 text-center">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
            </Button>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Stored only in this browser (LocalStorage), newest 500 entries. Fictional demo data — these are prototype moderation records, not real
        verification decisions. Entries made before this log recorded moderators show “Demo admin”.
      </p>

      <RequestDetailDrawer requestId={openId} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
