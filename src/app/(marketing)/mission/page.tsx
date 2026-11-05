import type { Metadata } from "next";
import { Compass, Eye, Globe2, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/marketing/reveal";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = { title: "Our mission" };

const VALUES = [
  { icon: HeartHandshake, title: "Dignity first", body: "Asking for help should never feel like begging. Short stories, no public documents, no pressure tactics." },
  { icon: Eye, title: "Radical transparency", body: "Clear review states, visible progress, and honest labels — including on everything in this prototype." },
  { icon: ShieldCheck, title: "Safety by design", body: "Report and block on every request, private moderation, and a plan to pay billers directly." },
  { icon: Globe2, title: "Local, everywhere", body: "Local currencies, local context and a global community of people who want to help." },
  { icon: Scale, title: "Fair by default", body: "Discovery that doesn't reward whoever shouts loudest — every genuine bill deserves to be seen." },
  { icon: Compass, title: "Essentials only", body: "Rent, power, water, medicine, education and emergencies. The bills that keep life running." },
];

const ROADMAP = [
  { phase: "Now", title: "Prototype v1.0", body: "Interactive experience with fictional data and simulated contributions. Built to test the experience with investors, partners and early users." },
  { phase: "Next", title: "Verified pilot", body: "Real identity checks, document verification and biller partnerships in a limited pilot market." },
  { phase: "Later", title: "Direct-to-biller payments", body: "Licensed payment partners paying utilities, landlords, hospitals and schools directly." },
];

export default function MissionPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Our mission</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            No one should lose their home, power or health <span className="text-gradient">over a single bill.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-white/70">
            Millions of people are one unexpected bill away from a crisis. Millions more would gladly help — if helping were simple,
            personal and trustworthy. BillSwipe exists to connect the two.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="What we believe" title="Principles we build on" />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-3xl border bg-card p-6 shadow-soft">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <v.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Roadmap" title="Where we are — honestly" />
          <ol className="mt-14 grid gap-5">
            {ROADMAP.map((r, i) => (
              <li key={r.title}>
                <Reveal delay={i * 0.08}>
                  <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-soft sm:flex-row sm:items-center">
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.phase}
                    </span>
                    <div>
                      <h3 className="font-semibold tracking-tight">{r.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FinalCta title="Help us shape what comes next" description="Explore the prototype and tell us what would make you trust a platform like this." />
    </>
  );
}
