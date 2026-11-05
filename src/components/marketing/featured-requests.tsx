"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestCard, RequestCardSkeleton } from "@/components/requests/request-card";
import { isDiscoverable, useRequestsStore } from "@/store/requests-store";
import { useHydrated } from "@/store/hydration-store";
import { useAuthStore } from "@/store/auth-store";
import { useBlockedIds } from "@/store/saved-store";
import { useSuspendedUserIds } from "@/store/admin-store";
import { percent } from "@/lib/utils";
import { SectionHeading, Reveal } from "./reveal";

export function FeaturedRequests() {
  const hydrated = useHydrated();
  const requests = useRequestsStore((s) => s.requests);
  const session = useAuthStore((s) => s.session);
  const blocked = useBlockedIds(session?.userId);
  const suspended = useSuspendedUserIds();

  const featured = useMemo(
    () =>
      requests
        .filter((r) => isDiscoverable(r) && r.verification === "demo_approved" && !blocked.includes(r.userId) && !suspended.has(r.userId))
        .sort((a, b) => percent(b.amountRaised, b.amount) - percent(a.amountRaised, a.amount))
        .slice(0, 6),
    [requests, blocked, suspended],
  );

  return (
    <section className="border-y bg-muted/40" aria-labelledby="featured-heading">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="Featured requests"
            title={<span id="featured-heading">Real-world bills. Fictional people.</span>}
            description="Every request below is invented for this prototype — but each one mirrors the kinds of essential bills people face around the world."
          />
          <Reveal>
            <Button asChild variant="outline">
              <Link href="/explore">
                Explore all requests <ArrowRight />
              </Link>
            </Button>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!hydrated
            ? Array.from({ length: 6 }).map((_, i) => <RequestCardSkeleton key={i} />)
            : featured.map((r, i) => (
                <Reveal key={r.id} delay={(i % 3) * 0.06}>
                  <RequestCard request={r} className="h-full" />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}
