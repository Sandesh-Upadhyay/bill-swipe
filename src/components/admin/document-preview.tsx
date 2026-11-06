"use client";

import * as React from "react";
import { AlertTriangle, FileImage, FileText, FileX, Info, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { COUNTRY_MAP } from "@/lib/constants";
import { buildMockBill, fileTypeLabel, formatFileSize } from "@/lib/admin/mock-bill";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

function Redacted({ className, label }: { className?: string; label: string }) {
  return (
    <span className={cn("block h-2.5 rounded-[3px] bg-zinc-900", className)}>
      <span className="sr-only">{label} (redacted)</span>
    </span>
  );
}

/**
 * SIMULATED bill preview. Originals are never uploaded or stored, so this renders a stylised mock bill
 * from the request's metadata (category, amount, breakdown, due date) for demo review only.
 */
export function BillDocumentPreview({ request }: { request: BillRequest }) {
  const [zoomIndex, setZoomIndex] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const bill = React.useMemo(() => buildMockBill(request), [request]);
  const doc = request.document;

  if (!doc) {
    return (
      <div className="grid place-items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <FileX className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium">No document provided</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          The requester didn&apos;t attach a bill. Use “Request info” to ask for one before demo-approving. (This prototype never stores documents
          — only file metadata.)
        </p>
      </div>
    );
  }

  const zoom = ZOOM_STEPS[zoomIndex];
  const isImage = doc.type.toLowerCase().startsWith("image/");
  const FileIcon = isImage ? FileImage : FileText;
  const sideways = rotation % 180 !== 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="flex items-center gap-3 rounded-2xl border p-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          <FileIcon className="size-4" aria-hidden />
        </span>
        <div className="grid min-w-0 text-sm">
          <span className="font-medium break-all">{doc.name}</span>
          <span className="text-xs text-muted-foreground">
            {fileTypeLabel(doc.type)} · {formatFileSize(doc.sizeKb)} · stored file metadata only
          </span>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <strong>Simulated preview — the original file is never uploaded or stored.</strong> This mock bill is generated from the request&apos;s
          details so you can rehearse a review. The provider and account number are fictional.
        </span>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          Zoom {Math.round(zoom * 100)}% · Rotation {rotation}°
        </span>
        <div className="flex gap-1" role="group" aria-label="Preview controls">
          <Button size="icon-sm" variant="outline" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}>
            <ZoomOut />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
          >
            <ZoomIn />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Rotate 90 degrees" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateCw />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={zoomIndex === 1 && rotation === 0}
            onClick={() => {
              setZoomIndex(1);
              setRotation(0);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <figure aria-label="Simulated bill preview" className="overflow-auto rounded-2xl bg-muted/60 p-3 sm:p-4">
        <div className="mx-auto grid place-items-center">
          <div
            className="relative w-full max-w-[340px] overflow-hidden rounded-xl bg-white p-5 text-zinc-900 shadow-soft transition-transform"
            // Turned sideways, the bill is scaled down so its long edge still fits the panel.
            style={{ zoom, transform: rotation ? `rotate(${rotation}deg)${sideways ? " scale(0.78)" : ""}` : undefined }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 grid select-none place-items-center text-5xl font-black uppercase tracking-widest text-zinc-900/[0.06] [transform:rotate(-28deg)]"
            >
              Simulated
            </span>

            <div className="relative grid gap-4 text-[11px] leading-relaxed">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 pb-3">
                <div className="grid min-w-0">
                  <span className="text-sm font-bold">{bill.provider}</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">{bill.documentKind} · fictional provider</span>
                </div>
                <div className="grid text-right text-[10px] text-zinc-500">
                  <span>Ref {bill.reference}</span>
                  <span>Issued {formatDate(bill.issuedAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid content-start gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Billed to</span>
                  <Redacted className="w-24 max-w-full" label="Name" />
                  <Redacted className="w-28 max-w-full" label="Street address" />
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Redacted className="w-10 shrink-0" label="City and postcode" />
                    <span className="truncate text-[10px] text-zinc-500">{COUNTRY_MAP[request.country]?.name ?? request.country}</span>
                  </span>
                </div>
                <div className="grid content-start gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Account</span>
                  <span className="font-mono tabular-nums">
                    <span className="sr-only">Account number masked: </span>
                    {bill.accountMasked}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">Contact</span>
                  <Redacted className="w-20 max-w-full" label="Phone number" />
                </div>
              </div>

              <table className="w-full border-collapse">
                <caption className="sr-only">Line items (simulated)</caption>
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th scope="col" className="py-1 text-left font-medium">
                      Description
                    </th>
                    <th scope="col" className="py-1 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bill.lineItems.map((item, i) => (
                    <tr key={`${item.label}-${i}`} className="border-b border-dashed border-zinc-200 align-top">
                      <td className="py-1.5 pr-3 wrap-anywhere">{item.label}</td>
                      <td className="whitespace-nowrap py-1.5 text-right tabular-nums">{formatCurrency(item.amount, bill.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-xs font-bold">
                    <th scope="row" className="pt-2 text-left">
                      Total due ({bill.currency})
                    </th>
                    <td className="whitespace-nowrap pt-2 text-right tabular-nums">{formatCurrency(bill.total, bill.currency)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-100 px-3 py-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">Payment due</span>
                <span className="font-semibold">{formatDate(bill.dueDate)}</span>
              </div>

              <p className="text-center text-[9px] uppercase tracking-wider text-zinc-400">Generated mock · not a real document · BillSwipe prototype</p>
            </div>
          </div>
        </div>
      </figure>

      {bill.mismatch !== 0 && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Line items total {formatCurrency(bill.total, bill.currency)}, but the request asks for {formatCurrency(request.amount, request.currency)}.
          </span>
        </p>
      )}
      {!bill.itemised && (
        <p className="text-xs text-muted-foreground">No itemised breakdown was provided, so the requested amount is shown as a single line.</p>
      )}
    </div>
  );
}
