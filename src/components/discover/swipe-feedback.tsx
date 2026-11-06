"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Heart, X } from "lucide-react";

export interface FeedbackEvent {
  /** Increments on every swipe so repeated swipes replay the animation. */
  id: number;
  kind: "interested" | "skip";
  name: string;
}

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: Math.cos(angle) * 92, y: Math.sin(angle) * 92, delay: (i % 3) * 0.03 };
});

/**
 * Overlay played over the deck after a swipe: a green heart burst with a confirmation for
 * "interested", a brief red mark for "skip". Purely decorative — the toast carries the message
 * for assistive tech — and reduced to a quick fade when the user prefers reduced motion.
 */
export function SwipeFeedback({ event, reducedMotion }: { event: FeedbackEvent | null; reducedMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center" aria-hidden>
      <AnimatePresence>
        {event?.kind === "interested" && (
          <motion.div
            key={event.id}
            className="relative grid place-items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {!reducedMotion && (
              <>
                <motion.span
                  className="absolute size-40 rounded-full border-4 border-emerald-400"
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
                {PARTICLES.map((p, i) => (
                  <motion.span
                    key={i}
                    className="absolute size-2.5 rounded-full bg-emerald-400"
                    initial={{ x: 0, y: 0, scale: 0.6, opacity: 1 }}
                    animate={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
                    transition={{ duration: 0.65, delay: p.delay, ease: "easeOut" }}
                  />
                ))}
              </>
            )}
            <motion.span
              className="grid size-24 place-items-center rounded-full bg-emerald-500 text-white shadow-[0_12px_40px_-8px] shadow-emerald-600/60"
              initial={reducedMotion ? { opacity: 0 } : { scale: 0.2, rotate: -20 }}
              animate={reducedMotion ? { opacity: 1 } : { scale: [0.2, 1.18, 1], rotate: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Heart className="size-11 fill-current" />
            </motion.span>
            <motion.span
              className="absolute top-[calc(100%+1rem)] whitespace-nowrap rounded-full bg-card/95 px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-lift dark:text-emerald-300"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : 0.18, duration: 0.3 }}
            >
              Interested in {event.name.split(" ")[0]}&apos;s request
            </motion.span>
          </motion.div>
        )}
        {event?.kind === "skip" && (
          <motion.span
            key={event.id}
            className="grid size-20 place-items-center rounded-full bg-rose-500/90 text-white shadow-lg"
            initial={reducedMotion ? { opacity: 0 } : { scale: 0.4, opacity: 0, x: -30 }}
            animate={reducedMotion ? { opacity: 0.9 } : { scale: 1, opacity: 0.95, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <X className="size-10" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
