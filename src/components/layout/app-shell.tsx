"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Compass, LayoutDashboard, PlusCircle, Sparkles, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "./demo-banner";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, dashboardPath } from "./user-menu";
import { NotificationsMenu } from "./notifications-menu";
import { useAuthStore } from "@/store/auth-store";
import { useHydrated } from "@/store/hydration-store";
import { cn } from "@/lib/utils";

function useNav() {
  const session = useAuthStore((s) => s.session);
  return [
    { href: "/discover", label: "Discover", icon: Sparkles },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/submit", label: "Submit bill", icon: PlusCircle },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: dashboardPath(session?.role), label: "Dashboard", icon: LayoutDashboard },
  ];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const hydrated = useHydrated();
  const nav = useNav();
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo href={session ? "/discover" : "/"} />
          <nav aria-label="App" className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                aria-label={n.label}
                title={n.label}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground lg:px-3.5",
                  isActive(n.href) && "bg-accent font-medium text-foreground",
                )}
              >
                <n.icon className="size-4" />
                <span className="hidden lg:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {hydrated && session && <NotificationsMenu />}
            {hydrated && session && <UserMenu />}
            {hydrated && !session && (
              <Button asChild size="sm">
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="App tabs"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/92 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {[nav[0], nav[1], nav[2], nav[4], { href: "/profile", label: "Profile", icon: UserRound }].map((n) => (
            <li key={n.label}>
              <Link
                href={n.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition",
                  isActive(n.href) && "text-primary",
                )}
              >
                <n.icon className={cn("size-5", n.href === "/submit" && "size-6")} />
                {n.label === "Submit bill" ? "Submit" : n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
