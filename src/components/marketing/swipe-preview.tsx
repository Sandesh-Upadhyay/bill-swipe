"use client";

import * as React from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ChevronUp, Heart, RotateCcw, X } from "lucide-react";
import { buildSeedRequests } from "@/lib/data/requests";
import type { BillRequest } from "@/lib/types";
import { RequestCover } from "@/components/requests/request-card";
import { CategoryBadge, CountryLabel, FictionalTag, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress } from "@/components/requests/money";
import { cn } from "@/lib/utils";

const PREVIEW_IDS = ["req_ananya", "req_marisol", "req_amelia", "req_grace", "req_kemal", "req_camille", "req_joy"];

function PreviewCard({
  request,
  onSwipe,
  isTop,
  depth,
  autoDir,
}: {
  request: BillRequest;
  onSwipe: (dir: "left" | "right") => void;
  isTop: boolean;
  depth: number;
  autoDir: "left" | "right" | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const likeOpacity = useTransform(x, [20, 110], [0, 1]);
  const skipOpacity = useTransform(x, [-110, -20], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 touch-none select-none"
      style={{ x: isTop ? x : 0, rotate: isTop ? rotate : 0, zIndex: 10 - depth }}
      initial={{ scale: 0.92, y: 18, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 14, opacity: depth > 2 ? 0 : 1 }}
      custom={autoDir}
      variants={{
        exit: (d: "left" | "right" | null) => ({
          x: d === "left" ? -360 : 360,
          rotate: d === "left" ? -18 : 18,
          opacity: 0,
          transition: { duration: 0.45 },
        }),
      }}
      exit="exit"
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={(_, info) => {
        if (info.offset.x > 90) onSwipe("right");
        else if (info.offset.x < -90) onSwipe("left");
      }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.6rem] bg-card shadow-lift ring-1 ring-black/5">
        <RequestCover request={request} className="h-[58%] shrink-0">
          <div className="absolute inset-x-3 top-3 flex items-center justify-between">
            <VerificationBadge state={request.verification} onDark />
            <FictionalTag className="text-white" />
          </div>
          <div className="absolute inset-x-4 bottom-3 text-white">
            <p className="text-lg font-semibold">{request.name}</p>
            <CountryLabel country={request.country} city={request.city} className="text-xs text-white/80" />
          </div>
          {isTop && (
            <>
              <motion.span
                style={{ opacity: likeOpacity }}
                className="absolute left-4 top-14 -rotate-12 rounded-lg border-2 border-mint px-2 py-0.5 text-sm font-bold tracking-wider text-mint"
              >
                INTERESTED
              </motion.span>
              <motion.span
                style={{ opacity: skipOpacity }}
                className="absolute right-4 top-14 rotate-12 rounded-lg border-2 border-white/80 px-2 py-0.5 text-sm font-bold tracking-wider text-white"
              >
                SKIP
              </motion.span>
            </>
          )}
        </RequestCover>
        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <CategoryBadge category={request.category} />
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{request.title}</p>
          <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} className="mt-auto" />
        </div>
      </div>
    </motion.div>
  );
}

/** Interactive phone mockup that previews the swipe experience with fictional data. */
export function SwipePreview({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const all = React.useMemo(() => {
    const map = new Map(buildSeedRequests().map((r) => [r.id, r]));
    return PREVIEW_IDS.map((id) => map.get(id)).filter(Boolean) as BillRequest[];
  }, []);
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState<"left" | "right" | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [interested, setInterested] = React.useState(0);

  const swipe = React.useCallback(
    (d: "left" | "right") => {
      setDir(d);
      if (d === "right") setInterested((n) => n + 1);
      setIndex((i) => i + 1);
    },
    [],
  );

  React.useEffect(() => {
    if (reduce || paused) return;
    const t = setInterval(() => {
      setDir((prev) => (prev === "right" ? "left" : "right"));
      setIndex((i) => i + 1);
    }, 2800);
    return () => clearInterval(t);
  }, [reduce, paused]);

  const visible = [0, 1, 2].map((o) => all[(index + o) % all.length]);

  return (
    <div
      className={cn("relative mx-auto w-[300px] sm:w-[320px]", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="absolute -inset-10 rounded-full bg-primary/25 blur-3xl" aria-hidden />
      <div className="relative rounded-[2.75rem] border border-white/10 bg-[oklch(0.13_0.02_170)] p-3 shadow-2xl">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-background">
          <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-medium text-muted-foreground">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-black/80 dark:bg-black" aria-hidden />
            <span>BillSwipe</span>
          </div>
          <div className="flex items-center justify-between px-5 py-2">
            <p className="text-sm font-semibold">Discover</p>
            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
              {interested} interested
            </span>
          </div>
          <div className="relative mx-4 h-[400px]" aria-label="Swipe preview with fictional requests" role="group">
            <AnimatePresence initial={false} custom={dir}>
              {visible
                .map((r, depth) => (
                  <PreviewCard
                    key={`${r.id}-${index + depth}`}
                    request={r}
                    depth={depth}
                    isTop={depth === 0}
                    autoDir={dir}
                    onSwipe={swipe}
                  />
                ))
                .reverse()}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-center gap-3 px-5 pb-6 pt-8">
            <button
              type="button"
              onClick={() => swipe("left")}
              aria-label="Skip (preview)"
              className="grid size-12 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft transition hover:scale-105 hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            <span className="grid size-10 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft" aria-hidden>
              <ChevronUp className="size-4" />
            </span>
            <button
              type="button"
              onClick={() => swipe("right")}
              aria-label="Interested (preview)"
              className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift transition hover:scale-105"
            >
              <Heart className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              aria-label="Undo (preview)"
              className="grid size-10 place-items-center rounded-full border bg-card text-muted-foreground shadow-soft transition hover:text-foreground"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-white/60">Drag the card or use the buttons · fictional demo data</p>
    </div>
  );
}
