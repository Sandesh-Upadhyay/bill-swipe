"use client";

import { BadgeCheck, Clock, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { CategoryId, CountryCode, RequestStatus, VerificationState } from "@/lib/types";
import { CATEGORY_MAP, COUNTRY_MAP, STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/primitives";

const VERIFICATION_META: Record<
  VerificationState,
  { label: string; icon: typeof BadgeCheck; tone: string; help: string }
> = {
  demo_approved: {
    label: "Demo-approved",
    icon: BadgeCheck,
    tone: "bg-emerald-500/14 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    help: "Approved by a moderator inside this prototype. This is NOT an independent verification of the person or bill.",
  },
  pending: {
    label: "Review pending",
    icon: Clock,
    tone: "bg-amber-500/14 text-amber-800 ring-amber-500/25 dark:text-amber-300",
    help: "Waiting for moderator review in the demo. Treat with care.",
  },
  rejected: {
    label: "Rejected",
    icon: ShieldAlert,
    tone: "bg-red-500/12 text-red-700 ring-red-500/25 dark:text-red-300",
    help: "A demo moderator rejected this request.",
  },
  unverified: {
    label: "Unverified",
    icon: ShieldQuestion,
    tone: "bg-zinc-500/14 text-zinc-700 ring-zinc-500/25 dark:text-zinc-300",
    help: "No review has been completed for this request.",
  },
};

export function VerificationBadge({
  state,
  className,
  onDark,
}: {
  state: VerificationState;
  className?: string;
  onDark?: boolean;
}) {
  const m = VERIFICATION_META[state];
  const Icon = m.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            "inline-flex cursor-help items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 outline-none focus-visible:ring-2",
            onDark ? "bg-black/35 text-white ring-white/20 backdrop-blur" : m.tone,
            className,
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {m.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.help}</TooltipContent>
    </Tooltip>
  );
}

export function CategoryBadge({ category, className }: { category: CategoryId; className?: string }) {
  const c = CATEGORY_MAP[category];
  const Icon = c.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", c.tone, className)}>
      <Icon className="size-3.5" aria-hidden />
      {c.label}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const s = STATUS_META[status];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", s.tone, className)}>{s.label}</span>;
}

export function CountryLabel({ country, city, className }: { country: CountryCode; city?: string; className?: string }) {
  const c = COUNTRY_MAP[country];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden className="rounded-[4px] border border-current/25 px-1 font-mono text-[9px] font-semibold leading-[14px] tracking-wide">
        {c.code}
      </span>
      <span>{city ? `${city} · ${c.name}` : c.name}</span>
    </span>
  );
}

export function FictionalTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-dashed border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80",
        className,
      )}
    >
      Fictional demo
    </span>
  );
}
