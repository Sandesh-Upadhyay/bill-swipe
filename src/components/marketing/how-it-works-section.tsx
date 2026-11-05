import { BadgeCheck, FileText, HandHeart, Sparkles } from "lucide-react";
import { HOW_IT_WORKS } from "@/lib/data/content";
import { Reveal, SectionHeading } from "./reveal";

const ICONS = [FileText, BadgeCheck, Sparkles, HandHeart];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8" aria-labelledby="how-heading">
      <SectionHeading
        eyebrow="How it works"
        title={<span id="how-heading">Four steps from a bill to a helping hand</span>}
        description="Designed for dignity on one side and confidence on the other. Simple enough to use in a coffee break."
      />
      <div className="relative mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" aria-hidden />
        {HOW_IT_WORKS.map((s, i) => {
          const Icon = ICONS[i];
          return (
            <Reveal key={s.title} delay={i * 0.08}>
              <article className="relative h-full rounded-3xl border bg-card p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
