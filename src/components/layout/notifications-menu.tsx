"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { cn, timeAgo } from "@/lib/utils";

export function NotificationsMenu() {
  const session = useAuthStore((s) => s.session);
  const all = useNotificationsStore((s) => s.items);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const clear = useNotificationsStore((s) => s.clear);
  const items = useMemo(() => all.filter((n) => n.userId === session?.userId), [all, session?.userId]);
  const unread = items.filter((n) => !n.read).length;
  if (!session) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => markAllRead(session.userId)} disabled={!unread}>
              <CheckCheck /> Mark read
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clear(session.userId)} disabled={!items.length}>
              Clear
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="grid place-items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Inbox className="size-6" />
              You&apos;re all caught up.
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const body = (
                  <>
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                    <span className="grid gap-0.5">
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                      <span className="text-[11px] text-muted-foreground/80">{timeAgo(n.createdAt)}</span>
                    </span>
                  </>
                );
                const cls = "flex gap-3 border-b px-4 py-3 text-left transition hover:bg-muted/60 last:border-0 w-full";
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className={cls} onClick={() => markRead(n.id)}>
                        {body}
                      </Link>
                    ) : (
                      <button className={cls} onClick={() => markRead(n.id)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
