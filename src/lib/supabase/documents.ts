import "server-only";
import { createClient } from "./server";

/** Private bucket for original bill documents. Never made public. */
export const BILL_DOCUMENTS_BUCKET = "bill-documents";
/** Signed preview links expire quickly; request a fresh one each time a document is opened. */
export const SIGNED_URL_TTL_SECONDS = 60;

export const BILL_DOCUMENT_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"] as const;
export const BILL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Validates a bill document before upload. The bucket enforces the same limits server-side;
 * this gives users a friendly error first.
 */
export function validateBillDocument(file: { size: number; type: string }) {
  if (!BILL_DOCUMENT_MIME_TYPES.includes(file.type as (typeof BILL_DOCUMENT_MIME_TYPES)[number])) {
    return { ok: false as const, error: "Upload a PDF, PNG, JPEG or WebP file." };
  }
  if (file.size <= 0 || file.size > BILL_DOCUMENT_MAX_BYTES) {
    return { ok: false as const, error: "Files must be between 1 byte and 10 MB." };
  }
  return { ok: true as const };
}

/**
 * Creates a short-lived signed URL for a bill document.
 *
 * Authorization happens in the database, not here: Storage RLS lets the owner read their own
 * folder, and lets a reviewer read any document only when `public.is_admin()` (a trusted,
 * server-side check of `profiles.is_admin`) is true. A client-supplied role is never consulted.
 */
export async function createBillDocumentSignedUrl(storagePath: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { ok: false as const, error: "Sign in to view documents." };

  const { data, error } = await supabase.storage.from(BILL_DOCUMENTS_BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return { ok: false as const, error: "Document not found or you don't have access to it." };
  return { ok: true as const, url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS };
}

/** Server-side admin check backed by the database (`profiles.is_admin`), never by client state. */
export async function currentUserIsAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}
