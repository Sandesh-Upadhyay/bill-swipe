"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bookmark, Heart, X } from "lucide-react";
import { RequireAuth } from "@/components/layout/require-auth";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives";
import { RequestCard } from "@/components/requests/request-card";
import type { BillRequest } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";
import { useRequestsStore } from "@/store/requests-store";
import { useBlockedIds, useSavedIds, useSavedStore } from "@/store/saved-store";
import { useSwipeHistory, useSwipeStore } from "@/store/swipe-store";

function CardGrid({ items, onRemove, removeLabel }: { items: BillRequest[]; onRemove: (r: BillRequest) => void; removeLabel: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <div key={r.id} className="flex flex-col">
          <RequestCard request={r} showStatus className="flex-1" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => onRemove(r)} aria-label={`${removeLabel}: ${r.title}`}>
              <X /> {removeLabel}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SavedView() {
  const session = useAuthStore((s) => s.session)!;
  const requests = useRequestsStore((s) => s.requests);
  const savedIds = useSavedIds(session.userId);
  const blocked = useBlockedIds(session.userId);
  const swipes = useSwipeHistory(session.userId);
  const toggleSaved = useSavedStore((s) => s.toggleSaved);
  const removeInterest = useSwipeStore((s) => s.removeInterest);

  const byId = React.useMemo(() => new Map(requests.map((r) => [r.id, r])), [requests]);
  const visible = (r: BillRequest | undefined): r is BillRequest => !!r && !blocked.includes(r.userId);
  const saved = savedIds.map((id) => byId.get(id)).filter(visible);
  const interested = swipes
    .filter((s) => s.direction === "right")
    .map((s) => byId.get(s.requestId))
    .filter(visible)
    .reverse();

  const discoverCta = (
    <Button asChild>
      <Link href="/discover">Go to Discover</Link>
    </Button>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Your list"
        title="Saved & interested"
        description="Requests you bookmarked or swiped right on. Swiping right only expresses interest — it never charges you."
      />
      <Tabs defaultValue="saved">
        <TabsList>
          <TabsTrigger value="saved">
            <Bookmark className="size-4" /> Saved <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{saved.length}</span>
          </TabsTrigger>
          <TabsTrigger value="interested">
            <Heart className="size-4" /> Interested <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums">{interested.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="saved" className="mt-6">
          {saved.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved requests" description="Tap the bookmark on any request card to save it for later." action={discoverCta} />
          ) : (
            <CardGrid
              items={saved}
              removeLabel="Remove"
              onRemove={(r) => {
                toggleSaved(session.userId, r.id);
                toast.success("Removed from saved");
              }}
            />
          )}
        </TabsContent>
        <TabsContent value="interested" className="mt-6">
          {interested.length === 0 ? (
            <EmptyState icon={Heart} title="No interested requests yet" description="Swipe right on a card in Discover to add it here." action={discoverCta} />
          ) : (
            <CardGrid
              items={interested}
              removeLabel="Not interested"
              onRemove={(r) => {
                removeInterest(session.userId, r.id);
                toast.success("Removed — it may appear again in Discover");
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

export default function SavedPage() {
  return (
    <RequireAuth>
      <SavedView />
    </RequireAuth>
  );
}
