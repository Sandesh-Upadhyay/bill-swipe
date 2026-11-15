"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bell, BellOff, CheckCheck, Loader2 } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { listNotificationsAction, markNotificationsReadAction, type NotificationItem } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/basic";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-parts";
import { RequireAuth } from "@/components/layout/require-auth";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationsStore } from "@/store/notifications-store";

const TONE: Record<NotificationItem["tone"], string> = {
  default: "bg-primary",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

/** Real accounts read their own notifications from the database (RLS); demo sessions use browser data. */
function useNotifications() {
  const session = useAuthStore((s) => s.session);
  const demoItems = useNotificationsStore((s) => s.items);
  const markAllDemo = useNotificationsStore((s) => s.markAllRead);
  const markDemo = useNotificationsStore((s) => s.markRead);
  const real = session?.source === "supabase";
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await listNotificationsAction();
    if (res.ok) {
      setItems(res.items);
      setError(null);
    } else setError(res.error);
  }, []);

  React.useEffect(() => {
    if (!real) return;
    let active = true;
    listNotificationsAction().then((res) => {
      if (!active) return;
      if (res.ok) {
        setItems(res.items);
        setError(null);
      } else setError(res.error);
    });
    return () => {
      active = false;
    };
  }, [real]);

  if (!real) {
    const mine = demoItems
      .filter((n) => n.userId === session?.userId)
      .map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href ?? null, tone: n.tone ?? "default", read: n.read, createdAt: n.createdAt }) as NotificationItem);
    return {
      items: mine,
      error: null,
      loading: false,
      reload: () => {},
      markAll: async () => session && markAllDemo(session.userId),
      markOne: async (id: string) => markDemo(id),
    };
  }

  return {
    items: items ?? [],
    error,
    loading: items === null && !error,
    reload: load,
    markAll: async () => {
      const res = await markNotificationsReadAction("all");
      if (!res.ok) return toast.error(res.error);
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    },
    markOne: async (id: string) => {
      const res = await markNotificationsReadAction([id]);
      if (res.ok) setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? prev);
    },
  };
}

function NotificationsList() {
  const { items, error, loading, reload, markAll, markOne } = useNotifications();
  const unread = items.filter((n) => !n.read).length;
  const [marking, setMarking] = React.useState(false);

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Updates about your requests, reviews and activity."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              disabled={marking}
              onClick={async () => {
                setMarking(true);
                await markAll();
                setMarking(false);
              }}
            >
              {marking ? <Loader2 className="animate-spin" /> : <CheckCheck />} Mark all as read
            </Button>
          ) : undefined
        }
      />
      {loading ? (
        <div className="grid gap-3" aria-busy="true" aria-label="Loading notifications">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={BellOff}
          title="Couldn't load notifications"
          description={error}
          action={
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="We'll let you know here when something happens with your requests or reviews." />
      ) : (
        <ul className="grid gap-3" aria-label={`${unread} unread notifications`}>
          {items.map((n) => {
            const body = (
              <>
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent ring-1 ring-border" : TONE[n.tone])} aria-hidden />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className={cn("text-sm", !n.read && "font-semibold")}>
                    {n.title}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">{n.body}</span>
                  <time dateTime={n.createdAt} className="text-xs text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </time>
                </span>
              </>
            );
            const cls = "flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:border-primary/30";
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className={cn(cls, "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50")} onClick={() => !n.read && markOne(n.id)}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}

export function NotificationsView() {
  return (
    <RequireAuth>
      <NotificationsList />
    </RequireAuth>
  );
}
