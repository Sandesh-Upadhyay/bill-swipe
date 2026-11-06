"use client";

import * as React from "react";
import {
  EyeOff,
  ExternalLink,
  FileText,
  HardDrive,
  ImageIcon,
  Info,
  Lightbulb,
  Replace,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox, Label } from "@/components/ui/primitives";
import { FieldError } from "@/components/ui/basic";
import { ACCEPTED_DOC_TYPES, MAX_DOC_MB } from "./schema";

export interface SelectedDocument {
  file: File;
  url: string;
}

/** File metadata only: what a draft or a submitted request may keep. */
export interface DocumentMeta {
  name: string;
  type: string;
  size: number;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function docKindLabel(type: string) {
  switch (type) {
    case "application/pdf":
      return "PDF document";
    case "image/png":
      return "PNG image";
    case "image/jpeg":
      return "JPG image";
    case "image/webp":
      return "WEBP image";
    default:
      return type || "Unknown type";
  }
}

function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toUpperCase() : "";
}

/** Returns a friendly validation message for an unacceptable file, otherwise null. */
function validateFile(file: File) {
  if (!ACCEPTED_DOC_TYPES.includes(file.type)) {
    const kind = extensionOf(file.name) || file.type || "unknown";
    return `“${file.name}” is a ${kind} file. Choose a PNG, JPG or WEBP image, or a PDF.`;
  }
  if (file.size === 0) return `“${file.name}” is empty. Choose another file.`;
  if (file.size > MAX_DOC_MB * 1024 * 1024) {
    return `“${file.name}” is ${formatBytes(file.size)}, over the ${MAX_DOC_MB} MB limit. Try a compressed image or a smaller PDF.`;
  }
  return null;
}

