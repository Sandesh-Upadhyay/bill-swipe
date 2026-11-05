"use client";

import { Ban, Building2, EyeOff, Flag, FlaskConical, Lock } from "lucide-react";
import { VerificationBadge } from "@/components/requests/badges";
import type { VerificationState } from "@/lib/types";
import { Reveal, SectionHeading } from "./reveal";

const PILLARS = [
  {
    icon: EyeOff,
    title: "Documents stay private",
    body: "Bill documents are for moderator review only. They are never shown on discovery cards or public pages.",
  },
  {
    icon: Flag,
    title: "Report anything",
    body: "Every request has a one-tap report flow that sends it straight to the moderation queue.",
  },
  {
    icon: Ban,
    title: "Block with one tap",
    body: "Don't want to see someone's requests? Block them and they disappear from your feed.",
  },
  {
    icon: Building2,
    title: "Pay the bill, not a person",
    body: "In the live product, we plan to pay billers directly wherever possible — utilities, landlords, hospitals and schools.",
  },
  {
    icon: Lock,
    title: "Swipe ≠ payment",
    body: "Swiping right only signals interest. Contributing is always a separate, explicit step.",
  },
];

const LEGEND: { state: VerificationState; text: string }[] = [
  { state: "demo_approved", text: "A moderator approved it inside this prototype. Not an independent verification." },
  { state: "pending", text: "Submitted and waiting for review." },
  { state: "unverified", text: "No review completed yet — use extra care." },
  { state: "rejected", text: "Rejected by a moderator. Hidden from discovery." },
];

export function TrustSafety() {
  return (
    <section className="border-t bg-muted/40" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Trust & safety"
          title={<span id="trust-heading">Trust is the product</span>}
          description="Generosity only works when people feel safe on both sides. These principles shape every screen."
        />
        <div className="mt-14 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.05} className={i === 4 ? "sm:col-span-2" : ""}>
                <div className="flex h-full gap-4 rounded-3xl border bg-card p-6 shadow-soft">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">{p.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-3xl border bg-card p-7 shadow-soft">
              <h3 className="text-lg font-semibold tracking-tight">What the badges mean</h3>
              <p className="mt-1 text-sm text-muted-foreground">Every request shows exactly one review state.</p>
              <ul className="mt-6 grid gap-5">
                {LEGEND.map((l) => (
                  <li key={l.state} className="grid gap-2">
                    <VerificationBadge state={l.state} />
                    <p className="text-sm text-muted-foreground">{l.text}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 pt-4 text-sm text-amber-900 dark:text-amber-200">
                <FlaskConical className="mt-0.5 size-4 shrink-0" />
                <p>
                  <strong>Not a live donation service.</strong> This prototype never charges anyone, never transfers money, and no
                  requester actually receives funds.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
