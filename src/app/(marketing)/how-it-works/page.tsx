import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Bookmark,
  ClipboardCheck,
  FileUp,
  HandHeart,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/marketing/reveal";
import { FinalCta } from "@/components/marketing/final-cta";
import { VerificationLegend } from "@/components/marketing/verification-legend";

export const metadata: Metadata = { title: "How it works" };

const REQUESTER_STEPS = [
  { icon: FileUp, title: "Create your request", body: "Seven guided steps: your details, bill category, amount and currency, due date, your story and the bill document." },
  { icon: ShieldCheck, title: "Private document review", body: "Your bill document is only for moderators. It never appears on your public card. In this prototype it never even leaves your browser." },
  { icon: BadgeCheck, title: "Moderator decision", body: "Moderators approve, reject or ask for more information. You'll see the status on your dashboard." },
  { icon: LayoutDashboard, title: "Track progress", body: "Follow simulated progress, edit details (which sends the request back for review) or withdraw at any time." },
];

const DONOR_STEPS = [
  { icon: Sparkles, title: "Discover", body: "Swipe through requests filtered by category and country, each in its local currency." },
  { icon: Bookmark, title: "Save & shortlist", body: "Swipe right or tap save to build a shortlist. Nothing is charged — interest is just interest." },
  { icon: MessageSquareText, title: "Read the full story", body: "Swipe up for the full story, due date, supporter count and review status." },
  { icon: HandHeart, title: "Help when ready", body: "Choose an amount or make a commitment for later. In the prototype every contribution is simulated." },
];

const GESTURES = [
  { icon: ArrowRight, label: "Swipe right", body: "I'm interested in helping. Adds it to your interested list — never a payment.", tone: "bg-primary text-primary-foreground" },
  { icon: ArrowLeft, label: "Swipe left", body: "Skip for now. You can undo your last swipe at any time.", tone: "bg-muted text-foreground" },
  { icon: ArrowUp, label: "Swipe up", body: "Open the full request details and story.", tone: "bg-accent text-accent-foreground" },
];

function StepList({ steps }: { steps: typeof REQUESTER_STEPS }) {
  return (
    <div className="grid gap-4">
      {steps.map((s, i) => (
        <Reveal key={s.title} delay={i * 0.06}>
          <div className="flex gap-4 rounded-3xl border bg-card p-5 shadow-soft">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="font-mono text-xs text-muted-foreground">Step {i + 1}</p>
              <h3 className="mt-0.5 font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-hero text-white">
        <div className="absolute inset-0 -z-10 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" aria-hidden />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">How it works</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Simple for people asking. <span className="text-gradient">Clear for people helping.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-white/70">
            BillSwipe pairs a dignified way to share an essential bill with a fast, transparent way to discover who needs help.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <SectionHeading align="left" eyebrow="For requesters" title="Share a bill with dignity" />
          <div className="mt-8">
            <StepList steps={REQUESTER_STEPS} />
          </div>
        </div>
        <div>
          <SectionHeading align="left" eyebrow="For donors" title="Help with confidence" />
          <div className="mt-8">
            <StepList steps={DONOR_STEPS} />
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Gestures" title="Three gestures. That's it." description="Prefer buttons? Every gesture also has an accessible button and keyboard shortcut." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {GESTURES.map((g, i) => (
              <Reveal key={g.label} delay={i * 0.07}>
                <div className="h-full rounded-3xl border bg-card p-7 text-center shadow-soft">
                  <span className={`mx-auto grid size-16 place-items-center rounded-full ${g.tone}`}>
                    <g.icon className="size-7" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{g.label}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{g.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-start gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Verification"
          title="Honest about what we've checked"
          description="In the live product, verification will include document checks and direct payment to billers wherever possible. In this prototype, moderation is simulated — so we say so on every badge."
        />
        <Reveal>
          <div className="rounded-3xl border bg-card p-7 shadow-soft">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium">
              <ClipboardCheck className="size-4 text-primary" /> Badge legend
            </div>
            <VerificationLegend />
          </div>
        </Reveal>
      </section>

      <FinalCta />
    </>
  );
}
