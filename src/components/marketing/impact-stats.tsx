"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { COUNTRIES } from "@/lib/constants";
import { SectionHeading, Reveal } from "./reveal";

function Counter({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [value, setValue] = React.useState(reduce ? to : 0);

  React.useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, to, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setValue(v) });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

const STATS = [
  { to: 2.4, prefix: "$", suffix: "M", decimals: 1, label: "Simulated support pledged", hint: "Prototype projection" },
  { to: 18400, label: "Fictional bills discovered", hint: "Demo dataset scale" },
  { to: 63, suffix: "%", label: "Requests reaching goal", hint: "Simulated outcome" },
  { to: 8, label: "Launch countries", hint: "7 local currencies" },
];

export function ImpactStats() {
  return (
    <section className="relative isolate overflow-hidden bg-hero text-white" aria-labelledby="impact-heading">
      <div className="absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          light
          eyebrow="Global impact"
          title={<span id="impact-heading">Built for a world of everyday emergencies</span>}
          description="One experience across eight countries and seven currencies, with requests shown in local currency and an optional approximate USD view."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.07}>
              <div className="h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
                <p className="text-4xl font-semibold tracking-tight text-mint sm:text-5xl">
                  <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                </p>
                <p className="mt-3 text-sm font-medium">{s.label}</p>
                <p className="mt-1 text-xs text-white/50">{s.hint}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <ul className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Countries in the prototype">
            {COUNTRIES.map((c) => (
              <li key={c.code} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-white/80">
                <span aria-hidden>{c.flag}</span> {c.name}
                <span className="text-xs text-white/40">{c.currency}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-xs text-white/45">
            All figures on this page are simulated prototype figures for demonstration — not real platform results.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
