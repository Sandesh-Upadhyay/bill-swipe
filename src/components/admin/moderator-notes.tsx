"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lock, StickyNote } from "lucide-react";
import type { BillRequest, ModeratorNote } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FieldError, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useAdminStore } from "@/store/admin-store";
import { formatAuditTime } from "@/lib/admin/audit";
import { useModeratorName } from "./use-review";

const EMPTY: ModeratorNote[] = [];
const MIN_CHARS = 3;
const MAX_CHARS = 1000;

/** Internal moderator notes for a request. Never shown to donors or requesters; every addition is audit-logged. */
export function ModeratorNotes({ request }: { request: BillRequest }) {
  const stored = useAdminStore((s) => s.moderatorNotes[request.id]);
  const notes = Array.isArray(stored) ? stored : EMPTY;
  const addNote = useAdminStore((s) => s.addModeratorNote);
  const author = useModeratorName();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  const inputId = `note-${request.id}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < MIN_CHARS) {
      setError(`Write at least ${MIN_CHARS} characters.`);
      return;
    }
    const res = addNote(request.id, text, author, { title: request.title, userId: request.userId });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setText("");
    setError(undefined);
    toast.success("Internal note added", { description: "Visible to moderators only." });
  };

  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Internal to the moderation team — never shown to donors or requesters. Use “Request info” to message the requester instead.
      </p>

      <form onSubmit={submit} noValidate className="grid gap-2">
        <Label htmlFor={inputId}>Add an internal note</Label>
        <Textarea
          id={inputId}
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(undefined);
          }}
          placeholder="e.g. Amount matches the line items; asked for a clearer due date."
          aria-invalid={!!error}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className="min-h-20"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={hintId} className="text-xs text-muted-foreground">
            {text.trim().length}/{MAX_CHARS} · at least {MIN_CHARS} characters
          </span>
          <Button type="submit" size="sm">
            <StickyNote /> Add note
          </Button>
        </div>
        <FieldError id={errorId} message={error} />
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
      ) : (
        <ul className="grid gap-2" aria-label="Internal notes, newest first">
          {notes.map((n) => (
            <li key={n.id} className="grid gap-1 rounded-2xl border p-3">
              <p className="whitespace-pre-line text-sm wrap-anywhere">{n.text}</p>
              <p className="text-xs text-muted-foreground">
                {n.author} · <time dateTime={n.createdAt}>{formatAuditTime(n.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
