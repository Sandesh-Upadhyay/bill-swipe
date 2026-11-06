"use client";

import Link from "next/link";
import { ArrowUpRight, Bookmark, BookmarkCheck, CalendarClock, Heart, MapPin, Users, X } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { CATEGORY_MAP, COUNTRY_MAP } from "@/lib/constants";
import { dueLabel, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/overlays";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { CategoryBadge, FictionalTag, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress, Money } from "@/components/requests/money";
import { BillBreakdown } from "@/components/requests/bill-breakdown";

/**
 * Full story for the top card, opened by swiping up, pressing ↑ or the info button.
 * Lets donors read everything and respond without leaving the deck.
 */
export function StorySheet({
  request,
  open,
  onOpenChange,
  saved,
  onInterested,
  onSkip,
  onSave,
}: {
  request: BillRequest | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: boolean;
  onInterested: () => void;
  onSkip: () => void;
  onSave: () => void;
}) {
  if (!request) return null;
  const cat = CATEGORY_MAP[request.category];
  const country = COUNTRY_MAP[request.country];
  const remaining = Math.max(0, request.amount - request.amountRaised);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] max-w-2xl flex-col gap-0 p-0">
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4 sm:px-8">
          <div className="flex items-start gap-4">
            <DemoAvatar seed={request.image} rounded="2xl" className="size-16 shrink-0" label={`Fictional illustration of ${request.name}`} />
            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={request.category} />
                <VerificationBadge state={request.verification} />
                <FictionalTag />
              </div>
              <SheetTitle className="text-xl font-semibold leading-snug tracking-tight text-balance">{request.title}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{request.name}</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> {request.city} · {country.flag} {country.name}
                </span>
              </SheetDescription>
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-3xl border bg-muted/40 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Money amount={request.amount} currency={request.currency} className="text-3xl font-semibold tracking-tight" />
              <span className="text-xs text-muted-foreground">
                <Money amount={remaining} currency={request.currency} showUsdHint={false} /> still needed (simulated)
              </span>
            </div>
            <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" /> {formatDate(request.dueDate)} · {dueLabel(request.dueDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> {request.supporters} supporters (simulated)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <cat.icon className="size-3.5" /> {cat.label}
              </span>
            </div>
          </div>

          <section className="mt-6" aria-labelledby="sheet-story">
            <h3 id="sheet-story" className="text-base font-semibold">
              {request.name.split(" ")[0]}&apos;s story
            </h3>
            <p className="mt-2 font-medium leading-relaxed">{request.summary}</p>
            <div className="mt-3 grid gap-3 text-[15px] leading-relaxed text-muted-foreground">
              {request.story.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          <BillBreakdown request={request} className="mt-6 p-5 sm:p-6" />

          <p className="mt-4 rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
            This person and story are fictional. Bill documents are never shown publicly, and swiping right never charges you.
          </p>
        </div>

        {/* Sticky actions */}
        <div className="grid shrink-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 border-t bg-card/95 px-5 py-3 backdrop-blur sm:px-8">
          <Button variant="outline" size="icon" aria-label="Skip this request" onClick={onSkip} className="text-rose-600 hover:text-rose-700">
            <X />
          </Button>
          <Button variant="outline" size="icon" aria-label={saved ? "Remove from saved" : "Save for later"} aria-pressed={saved} onClick={onSave}>
            {saved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
          </Button>
          <div className="flex min-w-0 justify-end gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href={`/requests/${request.id}`}>
                Full page <ArrowUpRight />
              </Link>
            </Button>
            <Button onClick={onInterested} className="min-w-0">
              <Heart className="fill-current" /> I&apos;m interested
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
