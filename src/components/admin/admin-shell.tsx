"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ClipboardCheck,
  Flag,
  HandCoins,
  History,
  LayoutGrid,
  ListChecks,
  Menu,
  Settings,
  Tags,
  Users,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/overlays";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { useRequestsStore } from "@/store/requests-store";
import { cn } from "@/lib/utils";
import { AdminGuard } from "./admin-guard";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutGrid },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/requests", label: "All requests", icon: ListChecks },
  { href: "/admin/verification", label: "Verification queue", icon: ClipboardCheck, badge: "queue" as const },
  { href: "/admin/reports", label: "Reported requests", icon: Flag, badge: "reports" as const },
  { href: "/admin/audit", label: "Audit log", icon: History },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/donations", label: "Donations", icon: HandCoins },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function useQueueCounts() {
  const requests = useRequestsStore((s) => s.requests);
  const reports = useRequestsStore((s) => s.reports);
  return React.useMemo(
    () => ({
      queue: requests.filter((r) => r.status === "pending_review" || r.status === "needs_info").length,
      reports: reports.filter((r) => r.status === "open").length,
    }),
    [requests, reports],
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = useQueueCounts();
  return (
    <nav aria-label="Admin" className="grid gap-0.5">
      {ADMIN_NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        const count = n.badge ? counts[n.badge] : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground",
              active && "bg-primary/12 font-medium text-primary hover:bg-primary/15 hover:text-primary",
            )}
          >
            <n.icon className="size-4 shrink-0" />
            <span className="flex-1">{n.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5",
                  n.badge === "reports" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2 px-2 pt-1">
        <Logo href="/admin" />
        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Admin</span>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="mt-auto grid gap-3">
        <p className="rounded-2xl border border-dashed p-3 text-xs leading-relaxed text-muted-foreground">
          Demo moderation console. Approvals here are prototype states, not independent verification.
        </p>
        <Button asChild variant="outline" size="sm" onClick={onNavigate}>
          <Link href="/discover">
            <ArrowLeft /> Back to app
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const current = [...ADMIN_NAV].reverse().find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href)));

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <AdminGuard>
        <div className="flex flex-1">
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
            <SidebarBody />
          </aside>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 px-4 glass sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open admin navigation" onClick={() => setOpen(true)}>
                  <Menu className="size-5" />
                </Button>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Admin · Demo</p>
                  <p className="truncate text-sm font-semibold">{current?.label ?? "Overview"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/discover">
                    <ArrowLeft /> Back to app
                  </Link>
                </Button>
                <ThemeToggle />
                <NotificationsMenu />
                <UserMenu />
              </div>
            </header>
            <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </div>
  );
}
