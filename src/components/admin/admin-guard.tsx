"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/basic";
import { LogoMark } from "@/components/brand/logo";
import { useAuthStore } from "@/store/auth-store";
import { useHydrated } from "@/store/hydration-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { DEMO_ACCOUNTS } from "@/lib/data/users";

export function AdminSkeleton() {
  return (
    <div className="grid gap-6 p-6" aria-busy="true" aria-label="Loading admin panel">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

/** Restricts the admin panel to the demo admin role. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);
  const seedWelcome = useNotificationsStore((s) => s.seedWelcome);

  if (!hydrated) {
    return (
      <div className="min-h-dvh">
        <AdminSkeleton />
      </div>
    );
  }

  if (!session || session.role !== "admin") {
    return (
      <div className="grid min-h-[80dvh] place-items-center px-4 py-16">
        <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-lift">
          <div className="mx-auto mb-5 flex w-fit items-center gap-2">
            <LogoMark className="size-10" />
            <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
              <ShieldCheck className="size-5" />
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">BillSwipe Admin · Demo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This moderation console is part of the prototype. It manages fictional users and requests stored in your browser.
            {session ? (
              <>
                {" "}
                You&apos;re signed in as a <span className="font-medium capitalize text-foreground">{session.role}</span>.
              </>
            ) : null}
          </p>
          <div className="mt-6 grid gap-2">
            <Button
              size="lg"
              onClick={() => {
                login(DEMO_ACCOUNTS.admin);
                seedWelcome(DEMO_ACCOUNTS.admin.userId, DEMO_ACCOUNTS.admin.name);
                toast.success("Signed in as the demo admin");
              }}
            >
              <ShieldCheck /> Continue as demo admin
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?next=/admin">Go to login</Link>
            </Button>
            <Button asChild variant="link" size="sm">
              <Link href="/">Back to BillSwipe</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Moderation decisions here are simulated and never constitute independent verification.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
