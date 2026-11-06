import Link from "next/link";
import { ClipboardCheck, FilePlus2, HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly illustration for empty requester states: a bill card with a heart and progress bar. */
export function BillIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden role="presentation">
      <defs>
        <linearGradient id="rw-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="92" r="78" fill="url(#rw-bg)" />
      <g transform="rotate(-6 120 92)">
        <rect x="64" y="34" width="112" height="124" rx="16" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
        <rect x="80" y="54" width="52" height="8" rx="4" fill="var(--primary)" opacity="0.85" />
        <rect x="80" y="72" width="80" height="6" rx="3" fill="var(--muted-foreground)" opacity="0.25" />
        <rect x="80" y="86" width="64" height="6" rx="3" fill="var(--muted-foreground)" opacity="0.25" />
        <rect x="80" y="100" width="72" height="6" rx="3" fill="var(--muted-foreground)" opacity="0.25" />
        <rect x="80" y="124" width="80" height="10" rx="5" fill="var(--muted)" />
        <rect x="80" y="124" width="46" height="10" rx="5" fill="var(--primary)" />
      </g>
      <g transform="translate(160 26)">
        <circle cx="22" cy="22" r="22" fill="var(--primary)" />
        <path
          d="M22 32s-10-6.2-10-13a5.6 5.6 0 0 1 10-3.4A5.6 5.6 0 0 1 32 19c0 6.8-10 13-10 13z"
          fill="var(--primary-foreground)"
        />
      </g>
      <circle cx="52" cy="54" r="5" fill="var(--primary)" opacity="0.4" />
      <circle cx="196" cy="138" r="7" fill="var(--primary)" opacity="0.25" />
      <circle cx="40" cy="132" r="3" fill="var(--primary)" opacity="0.5" />
    </svg>
  );
}

const STEPS = [
  { icon: FilePlus2, title: "Share your bill", body: "Seven short steps: the amount, due date and your story. About five minutes." },
  { icon: ClipboardCheck, title: "A moderator reviews it", body: "In the demo, a moderator approves it or asks for more details." },
  { icon: Sparkles, title: "Donors discover it", body: "Approved requests appear in Discover, where donors swipe to show interest." },
  { icon: HandHeart, title: "Track simulated support", body: "Watch progress, supporters and activity here. No real money moves." },
];

/** First-time requester experience shown instead of empty stats, charts and lists. */
export function RequesterWelcome({ name }: { name: string }) {
  return (
    <section aria-labelledby="welcome-heading" className="grid gap-8 overflow-hidden rounded-3xl border bg-card p-6 shadow-soft sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
      <div className="grid justify-items-start gap-4">
        <BillIllustration className="w-44 sm:w-56" />
        <h2 id="welcome-heading" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Welcome, {name}. Let&apos;s share your first bill.
        </h2>
        <p className="max-w-md text-muted-foreground">
          Tell donors what the bill is for and why it matters. Your bill document stays private, and every amount in this prototype is simulated.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href="/submit">
              <FilePlus2 /> Submit your first bill
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/how-it-works">How it works</Link>
          </Button>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" /> Documents never leave your browser in this demo.
        </p>
      </div>
      <ol className="grid gap-3" aria-label="What happens next">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4 rounded-2xl border bg-muted/30 p-4 transition hover:border-primary/30 hover:bg-primary/5">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
              <s.icon className="size-5" />
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </span>
            <span className="grid gap-0.5">
              <span className="font-medium">{s.title}</span>
              <span className="text-sm text-muted-foreground">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Per-tab empty-state copy, so an empty tab explains what would appear there and what to do. */
export const TAB_EMPTY: Record<string, { title: string; description: string }> = {
  active: {
    title: "No live requests right now",
    description: "Requests go live in Discover once a moderator approves them. Check the Pending review tab for anything waiting.",
  },
  pending: {
    title: "Nothing waiting for review",
    description: "New and edited requests appear here while a demo moderator reviews them, along with any requests that need more information from you.",
  },
  completed: {
    title: "No completed requests yet",
    description: "When simulated support reaches a request's goal, it moves here. No real money is ever collected.",
  },
  closed: {
    title: "No withdrawn or rejected requests",
    description: "Requests you withdraw, or that a moderator doesn't approve, are kept here for your records.",
  },
};
