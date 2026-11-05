"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, CalendarClock, Users } from "lucide-react";
import { toast } from "sonner";
import type { BillRequest } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/constants";
import { cn, dueLabel } from "@/lib/utils";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { CategoryBadge, CountryLabel, FictionalTag, StatusBadge, VerificationBadge } from "./badges";
import { FundingProgress } from "./money";
import { useAuthStore } from "@/store/auth-store";
import { useSavedIds, useSavedStore } from "@/store/saved-store";

/** Category-tinted cover with the generated (fictional) profile illustration. Never shows bill documents. */
export function RequestCover({
  request,
  className,
  children,
  wide,
}: {
  request: BillRequest;
  className?: string;
  children?: React.ReactNode;
  /** For landscape banners: portrait sits on the right and fades into the category colour. */
  wide?: boolean;
}) {
  const cat = CATEGORY_MAP[request.category];
  if (wide) {
    return (
      <div className={cn("relative overflow-hidden", className)} style={{ background: cat.gradient[0] }}>
        <DemoAvatar
          seed={request.image}
          rounded="none"
          label={`Fictional illustration of ${request.name}`}
          className="absolute right-0 top-0 aspect-square h-full w-auto"
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(90deg, ${cat.gradient[0]} 0%, ${cat.gradient[0]} 38%, transparent 75%)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: `linear-gradient(150deg, ${cat.gradient[0]} 0%, ${cat.gradient[0]} 35%, ${cat.gradient[1]} 140%)` }}
    >
      <DemoAvatar seed={request.image} rounded="none" label={`Fictional illustration of ${request.name}`} className="absolute inset-0 size-full opacity-95" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      {children}
    </div>
  );
}

export function SaveButton({ requestId, className, onDark }: { requestId: string; className?: string; onDark?: boolean }) {
  const session = useAuthStore((s) => s.session);
  const saved = useSavedIds(session?.userId);
  const toggle = useSavedStore((s) => s.toggleSaved);
  const isSaved = saved.includes(requestId);
  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from saved" : "Save request"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!session) {
          toast.info("Log in to a demo account to save requests.");
          return;
        }
        const now = toggle(session.userId, requestId);
        toast.success(now ? "Saved to your list" : "Removed from saved");
      }}
      className={cn(
        "grid size-9 place-items-center rounded-full transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
        onDark ? "bg-black/35 text-white backdrop-blur hover:bg-black/50" : "bg-muted hover:bg-accent",
        isSaved && "text-mint",
        className,
      )}
    >
      {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    </button>
  );
}

export function RequestCard({ request, className, showStatus }: { request: BillRequest; className?: string; showStatus?: boolean }) {
  return (
    <Link
      href={`/requests/${request.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border bg-card shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
        className,
      )}
    >
      <RequestCover request={request} className="aspect-[4/3]">
        <div className="absolute inset-x-3 top-3 flex items-start justify-between">
          <VerificationBadge state={request.verification} onDark />
          <SaveButton requestId={request.id} onDark />
        </div>
        <div className="absolute inset-x-4 bottom-4 text-white">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{request.name}</p>
            <FictionalTag className="text-white" />
          </div>
          <CountryLabel country={request.country} city={request.city} className="text-sm text-white/80" />
        </div>
      </RequestCover>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={request.category} />
          {showStatus && <StatusBadge status={request.status} />}
        </div>
        <div className="grid gap-1.5">
          <h3 className="font-semibold leading-snug tracking-tight group-hover:text-primary">{request.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{request.summary}</p>
        </div>
        <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} className="mt-auto" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {request.supporters} supporters
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" /> {dueLabel(request.dueDate)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="grid gap-3 p-5">
        <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
