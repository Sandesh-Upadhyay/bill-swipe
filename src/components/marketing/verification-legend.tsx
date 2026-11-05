"use client";

import { VerificationBadge } from "@/components/requests/badges";
import type { VerificationState } from "@/lib/types";

const ITEMS: { state: VerificationState; text: string }[] = [
  { state: "demo_approved", text: "Approved by a moderator inside this prototype. It does not mean the person or bill was independently verified." },
  { state: "pending", text: "Submitted and waiting for moderator review. Edited requests return to this state." },
  { state: "unverified", text: "No review has been completed. Read carefully and use the report button if anything feels off." },
  { state: "rejected", text: "Rejected by a moderator and removed from discovery." },
];

export function VerificationLegend() {
  return (
    <ul className="grid gap-5">
      {ITEMS.map((i) => (
        <li key={i.state} className="grid gap-2 border-b pb-5 last:border-0 last:pb-0">
          <VerificationBadge state={i.state} />
          <p className="text-sm leading-relaxed text-muted-foreground">{i.text}</p>
        </li>
      ))}
    </ul>
  );
}
