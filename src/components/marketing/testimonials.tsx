import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/data/content";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { FictionalTag } from "@/components/requests/badges";
import { Reveal, SectionHeading } from "./reveal";

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8" aria-labelledby="voices-heading">
      <SectionHeading
        eyebrow="Voices"
        title={<span id="voices-heading">How it could feel</span>}
        description="Illustrative testimonials written for this prototype. These people are fictional."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08}>
            <figure className="flex h-full flex-col rounded-3xl border bg-card p-7 shadow-soft">
              <Quote className="size-7 text-primary/50" aria-hidden />
              <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <DemoAvatar seed={t.image} label={`Fictional illustration of ${t.name}`} className="size-11" />
                <div className="grid gap-0.5">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.role}</span>
                </div>
                <FictionalTag className="ml-auto text-muted-foreground" />
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
