import Link from "next/link";
import { ArrowRight, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function FinalCta({
  title = "Ready to make your first swipe?",
  description = "Try the full prototype in under a minute with a one-click demo account. No card, no payment, no real money.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-hero px-6 py-16 text-center text-white shadow-lift sm:px-12">
          <div className="absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" aria-hidden />
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">{description}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="mint">
              <Link href="/discover">
                Start swiping <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link href="/submit">
                <FileUp /> Share a bill
              </Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
