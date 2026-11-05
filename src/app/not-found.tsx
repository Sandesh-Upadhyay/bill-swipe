import Link from "next/link";
import { Compass, Home, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-hero px-4 text-center text-white">
      <div className="absolute inset-0 -z-10 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" aria-hidden />
      <Logo light className="absolute left-6 top-6" />
      <p className="text-8xl font-semibold tracking-tighter text-gradient sm:text-9xl">404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">This page swiped left.</h1>
      <p className="mt-3 max-w-md text-white/70">
        The page you&apos;re looking for doesn&apos;t exist, was moved, or belongs to a demo request that has been removed.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button asChild variant="mint" size="lg">
          <Link href="/">
            <Home /> Back home
          </Link>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href="/discover">
            <Sparkles /> Discover requests
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="text-white/80 hover:bg-white/10 hover:text-white">
          <Link href="/explore">
            <Compass /> Explore
          </Link>
        </Button>
      </div>
    </main>
  );
}
