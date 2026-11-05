"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  EyeOff,
  FileLock2,
  HandHeart,
  Heart,
  Info,
  Link2,
  MapPin,
  SearchX,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { CATEGORY_MAP, COUNTRY_MAP } from "@/lib/constants";
import { cn, dueLabel, formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/basic";
import { EmptyState, PageContainer } from "@/components/layout/page-parts";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { CategoryBadge, CountryLabel, FictionalTag, StatusBadge, VerificationBadge } from "./badges";
import { FundingProgress, Money } from "./money";
import { RequestCover, SaveButton } from "./request-card";
import { ContributeDialog } from "./contribute-dialog";
import { SafetyMenu } from "./safety-actions";
import { useHydrated } from "@/store/hydration-store";
import { useAuthStore } from "@/store/auth-store";
import { useRequestsStore } from "@/store/requests-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useBlockedIds, useSavedStore } from "@/store/saved-store";
import { useSwipeHistory, useSwipeStore } from "@/store/swipe-store";

function DetailSkeleton() {
  return (
    <PageContainer aria-busy="true">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </PageContainer>
  );
}

function StatusNotice({ request, isOwner }: { request: BillRequest; isOwner: boolean }) {
  const map: Partial<Record<BillRequest["status"], { icon: typeof Info; tone: string; text: string }>> = {
    pending_review: {
      icon: Info,
      tone: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
      text: "This request is waiting for moderator review in the demo and isn't accepting simulated contributions yet.",
    },
    needs_info: {
      icon: Info,
      tone: "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200",
      text: `A moderator asked for more information.${request.adminNote ? ` Note: “${request.adminNote}”` : ""}`,
    },
    rejected: {
      icon: AlertTriangle,
      tone: "border-red-500/30 bg-red-500/10 text-red-900 dark:text-red-200",
      text: `This request was rejected by a demo moderator.${request.adminNote ? ` Reason: “${request.adminNote}”` : ""}`,
    },
    withdrawn: {
      icon: EyeOff,
      tone: "border-zinc-500/30 bg-zinc-500/10",
      text: isOwner ? "You withdrew this request. It's hidden from Discover and Explore." : "The requester withdrew this request.",
    },
    completed: {
      icon: ShieldCheck,
      tone: "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200",
      text: "This fictional request reached its goal in the simulation. No real funds were transferred.",
    },
  };
  const m = map[request.status];
  if (!m && !request.flagged) return null;
  return (
    <div className="grid gap-3">
      {m && (
        <div role="status" className={cn("flex items-start gap-3 rounded-2xl border p-4 text-sm", m.tone)}>
          <m.icon className="mt-0.5 size-4 shrink-0" />
          <p>{m.text}</p>
        </div>
      )}
      {request.flagged && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-900 dark:text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>Flagged by moderators for review. It&apos;s hidden from Discover until the review is complete.</p>
        </div>
      )}
    </div>
  );
}

