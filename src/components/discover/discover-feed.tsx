"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Compass,
  Heart,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { BillRequest, SwipeDirection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/basic";
import { ConfirmDialog, Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/overlays";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/primitives";
import { EmptyState } from "@/components/layout/page-parts";
import { SafetyMenu } from "@/components/requests/safety-actions";
import { ACTION_LOCK_MS, StackedCard, SwipeCard, type EnterFrom, type ExitDirection } from "./swipe-card";
import { StorySheet } from "./story-sheet";
import { SwipeFeedback, type FeedbackEvent } from "./swipe-feedback";
import { DiscoverFilters, EMPTY_FILTERS, activeFilterCount, type DiscoverFilterState } from "./discover-filters";
import { useAuthStore } from "@/store/auth-store";
import { isDiscoverable, useRequestsStore } from "@/store/requests-store";
import { useSwipeHistory, useSwipeStore } from "@/store/swipe-store";
import { useBlockedIds, useSavedIds, useSavedStore } from "@/store/saved-store";
import { useAdminStore, useSuspendedUserIds } from "@/store/admin-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { t } from "@/lib/i18n/messages";

function useDeck(filters: DiscoverFilterState, priorityId: string | null) {
  const session = useAuthStore((s) => s.session);
  const requests = useRequestsStore((s) => s.requests);
  const history = useSwipeHistory(session?.userId);
  const blocked = useBlockedIds(session?.userId);
  const allowUnverified = useAdminStore((s) => s.settings.allowUnverifiedInFeed);
  const disabledCategories = useAdminStore((s) => s.categories.filter((c) => !c.enabled).map((c) => c.id).join(","));
  const suspended = useSuspendedUserIds();

  return React.useMemo(() => {
    const swiped = new Set(history.map((h) => h.requestId));
    const approvedOnly = filters.approvedOnly || !allowUnverified;
    const matching = requests.filter(
      (r) =>
        isDiscoverable(r) &&
        r.userId !== session?.userId &&
        !blocked.includes(r.userId) &&
        !suspended.has(r.userId) &&
        !disabledCategories.split(",").includes(r.category) &&
        (filters.categories.length === 0 || filters.categories.includes(r.category)) &&
        (filters.countries.length === 0 || filters.countries.includes(r.country)) &&
        (filters.currencies.length === 0 || filters.currencies.includes(r.currency)) &&
        (!approvedOnly || r.verification === "demo_approved"),
    );
    const queue = matching
      .filter((r) => !swiped.has(r.id))
      .sort((a, b) => {
        if (a.id === priorityId) return -1;
        if (b.id === priorityId) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    return { queue, totalMatching: matching.length, allowUnverified };
  }, [requests, history, blocked, suspended, filters, priorityId, session?.userId, allowUnverified, disabledCategories]);
}

/** Light haptic on touch devices only, and only after the user has interacted (browsers block it otherwise). */
function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true;
  if (activated && window.matchMedia("(pointer: coarse)").matches) navigator.vibrate(pattern);
}

function ControlButton({
  label,
  shortcut,
  onClick,
  disabled,
  className,
  children,
  size = "md",
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={shortcut ? `${label} (${shortcut})` : label}
          className={cn(
            "grid place-items-center rounded-full border bg-card shadow-soft transition outline-none hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/60 active:scale-95 disabled:pointer-events-none disabled:opacity-40",
            size === "sm" && "size-11 [&_svg]:size-4",
            size === "md" && "size-14 [&_svg]:size-6",
            size === "lg" && "size-16 [&_svg]:size-7",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut && <span className="ml-1.5 opacity-60">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function DiscoverFeed() {
  const router = useRouter();
  const reducedMotion = !!useReducedMotion();
  const userId = useAuthStore((s) => s.session?.userId ?? "");
  const swipe = useSwipeStore((s) => s.swipe);
  const undo = useSwipeStore((s) => s.undo);
  const resetUser = useSwipeStore((s) => s.resetUser);
  const history = useSwipeHistory(userId);
  const savedIds = useSavedIds(userId);
  const toggleSaved = useSavedStore((s) => s.toggleSaved);
  const showHints = usePreferencesStore((s) => s.showSwipeHints);
  const setShowHints = usePreferencesStore((s) => s.setShowSwipeHints);
  const pushNotification = useNotificationsStore((s) => s.push);

  const [filters, setFilters] = React.useState<DiscoverFilterState>(EMPTY_FILTERS);
  const [priorityId, setPriorityId] = React.useState<string | null>(null);
  const [exitDir, setExitDir] = React.useState<ExitDirection>("left");
  const [enterFrom, setEnterFrom] = React.useState<EnterFrom>("stack");
  const [loading, setLoading] = React.useState(true);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [storyOpen, setStoryOpen] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackEvent | null>(null);
  const [savePulse, setSavePulse] = React.useState(0);
  const { queue, totalMatching, allowUnverified } = useDeck(filters, priorityId);
  const top: BillRequest | undefined = queue[0];
  const interestedCount = history.filter((h) => h.direction === "right").length;

  // Simulated network latency for the loading state (and on filter changes)
  React.useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [filters]);

  // Briefly lock the deck after each action so a fast double-tap can't respond to two cards at once.
  const busyUntil = React.useRef(0);
  const claimAction = React.useCallback(() => {
    const now = Date.now();
    if (now < busyUntil.current) return false;
    busyUntil.current = now + ACTION_LOCK_MS;
    return true;
  }, []);

  const doSwipe = React.useCallback(
    (dir: SwipeDirection) => {
      if (!top || !claimAction()) return;
      // Exit direction and card removal commit in the same render, so AnimatePresence uses the new direction.
      setExitDir(dir);
      {
        const ok = swipe(userId, top.id, dir);
        if (!ok) {
          toast.error("You've already responded to this request.");
          return;
        }
        setPriorityId(null);
        setEnterFrom("stack");
        setFeedback((f) => ({ id: (f?.id ?? 0) + 1, kind: dir === "right" ? "interested" : "skip", name: top.name }));
        haptic(dir === "right" ? [12, 40, 18] : 6);
        if (dir === "right") {
          toast.success(`Interested in ${top.name}'s request`, {
            description: "Saved to your interested list. Swiping never charges you.",
            action: { label: "View", onClick: () => router.push(`/requests/${top.id}`) },
          });
          if (interestedCount === 0) {
            pushNotification(userId, {
              title: "Your first match of kindness",
              body: `You showed interest in ${top.name}'s request. Open it any time to simulate a contribution.`,
              href: `/requests/${top.id}`,
              tone: "success",
            });
          }
        }
      }
    },
    [top, claimAction, swipe, userId, router, interestedCount, pushNotification],
  );

  // Swipe up / ↑ / info button: expand the full story in place, without leaving the deck.
  const openDetails = React.useCallback(() => {
    if (!top) return;
    setStoryOpen(true);
  }, [top]);

  // Clear the feedback overlay after it has played.
  React.useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), feedback.kind === "interested" ? 1100 : 450);
    return () => clearTimeout(t);
  }, [feedback]);

  const doUndo = React.useCallback(() => {
    if (!claimAction()) return;
    const last = undo(userId);
    if (!last) {
      toast.info("Nothing to undo yet.");
      return;
    }
    // The card flies back in from the side it left; the card it covers slides back into the stack.
    setExitDir("stack");
    setEnterFrom(last.direction);
    setPriorityId(last.requestId);
    toast(last.direction === "right" ? "Removed from interested" : "Brought the card back");
  }, [claimAction, undo, userId]);

  const doSave = React.useCallback(() => {
    if (!top) return;
    const saved = toggleSaved(userId, top.id);
    if (saved) setSavePulse((n) => n + 1);
    toast.success(saved ? "Saved for later" : "Removed from saved");
  }, [top, toggleSaved, userId]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input, textarea, select, [role=dialog], [role=alertdialog], [role=menu]")) return;
      if (e.key === "ArrowRight") doSwipe("right");
      else if (e.key === "ArrowLeft") doSwipe("left");
      else if (e.key === "ArrowUp") {
        e.preventDefault();
        openDetails();
      } else if (e.key.toLowerCase() === "z" || e.key === "Backspace") doUndo();
      else if (e.key.toLowerCase() === "s") doSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSwipe, openDetails, doUndo, doSave]);

  const filterCount = activeFilterCount(filters);
  const filterPanel = <DiscoverFilters value={filters} onChange={setFilters} allowUnverified={allowUnverified} />;
  const isSaved = top ? savedIds.includes(top.id) : false;

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_280px] lg:px-8 lg:py-10">
      {/* Left: filters (desktop) */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24 grid gap-5 rounded-3xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <SlidersHorizontal className="size-4" /> Filters
            </h2>
            {filterCount > 0 && <Badge>{filterCount} active</Badge>}
          </div>
          {filterPanel}
        </div>
      </aside>

      {/* Center: deck */}
      <section className="flex min-w-0 flex-col items-center" aria-label="Discover requests">
        <div className="mb-4 flex w-full max-w-[420px] items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Discover</h1>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {loading ? t("swipe.loading") : t("swipe.remaining", { left: queue.length, total: totalMatching })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {top && <SafetyMenu request={top} />}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal /> Filters
                  {filterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{filterCount}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-6">
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the requests you see while swiping.</SheetDescription>
                {filterPanel}
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Height leaves room for the action buttons above the mobile tab bar; capped on tall screens. */}
        <div className="relative h-[clamp(340px,calc(100dvh-24rem),600px)] w-full max-w-[420px] lg:h-[clamp(460px,calc(100dvh-19rem),640px)]">
          {loading ? (
            <Skeleton className="absolute inset-0 rounded-[2rem]" aria-label="Loading requests" />
          ) : top ? (
            <>
              {queue
                .slice(1, 3)
                .reverse()
                .map((r) => (
                  <StackedCard key={r.id} request={r} depth={queue.indexOf(r)} />
                ))}
              <AnimatePresence custom={exitDir} initial={false}>
                <SwipeCard
                  key={top.id}
                  request={top}
                  onSwipe={doSwipe}
                  onOpen={openDetails}
                  reducedMotion={reducedMotion}
                  enterFrom={top.id === priorityId ? enterFrom : "stack"}
                />
              </AnimatePresence>
            </>
          ) : (
            <EmptyState
              className="absolute inset-0 content-center bg-card"
              icon={Sparkles}
              title={totalMatching === 0 ? "No requests match these filters" : "You're all caught up"}
              description={
                totalMatching === 0
                  ? "Try removing a filter or two to see more fictional demo requests."
                  : "You've responded to every request that matches your filters. Check your interested list or start the demo deck over."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {filterCount > 0 && (
                    <Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>
                      Clear filters
                    </Button>
                  )}
                  {totalMatching > 0 && (
                    <Button variant="outline" onClick={() => setResetOpen(true)}>
                      <RotateCcw /> Start over
                    </Button>
                  )}
                  <Button asChild>
                    <Link href="/saved">View interested</Link>
                  </Button>
                </div>
              }
            />
          )}
          <SwipeFeedback event={feedback} reducedMotion={reducedMotion} />
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4" role="toolbar" aria-label="Swipe actions">
          <ControlButton label={t("swipe.undo")} shortcut="Z" onClick={doUndo} disabled={history.length === 0} size="sm">
            <RotateCcw className="text-amber-500" />
          </ControlButton>
          <ControlButton label={t("swipe.skip")} shortcut="←" onClick={() => doSwipe("left")} disabled={!top || loading} size="lg">
            <X className="text-rose-500" />
          </ControlButton>
          <ControlButton label={t("swipe.details")} shortcut="↑" onClick={openDetails} disabled={!top || loading} size="sm">
            <Info className="text-sky-500" />
          </ControlButton>
          <ControlButton
            label={t("swipe.interested")}
            shortcut="→"
            onClick={() => doSwipe("right")}
            disabled={!top || loading}
            size="lg"
            className="border-primary/40 bg-primary text-primary-foreground"
          >
            <Heart className="fill-current" />
          </ControlButton>
          <ControlButton label={isSaved ? t("swipe.unsave") : t("swipe.save")} shortcut="S" onClick={doSave} disabled={!top || loading} size="sm">
            <motion.span
              key={savePulse}
              className="grid place-items-center"
              initial={savePulse && !reducedMotion ? { scale: 0.5, rotate: -15 } : false}
              animate={{ scale: [0.5, 1.3, 1], rotate: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              {isSaved ? <BookmarkCheck className="fill-primary/20 text-primary" /> : <Bookmark className="text-primary" />}
            </motion.span>
          </ControlButton>
        </div>
        <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground">
          {t("swipe.disclaimer")}
        </p>
      </section>

      {/* Right: session + hints (desktop) */}
      <aside className="hidden lg:block" aria-label="Your session">
        <div className="sticky top-24 grid gap-4">
          <div className="grid gap-3 rounded-3xl border bg-card p-5 shadow-soft">
            <h2 className="font-semibold">This session</h2>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Swiped", history.length],
                ["Interested", interestedCount],
                ["Saved", savedIds.length],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-muted/70 p-3">
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Button asChild variant="outline" size="sm">
              <Link href="/saved">Open interested & saved</Link>
            </Button>
          </div>
          {showHints && (
            <div className="grid gap-3 rounded-3xl border bg-card p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Gestures</h2>
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowHints(false)}>
                  Hide
                </button>
              </div>
              <ul className="grid gap-2.5 text-sm">
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
                    <ArrowRight className="size-4" />
                  </span>
                  Swipe right — interested
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-rose-500/12 text-rose-500">
                    <ArrowLeft className="size-4" />
                  </span>
                  Swipe left — skip
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-xl bg-sky-500/12 text-sky-500">
                    <ArrowUp className="size-4" />
                  </span>
                  Swipe up — full story
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">Keyboard: ← → ↑, Z to undo, S to save.</p>
            </div>
          )}
          <div className="rounded-3xl border border-dashed p-5 text-xs leading-relaxed text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
              <Compass className="size-4" /> Prefer browsing?
            </p>
            See every request in a grid on{" "}
            <Link href="/explore" className="text-primary underline-offset-2 hover:underline">
              Explore
            </Link>
            .
          </div>
        </div>
      </aside>

      <StorySheet
        request={top}
        open={storyOpen && !!top}
        onOpenChange={setStoryOpen}
        saved={isSaved}
        onSave={doSave}
        onSkip={() => {
          setStoryOpen(false);
          doSwipe("left");
        }}
        onInterested={() => {
          setStoryOpen(false);
          doSwipe("right");
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Start the deck over?"
        description="This clears your swipe history, including your interested list. Saved requests stay saved."
        confirmLabel="Start over"
        onConfirm={() => {
          resetUser(userId);
          toast.success("Deck reset — happy swiping");
        }}
      />
    </div>
  );
}
