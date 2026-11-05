"use client";

import * as React from "react";
import { toast } from "sonner";
import { BadgeCheck, Flag, FlagOff, MessageSquareMore, XCircle } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlays";
import { FieldError, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useRequestsStore } from "@/store/requests-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useAdminStore } from "@/store/admin-store";
import { cn } from "@/lib/utils";

type NoteAction = "reject" | "info";

/** Returns the moderation handlers for a request (approve / reject / needs info / flag). */
export function useModeration() {
  const setStatus = useRequestsStore((s) => s.setStatus);
  const setVerification = useRequestsStore((s) => s.setVerification);
  const toggleFlag = useRequestsStore((s) => s.toggleFlag);
  const push = useNotificationsStore((s) => s.push);
  const log = useAdminStore((s) => s.logModeration);

  return React.useMemo(
    () => ({
      approve: (r: BillRequest) => {
        setStatus(r.id, "active");
        setVerification(r.id, "demo_approved");
        log({ kind: "approved", requestId: r.id, userId: r.userId, text: `Demo-approved “${r.title}” by ${r.name}` });
        push(r.userId, {
          title: "Your request is live (demo)",
          body: `“${r.title}” was demo-approved and is now visible in Discover.`,
          href: `/requests/${r.id}`,
          tone: "success",
        });
        toast.success(`Demo-approved “${r.title}”`, { description: "Prototype state only — not an independent verification." });
      },
      reject: (r: BillRequest, note: string) => {
        setStatus(r.id, "rejected", note);
        setVerification(r.id, "rejected");
        log({ kind: "rejected", requestId: r.id, userId: r.userId, text: `Rejected “${r.title}”. Reason: ${note}` });
        push(r.userId, { title: "Request not approved (demo)", body: `“${r.title}”: ${note}`, href: `/requests/${r.id}`, tone: "warning" });
        toast.success(`Rejected “${r.title}”`);
      },
      requestInfo: (r: BillRequest, note: string) => {
        setStatus(r.id, "needs_info", note);
        setVerification(r.id, "pending");
        log({ kind: "info", requestId: r.id, userId: r.userId, text: `Asked for more information on “${r.title}”: ${note}` });
        push(r.userId, { title: "More information requested", body: `“${r.title}”: ${note}`, href: "/dashboard/requester", tone: "warning" });
        toast.success("Requested more information from the requester");
      },
      flag: (r: BillRequest) => {
        toggleFlag(r.id);
        log({ kind: "flag", requestId: r.id, userId: r.userId, text: `${r.flagged ? "Removed the flag from" : "Flagged"} “${r.title}”` });
        toast.success(r.flagged ? `Removed flag from “${r.title}”` : `Flagged “${r.title}” — hidden from Discover`);
      },
    }),
    [setStatus, setVerification, toggleFlag, push, log],
  );
}

function NoteDialog({
  open,
  onOpenChange,
  action,
  request,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  action: NoteAction;
  request: BillRequest;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (open) {
      setNote(action === "info" ? "Please add a recent bill or invoice showing the amount due." : "");
      setError(undefined);
    }
  }, [open, action]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim().length < 8) {
      setError("Please write a note of at least 8 characters for the requester.");
      return;
    }
    onSubmit(note.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{action === "reject" ? "Reject request" : "Request more information"}</DialogTitle>
            <DialogDescription>
              “{request.title}” by {request.name}. The note is shared with the requester (demo notification).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="mod-note">{action === "reject" ? "Reason for rejection" : "What do you need?"}</Label>
            <Textarea id="mod-note" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!error} />
            <FieldError message={error} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={action === "reject" ? "destructive" : "default"}>
              {action === "reject" ? "Reject request" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Button group with confirmation dialogs for each moderation action. */
export function ModerationActions({
  request,
  size = "sm",
  className,
  showFlag = true,
}: {
  request: BillRequest;
  size?: "sm" | "default";
  className?: string;
  showFlag?: boolean;
}) {
  const mod = useModeration();
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [flagOpen, setFlagOpen] = React.useState(false);
  const [noteAction, setNoteAction] = React.useState<NoteAction | null>(null);
  const closed = request.status === "withdrawn" || request.status === "completed";
  const isApproved = request.status === "active" && request.verification === "demo_approved";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button size={size} disabled={closed || isApproved} onClick={() => setApproveOpen(true)}>
        <BadgeCheck /> Demo-approve
      </Button>
      <Button size={size} variant="outline" disabled={closed} onClick={() => setNoteAction("info")}>
        <MessageSquareMore /> Request info
      </Button>
      <Button
        size={size}
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={closed || request.status === "rejected"}
        onClick={() => setNoteAction("reject")}
      >
        <XCircle /> Reject
      </Button>
      {showFlag && (
        <Button size={size} variant="ghost" onClick={() => setFlagOpen(true)}>
          {request.flagged ? <FlagOff /> : <Flag />} {request.flagged ? "Unflag" : "Flag"}
        </Button>
      )}

      <ConfirmDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Demo-approve this request?"
        description={
          <>
            “{request.title}” will become <strong>Active</strong> with a <strong>Demo-approved</strong> badge and appear in Discover. This is a
            prototype moderation state — it does not mean the person or bill has been independently verified.
          </>
        }
        confirmLabel="Demo-approve"
        onConfirm={() => mod.approve(request)}
      />
      <ConfirmDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        title={request.flagged ? "Remove flag?" : "Flag this request?"}
        description={
          request.flagged
            ? "The request will be eligible to appear in Discover again if it is active."
            : "Flagged requests are hidden from Discover and Explore until the flag is removed."
        }
        confirmLabel={request.flagged ? "Unflag" : "Flag request"}
        destructive={!request.flagged}
        onConfirm={() => mod.flag(request)}
      />
      {noteAction && (
        <NoteDialog
          open={!!noteAction}
          onOpenChange={(o) => !o && setNoteAction(null)}
          action={noteAction}
          request={request}
          onSubmit={(note) => (noteAction === "reject" ? mod.reject(request, note) : mod.requestInfo(request, note))}
        />
      )}
    </div>
  );
}
