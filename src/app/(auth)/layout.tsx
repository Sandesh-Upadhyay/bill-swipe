import { BadgeCheck, EyeOff, FlaskConical, HandHeart } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { DemoBanner } from "@/components/layout/demo-banner";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TAGLINE } from "@/lib/constants";

const POINTS = [
  { icon: HandHeart, text: "Swipe right to show interest — never a payment." },
  { icon: EyeOff, text: "Bill documents are never shown publicly." },
  { icon: BadgeCheck, text: "Clear review badges on every request." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <DemoBanner />
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <aside className="relative isolate hidden overflow-hidden bg-hero p-10 text-white lg:flex lg:flex-col">
          <div className="absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]" aria-hidden />
          <Logo light />
          <div className="my-auto max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">{TAGLINE}</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-balance">
              Kindness, made <span className="text-gradient">simple and transparent.</span>
            </h2>
            <ul className="mt-8 grid gap-4">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-white/80">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-mint">
                    <p.icon className="size-4" />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-3">
                {["u_d_hannah", "u_r_amelia", "u_d_arjun", "u_r_marisol"].map((s) => (
                  <DemoAvatar key={s} seed={s} className="size-10 ring-2 ring-[oklch(0.17_0.03_168)]" label="Fictional profile illustration" />
                ))}
              </div>
              <p className="text-sm text-white/60">Fictional community members, for demonstration.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-mint" />
            <p>
              <strong className="text-white">Demo authentication.</strong> Sessions are stored only in this browser. No real accounts,
              passwords or payment details are created or checked.
            </p>
          </div>
        </aside>
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6">
            <div className="lg:invisible">
              <Logo />
            </div>
            <ThemeToggle />
          </div>
          <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-6">
            <div className="w-full max-w-md">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
