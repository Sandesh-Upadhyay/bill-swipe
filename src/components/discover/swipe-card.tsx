"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { CalendarClock, ChevronUp, Heart, Users, X } from "lucide-react";
import type { BillRequest, SwipeDirection } from "@/lib/types";
import { cn, dueLabel } from "@/lib/utils";
import { RequestCover, SaveButton } from "@/components/requests/request-card";
import { CategoryBadge, CountryLabel, FictionalTag, VerificationBadge } from "@/components/requests/badges";
import { FundingProgress, Money } from "@/components/requests/money";

export const SWIPE_THRESHOLD = 110;
export type ExitDirection = SwipeDirection | "up";

export function SwipeCardBody({ request, compact }: { request: BillRequest; compact?: boolean }) {
  return (
    <RequestCover request={request} className="size-full">
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <VerificationBadge state={request.verification} onDark />
          <FictionalTag className="bg-black/30 text-white backdrop-blur" />
        </div>
        {!compact && <SaveButton requestId={request.id} onDark />}
      </div>
      <div className="absolute inset-x-0 bottom-0 grid gap-3 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-5 pt-16 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={request.category} className="bg-white/15 text-white backdrop-blur" />
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs backdrop-blur">
            <CalendarClock className="size-3.5" /> {dueLabel(request.dueDate)}
          </span>
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{request.name}</p>
          <CountryLabel country={request.country} city={request.city} className="text-sm text-white/75" />
        </div>
        <div className="flex items-baseline gap-2">
          <Money amount={request.amount} currency={request.currency} className="text-3xl font-semibold tracking-tight" />
          <span className="text-xs font-medium uppercase tracking-wider text-white/60">{request.currency} requested</span>
        </div>
        {!compact && <p className="line-clamp-3 text-sm leading-relaxed text-white/85">{request.summary}</p>}
        <FundingProgress raised={request.amountRaised} goal={request.amount} currency={request.currency} onDark />
        <div className="flex items-center justify-between text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {request.supporters} supporters (simulated)
          </span>
          {!compact && (
            <span className="inline-flex items-center gap-1">
              <ChevronUp className="size-3.5" /> Swipe up for story
            </span>
          )}
        </div>
      </div>
    </RequestCover>
  );
}

function Stamp({ label, opacity, className, icon }: { label: string; opacity: MotionValue<number>; className: string; icon: React.ReactNode }) {
  return (
    <motion.div
      style={{ opacity }}
      className={cn(
        "pointer-events-none absolute z-10 flex items-center gap-2 rounded-2xl border-[3px] px-4 py-2 text-lg font-bold uppercase tracking-widest backdrop-blur-sm",
        className,
      )}
      aria-hidden
    >
      {icon}
      {label}
    </motion.div>
  );
}

const exitVariants = {
  initial: { scale: 0.94, y: 18, opacity: 0 },
  enter: { scale: 1, y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 260, damping: 26 } },
  exit: (dir: ExitDirection) => ({
    x: dir === "right" ? 640 : dir === "left" ? -640 : 0,
    y: dir === "up" ? -40 : 30,
    rotate: dir === "right" ? 18 : dir === "left" ? -18 : 0,
    opacity: 0,
    transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  }),
};

/** The draggable top card. Swipe right = interested, left = skip, up = details. */
export function SwipeCard({
  request,
  onSwipe,
  onOpen,
  reducedMotion,
}: {
  request: BillRequest;
  onSwipe: (dir: SwipeDirection) => void;
  onOpen: () => void;
  reducedMotion: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-14, 14]);
  const likeOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
  const upOpacity = useTransform(y, [-SWIPE_THRESHOLD, -30], [1, 0]);
  const dragged = React.useRef(false);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragSnapToOrigin
      dragElastic={0.85}
      dragMomentum={false}
      variants={reducedMotion ? undefined : exitVariants}
      initial={reducedMotion ? false : "initial"}
      animate={reducedMotion ? undefined : "enter"}
      exit="exit"
      whileTap={{ scale: 1.01 }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        if (offset.x > SWIPE_THRESHOLD || velocity.x > 700) onSwipe("right");
        else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -700) onSwipe("left");
        else if (offset.y < -SWIPE_THRESHOLD || velocity.y < -700) onOpen();
        setTimeout(() => (dragged.current = false), 0);
      }}
      role="group"
      aria-roledescription="Swipeable request card"
      aria-label={`${request.name}, ${request.title}. Use the buttons below or arrow keys to respond.`}
    >
      <div className="relative size-full overflow-hidden rounded-[2rem] border border-white/10 bg-card shadow-lift">
        <Stamp
          label="Interested"
          opacity={likeOpacity}
          className="left-5 top-20 -rotate-12 border-mint bg-mint/20 text-mint"
          icon={<Heart className="size-5" />}
        />
        <Stamp
          label="Skip"
          opacity={skipOpacity}
          className="right-5 top-20 rotate-12 border-rose-400 bg-rose-500/20 text-rose-200"
          icon={<X className="size-5" />}
        />
        <Stamp
          label="Details"
          opacity={upOpacity}
          className="left-1/2 top-1/3 -translate-x-1/2 border-sky-300 bg-sky-500/20 text-sky-100"
          icon={<ChevronUp className="size-5" />}
        />
        <SwipeCardBody request={request} />
      </div>
    </motion.div>
  );
}

/** Background cards (non-interactive) peeking behind the top card. */
export function StackedCard({ request, depth }: { request: BillRequest; depth: number }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      initial={false}
      animate={{ scale: 1 - depth * 0.045, y: depth * 16, opacity: depth > 2 ? 0 : 1 - depth * 0.18 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <div className="relative size-full overflow-hidden rounded-[2rem] border border-white/10 bg-card shadow-soft">
        <SwipeCardBody request={request} compact />
      </div>
    </motion.div>
  );
}