export function RequestDetail({ id }: { id: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const request = useRequestsStore((s) => s.requests.find((r) => r.id === id));
  const allContribs = useContributionsStore((s) => s.contributions);
  const session = useAuthStore((s) => s.session);
  const blocked = useBlockedIds(session?.userId);
  const unblock = useSavedStore((s) => s.unblock);
  const history = useSwipeHistory(session?.userId);
  const swipe = useSwipeStore((s) => s.swipe);
  const removeInterest = useSwipeStore((s) => s.removeInterest);
  const [contributeOpen, setContributeOpen] = React.useState(false);

  const supporters = React.useMemo(
    () => allContribs.filter((c) => c.requestId === id && (c.status === "recorded" || c.status === "fulfilled")).slice(0, 6),
    [allContribs, id],
  );

  if (!hydrated) return <DetailSkeleton />;
  if (!request) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title="Request not found"
          description="This request doesn't exist in the demo data. It may have been removed, or the link is incorrect."
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Go back
              </Button>
              <Button asChild>
                <Link href="/explore">Explore requests</Link>
              </Button>
            </div>
          }
        />
      </PageContainer>
    );
  }

  const isOwner = session?.userId === request.userId;
  const isBlocked = blocked.includes(request.userId);
  const remaining = Math.max(0, request.amount - request.amountRaised);
  const swipeRecord = history.find((h) => h.requestId === request.id);
  const interested = swipeRecord?.direction === "right";
  const canContribute = request.status === "active" && !request.flagged && !isOwner && remaining > 0;
  const cat = CATEGORY_MAP[request.category];
  const country = COUNTRY_MAP[request.country];

  const contributeBlockedReason = isOwner
    ? "You can't contribute to your own request."
    : request.status !== "active"
      ? "This request isn't accepting simulated contributions."
      : request.flagged
        ? "This request is under moderator review."
        : null;

  const toggleInterest = () => {
    if (!session) {
      toast.info("Log in to a demo account to mark interest.");
      return;
    }
    if (interested) {
      removeInterest(session.userId, request.id);
      toast("Removed from interested");
    } else {
      if (swipeRecord) removeInterest(session.userId, request.id);
      swipe(session.userId, request.id, "right");
      toast.success("Added to your interested list", { description: "This doesn't charge you anything." });
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't copy the link. You can copy it from the address bar.");
    }
  };

  const facts: { icon: typeof Tag; label: string; value: React.ReactNode }[] = [
    { icon: cat.icon, label: "Bill category", value: cat.label },
    { icon: Wallet, label: "Amount requested", value: <Money amount={request.amount} currency={request.currency} /> },
    { icon: HandHeart, label: "Raised (simulated)", value: <Money amount={request.amountRaised} currency={request.currency} /> },
    { icon: Tag, label: "Remaining", value: <Money amount={remaining} currency={request.currency} /> },
    { icon: MapPin, label: "Country", value: `${country.flag} ${country.name}` },
    { icon: CalendarClock, label: "Due date", value: `${formatDate(request.dueDate)} · ${dueLabel(request.dueDate)}` },
    { icon: Users, label: "Supporters (simulated)", value: request.supporters },
    { icon: CalendarDays, label: "Posted", value: formatDate(request.createdAt) },
  ];

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => (window.history.length > 1 ? router.back() : router.push("/explore"))}>
          <ArrowLeft /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={share}>
            <Link2 /> Share
          </Button>
          {!isOwner && <SafetyMenu request={request} onBlocked={() => router.push("/discover")} />}
        </div>
      </div>

      {isBlocked && (
        <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-2xl border bg-muted/60 p-4 text-sm sm:flex-row sm:items-center">
          <p>You blocked {request.name}. Their requests are hidden from your feed.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (session) unblock(session.userId, request.userId);
              toast.success(`${request.name} unblocked`);
            }}
          >
            Unblock
          </Button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="grid min-w-0 gap-6">
          <RequestCover request={request} wide className="h-72 rounded-3xl sm:h-80">
            <div className="absolute inset-x-5 top-5 flex flex-wrap items-center gap-2">
              <VerificationBadge state={request.verification} onDark />
              <FictionalTag className="bg-black/30 text-white backdrop-blur" />
            </div>
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white">
              <div className="grid max-w-[70%] gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl">{request.title}</h1>
                <p className="text-sm text-white/80">
                  by {request.name} · <CountryLabel country={request.country} city={request.city} />
                </p>
              </div>
              <SaveButton requestId={request.id} onDark className="shrink-0" />
            </div>
          </RequestCover>

          <StatusNotice request={request} isOwner={isOwner} />

          <Card className="p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <CategoryBadge category={request.category} />
              <StatusBadge status={request.status} />
              <VerificationBadge state={request.verification} />
            </div>
            <h2 className="text-lg font-semibold">{request.name.split(" ")[0]}&apos;s story</h2>
            <p className="mt-2 text-base font-medium leading-relaxed">{request.summary}</p>
            <div className="mt-4 grid gap-4 text-[15px] leading-relaxed text-muted-foreground">
              {request.story.split(/\n\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
              This person and story are fictional, created to demonstrate the BillSwipe prototype.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="mb-5 text-lg font-semibold">About this bill</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-xs">
                    <f.icon className="size-4" />
                  </span>
                  <div>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="mt-0.5 font-medium">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex items-start gap-3 rounded-2xl border p-4 text-sm text-muted-foreground">
              <FileLock2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                <strong className="text-foreground">Bill documents are private.</strong> Original documents are only ever seen by moderators and are
                never shown on public pages or discovery cards. In this prototype, documents are never uploaded or stored.
              </p>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent supporters</h2>
              <span className="text-xs text-muted-foreground">Simulated activity</span>
            </div>
            {supporters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No simulated contributions yet. Be the first to show support.</p>
            ) : (
              <ul className="grid gap-3">
                {supporters.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <DemoAvatar seed={c.userId} className="size-9" label={c.donorName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.donorName.split(" ")[0]}</p>
                      {c.message && <p className="truncate text-xs text-muted-foreground">“{c.message}”</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(c.amount, c.currency)}</p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Sticky funding card */}
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <Card className="grid gap-5 p-6">
            <div className="flex items-center gap-3">
              <DemoAvatar seed={request.image} label={request.name} className="size-12" />
              <div>
                <p className="font-semibold">{request.name}</p>
                <p className="text-xs text-muted-foreground">
                  {request.city} · {country.name}
                </p>
              </div>
            </div>
            <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} size="lg" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Remaining</p>
                <p className="text-sm font-semibold">{formatCurrency(remaining, request.currency, { compact: remaining >= 10000 })}</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Supporters</p>
                <p className="text-sm font-semibold">{request.supporters}</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Due</p>
                <p className="text-sm font-semibold">{formatDate(request.dueDate, { day: "numeric", month: "short" })}</p>
              </div>
            </div>

            {isOwner ? (
              <div className="grid gap-2 rounded-2xl bg-primary/8 p-4 text-sm">
                <p className="font-medium">This is your request</p>
                <p className="text-muted-foreground">Manage, edit or withdraw it from your requester dashboard.</p>
                <Button asChild size="sm" className="mt-1 justify-self-start">
                  <Link href="/dashboard/requester">Open dashboard</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Button size="lg" onClick={() => setContributeOpen(true)} disabled={!canContribute}>
                  <HandHeart /> Simulate a contribution
                </Button>
                {contributeBlockedReason && <p className="text-center text-xs text-muted-foreground">{contributeBlockedReason}</p>}
                <Button variant={interested ? "secondary" : "outline"} size="lg" onClick={toggleInterest} aria-pressed={interested}>
                  <Heart className={cn(interested && "fill-current text-primary")} />
                  {interested ? "Interested" : "I'm interested"}
                </Button>
              </div>
            )}
            <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <strong>Prototype:</strong> balances and contributions are simulated. BillSwipe is not a live donation service and no one receives real
              money through this demo.
            </p>
          </Card>
        </motion.aside>
      </div>

      <ContributeDialog request={request} open={contributeOpen} onOpenChange={setContributeOpen} />
    </PageContainer>
  );
}
