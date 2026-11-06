import type { VerificationCheck, VerificationCheckId, VerificationCheckStatus, VerificationChecklist } from "@/lib/types";

/**
 * The three simulated review checks. These are prototype moderation states recorded by a demo admin —
 * BillSwipe never performs real identity, document or payee verification.
 */
export const CHECK_IDS: VerificationCheckId[] = ["identity", "document", "recipient"];

export const CHECK_META: Record<VerificationCheckId, { label: string; short: string; help: string }> = {
  identity: {
    label: "Identity checked",
    short: "Identity",
    help: "The requester appears to match their demo profile (name, country, account history).",
  },
  document: {
    label: "Document reviewed",
    short: "Document",
    help: "The bill looks genuine and its amount and due date match the request.",
  },
  recipient: {
    label: "Recipient verified",
    short: "Recipient",
    help: "The payee / biller details on the bill look plausible for this category and country.",
  },
};

export const CHECK_STATUS_LABEL: Record<VerificationCheckStatus, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
};

/** Reads one check, defaulting to pending when nothing has been recorded (older LocalStorage data included). */
export function getCheck(list: VerificationChecklist | undefined, id: VerificationCheckId): VerificationCheck {
  const c = list?.[id];
  return c && (c.status === "passed" || c.status === "failed" || c.status === "pending") ? c : { status: "pending" };
}

/** Checks that are not marked passed. */
export function unpassedChecks(list: VerificationChecklist | undefined): VerificationCheckId[] {
  return CHECK_IDS.filter((id) => getCheck(list, id).status !== "passed");
}