function canInlinePdf() {
  if (typeof navigator === "undefined") return true;
  // `pdfViewerEnabled` is false on most mobile browsers, which can't render PDFs inside a page.
  return (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
}

/**
 * Client-side only document picker with preview.
 * The file never leaves the browser: it isn't uploaded, and it isn't written to LocalStorage.
 * Object URLs are revoked on replace and remove here, and on unmount by the wizard (which owns `doc`).
 */
export function DocumentStep({
  doc,
  onChange,
  acknowledged,
  onAcknowledge,
  error,
  required,
  rememberedDoc,
}: {
  doc: SelectedDocument | null;
  onChange: (d: SelectedDocument | null) => void;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
  error?: string;
  required: boolean;
  /** Metadata of a document chosen before the draft was saved. The file itself was never kept. */
  rememberedDoc?: DocumentMeta;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = React.useState<string>();
  const [dragOver, setDragOver] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const [pdfInline] = React.useState(canInlinePdf);

  const accept = (files: FileList | null | undefined) => {
    setLocalError(undefined);
    const file = files?.[0];
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setLocalError(problem);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (doc) URL.revokeObjectURL(doc.url);
    setZoomed(false);
    setPreviewFailed(false);
    onChange({ file, url: URL.createObjectURL(file) });
    if (files.length > 1) setLocalError(`Only one file can be used. We picked “${file.name}”.`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = () => {
    if (doc) URL.revokeObjectURL(doc.url);
    onChange(null);
    setZoomed(false);
    setPreviewFailed(false);
    setLocalError(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isPdf = doc?.file.type === "application/pdf";
  const message = localError ?? error;

  return (
    <div className="grid gap-5">
      {/* What happens to the file — shown BEFORE selection is possible */}
      <section
        aria-labelledby="doc-privacy-title"
        className="grid gap-3 rounded-2xl border border-primary/25 bg-primary/6 p-4 text-sm sm:p-5"
      >
        <h3 id="doc-privacy-title" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-4 shrink-0 text-primary" /> What happens to your document
        </h3>
        <ul className="grid gap-2.5 text-[13px] leading-relaxed">
          <li className="flex gap-2.5">
            <HardDrive className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-medium">It stays in this browser.</strong> The preview uses a temporary local link that&apos;s discarded when
              you leave the page.
            </span>
          </li>
          <li className="flex gap-2.5">
            <UploadCloud className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-medium">It&apos;s never uploaded or saved</strong> — not to a server, not to storage, not in your saved draft.
            </span>
          </li>
          <li className="flex gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-medium">Only its name, type and size are kept</strong> with your demo request.
            </span>
          </li>
          <li className="flex gap-2.5">
            <UserCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-medium">In a real product, only trained moderators would see it</strong> to check the bill.
            </span>
          </li>
          <li className="flex gap-2.5">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <strong className="font-medium">It&apos;s never shown on public pages</strong>, swipe cards or to donors.
            </span>
          </li>
        </ul>
      </section>

      <div role="note" className="grid gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="size-4 shrink-0" /> Please read before choosing a file
        </p>
        <p className="text-[13px] leading-relaxed">
          This is a prototype, so please use a sample bill. If you must use a real one, cover personal details first.
        </p>
        <p className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-[13px] leading-relaxed">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-medium">Tip:</strong> redact account and customer numbers, your address, barcodes and QR codes. Keep the amount
            and due date visible.
          </span>
        </p>
        <label htmlFor="doc-ack" className="flex items-start gap-2.5 pt-1 font-medium">
          <Checkbox id="doc-ack" checked={acknowledged} onCheckedChange={(v) => onAcknowledge(v === true)} />
          <span>I understand. I&apos;ll only select a sample or redacted document.</span>
        </label>
      </div>

      {rememberedDoc && !doc && (
        <p className="flex gap-2 rounded-2xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">
            Your draft remembers <strong className="font-medium text-foreground">{rememberedDoc.name}</strong> (
            {formatBytes(rememberedDoc.size)}). Files are never stored, so please select it again.
          </span>
        </p>
      )}

      <Label htmlFor="bill-doc" className="sr-only">
        Bill document
      </Label>
      <input
        ref={inputRef}
        id="bill-doc"
        type="file"
        accept={ACCEPTED_DOC_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        disabled={!acknowledged}
        aria-describedby={message ? "bill-doc-error" : undefined}
        onChange={(e) => accept(e.target.files)}
      />

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
            if (acknowledged) accept(e.dataTransfer.files);
            else setLocalError("Tick the acknowledgement above before choosing a file.");
          }}
          className={cn(
            "grid place-items-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition sm:p-10",
            acknowledged ? "bg-card" : "opacity-60",
            dragOver && "border-primary bg-primary/5",
            message && "border-destructive/50",
          )}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="size-6" />
          </span>
          <div>
            <p className="font-medium">Drag a file here, or choose one</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or PDF · up to {MAX_DOC_MB} MB</p>
          </div>
          <Button
            id="bill-doc-choose"
            type="button"
            variant="outline"
            disabled={!acknowledged}
            aria-describedby={message ? "bill-doc-error" : undefined}
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
          {!acknowledged && <p className="text-xs text-muted-foreground">Confirm the notice above to enable file selection.</p>}
          <p className="text-xs text-muted-foreground">{required ? "Required in the current demo settings." : "Optional in the current demo settings."}</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 rounded-3xl border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {isPdf ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={doc.file.name}>
                  {doc.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {docKindLabel(doc.file.type)} · {formatBytes(doc.file.size)} · local preview only
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                id="bill-doc-choose"
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={!acknowledged}
                aria-label={`Replace ${doc.file.name}`}
              >
                <Replace /> Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={remove} aria-label={`Remove ${doc.file.name}`}>
                <Trash2 /> Remove
              </Button>
            </div>
          </div>

          {isPdf ? (
            pdfInline && !previewFailed ? (
              <div className="grid gap-2">
                <div className="overflow-hidden rounded-2xl border bg-muted/40">
                  <object data={doc.url} type="application/pdf" className="h-80 w-full sm:h-[28rem]" aria-label={`Preview of ${doc.file.name}`}>
                    <DocFallbackCard file={doc.file} />
                  </object>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 justify-self-start text-xs text-primary underline-offset-2 hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Open preview in a new tab (still only on this device)
                </a>
              </div>
            ) : (
              <DocFallbackCard file={doc.file} />
            )
          ) : previewFailed ? (
            <DocFallbackCard file={doc.file} />
          ) : (
            <div className="grid gap-2">
              <div
                role="region"
                aria-label={zoomed ? "Zoomed document preview. Scroll to pan." : "Document preview"}
                tabIndex={zoomed ? 0 : undefined}
                className={cn(
                  "rounded-2xl border bg-muted/40 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  zoomed ? "h-80 overflow-auto sm:h-[28rem]" : "grid h-72 place-items-center overflow-hidden p-2 sm:h-96",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={`Preview of ${doc.file.name}`}
                  onError={() => setPreviewFailed(true)}
                  onClick={() => setZoomed((z) => !z)}
                  className={cn(zoomed ? "h-auto w-[200%] max-w-none cursor-zoom-out" : "h-full w-full cursor-zoom-in object-contain")}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" className="justify-self-start" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)}>
                {zoomed ? <ZoomOut /> : <ZoomIn />} {zoomed ? "Fit to frame" : "Zoom in"}
              </Button>
            </div>
          )}
        </div>
      )}
      <FieldError message={message} id="bill-doc-error" />
    </div>
  );
}

/** Shown when the browser can't render the file inline. The file is still selected. */
function DocFallbackCard({ file }: { file: File }) {
  const isPdf = file.type === "application/pdf";
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        {isPdf ? <FileText className="size-6" /> : <ImageIcon className="size-6" />}
      </span>
      <div className="grid min-w-0 max-w-full gap-1">
        <p className="break-words text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {docKindLabel(file.type)} · {formatBytes(file.size)}
        </p>
      </div>
      <p className="max-w-sm text-xs text-muted-foreground">
        This browser can&apos;t show a preview here, but the file is selected.
        {isPdf && " Moderators check page 1 first, so make sure the amount and due date are visible there and every page is redacted."}
      </p>
    </div>
  );
}
