import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id="bs-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.86 0.12 165)" />
          <stop offset="1" stopColor="oklch(0.6 0.14 160)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="oklch(0.22 0.045 165)" />
      <rect x="9" y="7" width="13" height="18" rx="3.5" fill="url(#bs-mark)" opacity="0.35" transform="rotate(-12 15 16)" />
      <rect x="11" y="7" width="13" height="18" rx="3.5" fill="url(#bs-mark)" transform="rotate(8 17 16)" />
      <path d="M14.5 17.2l2.2 2.2 4.3-5" fill="none" stroke="oklch(0.2 0.05 165)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(8 17 16)" />
    </svg>
  );
}

export function Logo({ className, href = "/", light }: { className?: string; href?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)} aria-label="BillSwipe home">
      <LogoMark className="transition-transform group-hover:-rotate-6" />
      <span className={cn("text-lg font-semibold tracking-tight", light && "text-white")}>
        Bill<span className="text-primary">Swipe</span>
      </span>
    </Link>
  );
}
