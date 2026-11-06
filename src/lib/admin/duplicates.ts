import type { BillRequest } from "@/lib/types";

export type DuplicateReason = "document" | "same-user-amount-category" | "similar-title";

export interface DuplicateMatch {
  requestId: string;
  title: string;
  name: string;
  status: BillRequest["status"];
  reasons: DuplicateReason[];
}

export const DUPLICATE_REASON_LABEL: Record<DuplicateReason, string> = {
  document: "Same document name and size",
  "same-user-amount-category": "Same requester, amount and category",
  "similar-title": "Near-identical title",
};

const SIMILAR_TITLE_THRESHOLD = 0.85;

export function normaliseTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string) {
  const out = new Map<string, number>();
  const compact = s.replace(/\s/g, "");
  for (let i = 0; i < compact.length - 1; i++) {
    const g = compact.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** Sørensen–Dice similarity of character bigrams, 0–1. Robust to small typos and word-order changes. */
export function titleSimilarity(a: string, b: string) {
  const na = normaliseTitle(a);
  const nb = normaliseTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ga = bigrams(na);
  const gb = bigrams(nb);
  let overlap = 0;
  let total = 0;
  for (const n of ga.values()) total += n;
  for (const n of gb.values()) total += n;
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

function docKey(r: BillRequest) {
  return r.document ? `${r.document.name.trim().toLowerCase()}|${r.document.sizeKb}` : null;
}

/** Why `b` looks like a duplicate of `a` (empty when it doesn't). */
export function duplicateReasons(a: BillRequest, b: BillRequest): DuplicateReason[] {
  if (a.id === b.id) return [];
  const reasons: DuplicateReason[] = [];
  const ka = docKey(a);
  if (ka && ka === docKey(b)) reasons.push("document");
  if (a.userId === b.userId && a.amount === b.amount && a.category === b.category) reasons.push("same-user-amount-category");
  if (titleSimilarity(a.title, b.title) >= SIMILAR_TITLE_THRESHOLD) reasons.push("similar-title");
  return reasons;
}

/** Duplicate signals for one request against every other request (withdrawn ones included — they're still a signal). */
export function findDuplicates(request: BillRequest, all: BillRequest[]): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  for (const other of all) {
    const reasons = duplicateReasons(request, other);
    if (reasons.length) out.push({ requestId: other.id, title: other.title, name: other.name, status: other.status, reasons });
  }
  return out;
}

/** Duplicate matches for every request, keyed by request ID. O(n²) — fine for demo-sized data. */
export function buildDuplicateIndex(all: BillRequest[]): Record<string, DuplicateMatch[]> {
  const index: Record<string, DuplicateMatch[]> = {};
  for (const r of all) {
    const matches = findDuplicates(r, all);
    if (matches.length) index[r.id] = matches;
  }
  return index;
}
