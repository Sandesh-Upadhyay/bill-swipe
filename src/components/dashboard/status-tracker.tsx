import { Check, CircleAlert, Undo2, X } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type StepState = "done" | "current" | "attention" | "failed" | "upcoming";

interface Step {
  label: string;
  state: StepState;
  note?: string;
}

/** Derives the four-stage progress of a request from its status. */
function stepsFor(r: BillRequest): Step[] {
  const submitted: Step = { label: "Submitted", state: "done", note: formatDate(r.createdAt, { day: "numeric", month: "short" }) };
  switch (r.status) {
    case "pending_review":
      return [submitted, { label: "In review", state: "current", note: "With a demo moderator" }, { label: "Live", state: "upcoming" }, { label: "Goal reached", state: "upcoming" }];
    case "needs_info":
      return [submitted, { label: "In review", state: "attention", note: "More info requested" }, { label: "Live", state: "upcoming" }, { label: "Goal reached", state: "upcoming" }];
    case "rejected":
      return [submitted, { label: "Not approved", state: "failed", note: "See moderator note" }, { label: "Live", state: "upcoming" }, { label: "Goal reached", state: "upcoming" }];
    case "active":
      return [submitted, { label: "Approved", state: "done" }, { label: "Live", state: "current", note: "Visible in Discover" }, { label: "Goal reached", state: "upcoming" }];
    case "completed":
      return [submitted, { label: "Approved", state: "done" }, { label: "Live", state: "done" }, { label: "Goal reached", state: "done", note: "Simulated" }];
    case "withdrawn":
      return [submitted, { label: "Reviewed", state: "done" }, { label: "Withdrawn", state: "failed", note: "Hidden from donors" }, { label: "Goal reached", state: "upcoming" }];
  }
}

const DOT: Record<StepState, string> = {
  done: "bg-primary text-primary-foreground border-primary",
  current: "bg-card text-primary border-primary ring-4 ring-primary/15",
  attention: "bg-amber-500 text-white border-amber-500 ring-4 ring-amber-500/20",
  failed: "bg-muted text-muted-foreground border-muted-foreground/40",
  upcoming: "bg-card text-muted-foreground border-border",
};

/** Compact horizontal stepper showing where a request is in the review → live → funded journey. */
export function StatusTracker({ request, className }: { request: BillRequest; className?: string }) {
  const steps = stepsFor(request);
  const current = steps.findIndex((s) => s.state === "current" || s.state === "attention" || s.state === "failed");
  return (
    <ol className={cn("grid grid-cols-4 gap-1", className)} aria-label="Request progress">
      {steps.map((s, i) => {
        const Icon = s.state === "attention" ? CircleAlert : s.state === "failed" ? (request.status === "withdrawn" ? Undo2 : X) : Check;
        const lineDone = i < steps.length - 1 && steps[i + 1].state !== "upcoming";
        return (
          <li key={s.label} className="relative grid justify-items-center gap-1.5 text-center" aria-current={i === current ? "step" : undefined}>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-[11px] h-0.5 rounded-full", lineDone ? "bg-primary" : "bg-border")}
              />
            )}
            <span className={cn("relative z-10 grid size-6 place-items-center rounded-full border-2", DOT[s.state])}>
              {s.state === "upcoming" ? (
                <span className="size-1.5 rounded-full bg-current opacity-50" />
              ) : s.state === "current" ? (
                <span className="size-2 rounded-full bg-current motion-safe:animate-pulse" />
              ) : (
                <Icon className="size-3.5" strokeWidth={3} />
              )}
            </span>
            <span className={cn("text-[11px] font-medium leading-tight", s.state === "upcoming" && "text-muted-foreground")}>{s.label}</span>
            {s.note && <span className="hidden text-[10px] leading-tight text-muted-foreground sm:block">{s.note}</span>}
            <span className="sr-only">
              {s.state === "done" ? "completed" : s.state === "upcoming" ? "not started" : s.state === "current" ? "in progress" : s.state === "attention" ? "needs your attention" : "stopped"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
