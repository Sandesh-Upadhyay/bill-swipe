"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Compass, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SwipePreview } from "./swipe-preview";
import { COUNTRIES, TAGLINE } from "@/lib/constants";

export function Hero() {
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 22 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative isolate overflow-hidden bg-hero text-white">
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:px-8 lg:pb-28">
        <div>
          <motion.div {...fade(0)}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-mint backdrop-blur">
              <Sparkles className="size-3.5" /> {TAGLINE}
            </span>
          </motion.div>
          <motion.h1
            {...fade(0.08)}
            className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-[4.25rem]"
          >
            Your next swipe could <span className="text-gradient">change someone&apos;s life.</span>
          </motion.h1>
          <motion.p {...fade(0.16)} className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            BillSwipe turns genuine, essential bills — rent, medicine, power, tuition — into short, honest stories you can discover in
            seconds. Swipe right to show you care. Help when you&apos;re ready.
          </motion.p>
          <motion.div {...fade(0.24)} className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" variant="mint" className="group">
              <Link href="/discover">
                Start swiping <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link href="/submit">
                <FileUp /> Share a bill
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
              <Link href="/explore">
                <Compass /> Explore requests
              </Link>
            </Button>
          </motion.div>
          <motion.div {...fade(0.32)} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/60">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-mint" /> Documents never shown publicly
            </span>
            <span className="inline-flex items-center gap-1.5" aria-label="Countries in the prototype">
              {COUNTRIES.map((c) => (
                <span key={c.code} title={c.name} aria-hidden>
                  {c.flag}
                </span>
              ))}
              <span className="ml-1">8 countries</span>
            </span>
          </motion.div>
          <motion.p {...fade(0.4)} className="mt-6 max-w-lg text-xs text-white/45">
            Prototype v1.0 — every person and request shown is fictional, and every contribution is simulated. No money moves.
          </motion.p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <SwipePreview />
        </motion.div>
      </div>
    </section>
  );
}
