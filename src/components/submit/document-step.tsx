"use client";

import * as React from "react";
import { FileText, ImageIcon, ShieldAlert, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Label } from "@/components/ui/primitives";
import { FieldError } from "@/components/ui/basic";
import { ACCEPTED_DOC_TYPES, MAX_DOC_MB } from "./schema";

export interface SelectedDocument {
  file: File;
  url: string;
}

/**
 * Client-side only document picker with preview.
 * The file never leaves the browser: it isn't uploaded, and it isn't written to LocalStorage.
 */
export function DocumentStep({
  doc,
  onChange,
  acknowledged,
  onAcknowledge,
  error,
  required,
}: {
  doc: SelectedDocument | null;
  onChange: (d: SelectedDocument | null) => void;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
  error?: string;
  required: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string>();
  const [dragOver, setDragOver] = React.useState(false);

  const accept = (file: File | undefined) => {
    setLocalError(undefined);
    if (!file) return;
    if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
      setLocalError("Only PNG, JPG, WEBP images or PDF files are supported.");
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setLocalError(`That file is larger than ${MAX_DOC_MB} MB.`);
      return;
    }
    if (doc) URL.revokeObjectURL(doc.url);
    onChange({ file, url: URL.createObjectURL(file) });
  };

  const remove = () => {
    if (doc) URL.revokeObjectURL(doc.url);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isPdf = doc?.file.type === "application/pdf";

  return (
    <div className="grid gap-5">
      {/* Privacy warning — shown BEFORE selection is possible */}
      <div role="note" className="grid gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="size-4" /> Privacy warning — please read first
        </p>
        <ul className="grid list-disc gap-1.5 pl-5 text-[13px] leading-relaxed">
          <li>This is a prototype. Your document is previewed only in this browser tab — it is never uploaded to a server or saved to storage.</li>
          <li>Please do not use a real bill. If you must, cover account numbers, addresses and other personal details first.</li>
          <li>In the live product, documents would be seen only by trained moderators and never appear on public pages or discovery cards.</li>
        </ul>
        <label className="flex items-start gap-2.5 pt-1 font-medium">
          <Checkbox checked={acknowledged} onCheckedChange={(v) => onAcknowledge(v === true)} aria-label="I understand the privacy warning" />
          <span>I understand. I&apos;ll only select a sample or redacted document.</span>
        </label>
      </div>

      {!doc ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (acknowledged) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (acknowledged) accept(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "grid place-items-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition",
            acknowledged ? "bg-card" : "opacity-50",
            dragOver && "border-primary bg-primary/5",
          )}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="size-6" />
          </span>
          <div>
            <p className="font-medium">Drag a file here, or choose one</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or PDF · up to {MAX_DOC_MB} MB</p>
          </div>
          <Label htmlFor="bill-doc" className="sr-only">
            Bill document
          </Label>
          <input
            ref={inputRef}
            id="bill-doc"
            type="file"
            accept={ACCEPTED_DOC_TYPES.join(",")}
            className="sr-only"
            disabled={!acknowledged}
            onChange={(e) => accept(e.target.files?.[0])}
          />
          <Button type="button" variant="outline" disabled={!acknowledged} onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          {!acknowledged && <p className="text-xs text-muted-foreground">Confirm the privacy warning above to enable file selection.</p>}
          {!required && <p className="text-xs text-muted-foreground">Optional in the current demo settings.</p>}
        </div>
      ) : (
        <div className="grid gap-3 rounded-3xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {isPdf ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{doc.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(doc.file.size / 1024).toFixed(0)} KB · local preview only, not uploaded
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={remove}>
              <Trash2 /> Remove
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-muted/40">
            {isPdf ? (
              <object data={doc.url} type="application/pdf" className="h-96 w-full" aria-label="PDF preview">
                <p className="p-6 text-sm text-muted-foreground">PDF preview isn&apos;t supported in this browser, but the file is selected.</p>
              </object>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.url} alt="Selected bill document preview" className="max-h-96 w-full object-contain" />
            )}
          </div>
        </div>
      )}
      <FieldError message={localError ?? error} />
    </div>
  );
}
