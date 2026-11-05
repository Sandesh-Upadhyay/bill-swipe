"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { REPORT_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { FieldError, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";
import { useRequestsStore } from "@/store/requests-store";
import { useSavedStore } from "@/store/saved-store";

const reportSchema = z.object({
  reason: z.enum(["suspicious", "duplicate", "inappropriate", "misleading", "other"], { message: "Choose a reason" }),
  details: z.string().trim().min(10, "Please add at least 10 characters").max(500),
});
type ReportValues = z.infer<typeof reportSchema>;

export function ReportDialog({ request, open, onOpenChange }: { request: BillRequest; open: boolean; onOpenChange: (o: boolean) => void }) {
  const session = useAuthStore((s) => s.session);
  const report = useRequestsStore((s) => s.report);
  const form = useForm<ReportValues>({ resolver: zodResolver(reportSchema), defaultValues: { details: "" } });
  const reason = form.watch("reason");

  const onSubmit = (v: ReportValues) => {
    if (!session) {
      toast.info("Log in to a demo account to report requests.");
      return;
    }
    const res = report({ requestId: request.id, reporterId: session.userId, reason: v.reason, details: v.details });
    if (!res.ok) toast.error(res.error);
    else toast.success("Report sent to the demo moderation queue. Thank you.");
    form.reset({ details: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Report this request</DialogTitle>
            <DialogDescription>Reports are reviewed by moderators. The requester isn&apos;t told who reported them.</DialogDescription>
          </DialogHeader>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={reason === r.id}
                onClick={() => form.setValue("reason", r.id, { shouldValidate: true })}
                className={cn(
                  "rounded-xl border px-3.5 py-2.5 text-left text-sm transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  reason === r.id ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
            <FieldError message={form.formState.errors.reason?.message} />
          </fieldset>
          <div className="grid gap-2">
            <Label htmlFor="report-details">Details</Label>
            <Textarea id="report-details" placeholder="What made you concerned?" {...form.register("details")} />
            <FieldError message={form.formState.errors.details?.message} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              <Flag /> Submit report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "More" menu with Report and Block actions. */
export function SafetyMenu({
  request,
  onBlocked,
  className,
  onDark,
}: {
  request: BillRequest;
  onBlocked?: () => void;
  className?: string;
  onDark?: boolean;
}) {
  const session = useAuthStore((s) => s.session);
  const block = useSavedStore((s) => s.block);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);
  const isOwn = session?.userId === request.userId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={onDark ? "glass" : "outline"}
            size="icon-sm"
            aria-label="More actions: report or block"
            className={className}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled={isOwn} onSelect={() => setReportOpen(true)}>
            <Flag /> Report request
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            disabled={isOwn}
            onSelect={() => {
              if (!session) {
                toast.info("Log in to a demo account to block requesters.");
                return;
              }
              setBlockOpen(true);
            }}
          >
            <Ban /> Block {request.name}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog request={request} open={reportOpen} onOpenChange={setReportOpen} />
      <ConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title={`Block ${request.name}?`}
        description="You won't see requests from this person in Discover or Explore. You can unblock them from your profile."
        confirmLabel="Block"
        destructive
        onConfirm={() => {
          if (!session) return;
          block(session.userId, request.userId);
          toast.success(`${request.name} is blocked`);
          onBlocked?.();
        }}
      />
    </>
  );
}
