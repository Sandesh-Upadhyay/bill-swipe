import type { BillRequest } from "@/lib/types";

/**
 * FICTIONAL DEMO DATA: bill-document metadata for the seed requests (name, type, size only).
 * No files exist; the admin panel renders a simulated preview from this metadata.
 * `req_unknown` deliberately reuses another request's file so the duplicate-document warning can be demoed.
 */
export const SEED_DOCUMENTS: Record<string, NonNullable<BillRequest["document"]>> = {
  req_marisol: { name: "physio-treatment-plan-redacted.pdf", type: "application/pdf", sizeKb: 212 },
  req_darnell: { name: "disconnection-notice.pdf", type: "application/pdf", sizeKb: 184 },
  req_amelia: { name: "rent-arrears-letter.pdf", type: "application/pdf", sizeKb: 96 },
  req_tomasz: { name: "registration-fee-invoice.png", type: "image/png", sizeKb: 640 },
  req_priya: { name: "dental-surgery-estimate.pdf", type: "application/pdf", sizeKb: 301 },
  req_liam: { name: "furnace-replacement-quote.jpg", type: "image/jpeg", sizeKb: 1180 },
  req_grace: { name: "electricity-statement-q3.pdf", type: "application/pdf", sizeKb: 158 },
  req_jarrah: { name: "flood-replacement-list.pdf", type: "application/pdf", sizeKb: 88 },
  req_ananya: { name: "semester-fee-notice.pdf", type: "application/pdf", sizeKb: 245 },
  req_ravi: { name: "dialysis-bill-redacted.pdf", type: "application/pdf", sizeKb: 410 },
  req_meera: { name: "water-board-demand-note.jpg", type: "image/jpeg", sizeKb: 920 },
  req_yusuf: { name: "tenancy-cheque-schedule.pdf", type: "application/pdf", sizeKb: 133 },
  req_joy: { name: "hospital-invoice-redacted.pdf", type: "application/pdf", sizeKb: 276 },
  req_lena: { name: "energy-settlement-2026.pdf", type: "application/pdf", sizeKb: 190 },
  req_kemal: { name: "course-enrolment-invoice.pdf", type: "application/pdf", sizeKb: 122 },
  req_camille: { name: "deposit-request-letter.png", type: "image/png", sizeKb: 540 },
  req_keisha: { name: "water-bill-leak-period.pdf", type: "application/pdf", sizeKb: 104 },
  req_sofia: { name: "rent-statement.pdf", type: "application/pdf", sizeKb: 87 },
  req_sam_power: { name: "prepayment-meter-statement.pdf", type: "application/pdf", sizeKb: 142 },
  req_sam_course: { name: "instructor-course-invoice.pdf", type: "application/pdf", sizeKb: 99 },
  // Same file as req_darnell: triggers the duplicate-document warning in the admin review.
  req_unknown: { name: "disconnection-notice.pdf", type: "application/pdf", sizeKb: 184 },
};
