"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/overlays";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu, dashboardPath } from "./user-menu";
import { useAuthStore } from "@/store/auth-store";
import { useHydrated } from "@/store/hydration-store";
import { cn } from "@/lib/utils";

export const MARKETING_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/explore", label: "Explore requests" },
  { href: "/mission", label: "Our mission" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const session = useAuthStore((s) => s.session);
  const hydrated = useHydrated();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {MARKETING_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground",
                pathname === l.href && "bg-accent text-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {!hydrated ? (
            <div className="h-9 w-32" aria-hidden />
          ) : session ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/discover">Open app</Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex">
                <Link href={dashboardPath(session.role)}>Dashboard</Link>
              </Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo />
              <nav aria-label="Mobile" className="mt-4 grid gap-1">
                {MARKETING_LINKS.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className={cn("rounded-xl px-3 py-3 text-base hover:bg-accent", pathname === l.href && "bg-accent font-medium")}
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto grid gap-2">
                {session ? (
                  <SheetClose asChild>
                    <Button asChild size="lg">
                      <Link href="/discover">Open app</Link>
                    </Button>
                  </SheetClose>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button asChild size="lg">
                        <Link href="/signup">Get started</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild size="lg" variant="outline">
                        <Link href="/login">Log in</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
