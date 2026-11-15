"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ban, Lock } from "lucide-react";
import type { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useSuspendedUserIds } from "@/store/admin-store";
import { useAuthSyncReady } from "@/components/auth/auth-sync";
import { useHydrated } from "@/store/hydration-store";
import { Skeleton } from "@/components/ui/basic";
import { Button } from "@/components/ui/button";

export function PageSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

/**
 * Client-side guard for the mock session. Redirects guests to /login and new accounts to onboarding.
 * Optionally restricts to specific roles.
 */
export function RequireAuth({
  children,
  roles,
  fallback,
}: {
  children: React.ReactNode;
  roles?: Role[];
  fallback?: React.ReactNode;
}) {
  const storeHydrated = useHydrated();
  // With Supabase, also wait for the first server session check so a freshly signed-in
  // account isn't bounced to /login before its session reaches the browser store.
  const syncReady = useAuthSyncReady();
  const hydrated = storeHydrated && syncReady;
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const suspendedIds = useSuspendedUserIds();
  // Real accounts: status comes from the database (the server guard enforces it too).
  // Demo accounts: status comes from the demo admin panel.
  const suspended = !!session && (session.source === "supabase" ? session.status === "suspended" : suspendedIds.has(session.userId));
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!hydrated) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (!session.onboarded && pathname !== "/onboarding") router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, session, router, pathname]);

  if (!hydrated || !session || (!session.onboarded && pathname !== "/onboarding")) return <>{fallback ?? <PageSkeleton />}</>;

  if (suspended) {
    return (
      <div className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-24 text-center" role="alert">
        <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10">
          <Ban className="size-6 text-destructive" />
        </span>
        <h1 className="text-xl font-semibold">This demo account is suspended</h1>
        <p className="text-sm text-muted-foreground">
          A demo moderator suspended <span className="font-medium text-foreground">{session.name}</span>. Their requests are hidden from donors.
          A moderator can reactivate the account from Admin → Users.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            Log in with another account
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(session.role)) {
    return (
      <div className="mx-auto grid max-w-md place-items-center gap-4 px-4 py-24 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-muted">
          <Lock className="size-6 text-muted-foreground" />
        </span>
        <h1 className="text-xl font-semibold">This area is for {roles.join(" or ")} accounts</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in as a <span className="font-medium capitalize">{session.role}</span>. You can switch your demo role from your profile.
        </p>
        <Button asChild>
          <Link href="/profile">Go to profile</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
