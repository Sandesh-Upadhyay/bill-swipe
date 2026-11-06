import type { BillLineItem, BillRequest, CategoryId } from "@/lib/types";
import { breakdownTotal, getBreakdown } from "@/lib/data/breakdowns";
import { hashString } from "@/lib/utils";

/**
 * Builds a SIMULATED bill from request metadata so moderators can rehearse a document review.
 * The original file is never uploaded or stored — every value here is derived from fictional demo data.
 */
const PROVIDERS: Record<CategoryId, { kind: string; names: string[] }> = {
  medical: { kind: "Patient statement", names: ["Riverside Community Clinic", "Northgate Health Partners", "St. Aster Medical Centre"] },
  education: { kind: "Fee invoice", names: ["Lakeside Institute of Learning", "Harbour City College", "Meridian Skills Academy"] },
  rent: { kind: "Rent statement", names: ["Oakfield Lettings", "Brookside Property Management", "Elm Row Housing Co."] },
  electricity: { kind: "Electricity bill", names: ["Brightline Energy", "Northern Grid Power", "Volta Home Energy"] },
  water: { kind: "Water bill", names: ["Clearwater Utilities", "Bluestream Water Services", "Riverbend Water Board"] },
  emergency: { kind: "Service invoice", names: ["Rapid Response Services", "Metro Emergency Repairs", "Citywide Assist"] },
  other: { kind: "Invoice", names: ["Essentials Supply Co.", "Hometown Services", "Everyday Goods Store"] },
};

export interface MockBill {
  provider: string;
  documentKind: string;
  /** Masked account number, e.g. "•••• •••• 4821". */
  accountMasked: string;
  reference: string;
  issuedAt: string;
  dueDate: string;
  currency: BillRequest["currency"];
  lineItems: BillLineItem[];
  total: number;
  /** True when line items were provided (requester breakdown or seed data). */
  itemised: boolean;
  /** Difference between the line-item total and the requested amount (0 when they match). */
  mismatch: number;
}

export function buildMockBill(request: BillRequest): MockBill {
  const h = hashString(request.id + (request.document?.name ?? ""));
  const p = PROVIDERS[request.category] ?? PROVIDERS.other;
  const items = getBreakdown(request);
  const lineItems = items.length ? items : [{ label: "Amount due", amount: request.amount }];
  const total = breakdownTotal(lineItems);
  return {
    provider: p.names[h % p.names.length],
    documentKind: p.kind,
    accountMasked: `•••• •••• ${String(h % 10_000).padStart(4, "0")}`,
    reference: `INV-${(h >>> 8).toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`,
    issuedAt: request.createdAt,
    dueDate: request.dueDate,
    currency: request.currency,
    lineItems,
    total,
    itemised: items.length > 0,
    mismatch: total - request.amount,
  };
}

/** Human-readable file size from KB. */
export function formatFileSize(sizeKb: number) {
  if (!Number.isFinite(sizeKb) || sizeKb < 0) return "Unknown size";
  return sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`;
}

/** Friendly label for a MIME type ("application/pdf" -> "PDF"). */
export function fileTypeLabel(type: string) {
  const t = type.toLowerCase();
  if (!t) return "Unknown type";
  if (t.includes("pdf")) return "PDF";
  if (t.startsWith("image/")) return `${t.slice(6).toUpperCase()} image`;
  return type;
}
