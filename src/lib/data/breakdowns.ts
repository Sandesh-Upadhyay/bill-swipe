import type { BillLineItem, BillRequest } from "@/lib/types";

/**
 * FICTIONAL DEMO DATA: itemised bill breakdowns for the seed requests.
 * Each list sums exactly to the request's amount (checked by `breakdownTotal` at render time).
 * Kept separate from the seeds so requests already saved in LocalStorage still get a breakdown.
 */
export const SEED_BREAKDOWNS: Record<string, BillLineItem[]> = {
  req_marisol: [
    { label: "Physiotherapy sessions (8 × $185)", amount: 1480 },
    { label: "Progress assessment", amount: 220 },
    { label: "Knee support brace", amount: 150 },
  ],
  req_darnell: [
    { label: "Overdue electricity balance", amount: 520 },
    { label: "Late payment fees", amount: 45 },
    { label: "Payment-plan deposit", amount: 75 },
  ],
  req_amelia: [
    { label: "Rent arrears, first month", amount: 475 },
    { label: "Rent arrears, second month", amount: 475 },
  ],
  req_tomasz: [
    { label: "Professional registration fee", amount: 160 },
    { label: "Clinical skills exam fee", amount: 230 },
    { label: "Document certification", amount: 30 },
  ],
  req_priya: [
    { label: "Oral surgery procedure", amount: 1750 },
    { label: "Anaesthesia", amount: 380 },
    { label: "Follow-up visits and medication", amount: 170 },
  ],
  req_liam: [
    { label: "Replacement furnace unit", amount: 980 },
    { label: "Installation labour", amount: 360 },
    { label: "Safety inspection and permit", amount: 60 },
  ],
  req_grace: [
    { label: "Overdue electricity account", amount: 640 },
    { label: "Current quarter estimate", amount: 140 },
  ],
  req_jarrah: [
    { label: "Mattresses and bedding", amount: 620 },
    { label: "Second-hand fridge", amount: 450 },
    { label: "Kitchen essentials", amount: 280 },
    { label: "School uniforms and supplies", amount: 250 },
  ],
  req_ananya: [
    { label: "Semester tuition fee", amount: 42000 },
    { label: "Examination fee", amount: 3500 },
    { label: "Lab and library fees", amount: 2500 },
  ],
  req_ravi: [
    { label: "Dialysis sessions (10 × ₹4,500)", amount: 45000 },
    { label: "Medication and injections", amount: 14000 },
    { label: "Blood tests", amount: 6000 },
  ],
  req_meera: [
    { label: "Pipeline repair", amount: 7500 },
    { label: "Overdue water charges", amount: 3800 },
    { label: "Reconnection fee", amount: 700 },
  ],
  req_yusuf: [
    { label: "Rent cheque shortfall", amount: 3200 },
    { label: "Bank charges", amount: 300 },
  ],
  req_joy: [
    { label: "Emergency department treatment", amount: 1400 },
    { label: "X-rays and scans", amount: 550 },
    { label: "Medication", amount: 250 },
  ],
  req_lena: [
    { label: "Annual energy settlement", amount: 610 },
    { label: "Reminder fees", amount: 70 },
  ],
  req_kemal: [
    { label: "Course tuition", amount: 750 },
    { label: "Exam registration", amount: 110 },
    { label: "Tools and safety kit", amount: 40 },
  ],
  req_camille: [
    { label: "Security deposit", amount: 950 },
    { label: "Moving van hire", amount: 150 },
  ],
  req_hugo: [
    { label: "Prescription glasses", amount: 210 },
    { label: "Safety boots", amount: 110 },
  ],
  req_keisha: [
    { label: "Water bill for the leak period", amount: 245 },
    { label: "Late fee", amount: 20 },
    { label: "Leak repair parts", amount: 25 },
  ],
  req_sofia: [
    { label: "Rent shortfall, first month", amount: 600 },
    { label: "Rent shortfall, second month", amount: 600 },
  ],
  req_olu: [
    { label: "Refurbished laptop", amount: 520 },
    { label: "Course software licence", amount: 80 },
  ],
  req_sam_power: [
    { label: "Prepayment meter debt", amount: 460 },
    { label: "Emergency credit used", amount: 60 },
  ],
  req_sam_course: [
    { label: "Instructor course fee", amount: 260 },
    { label: "Certification exam", amount: 40 },
  ],
  req_sam_water: [{ label: "Quarterly water charge", amount: 140 }],
};

/** The itemised breakdown for a request, if the requester provided one. */
export function getBreakdown(request: Pick<BillRequest, "id" | "breakdown">): BillLineItem[] {
  return request.breakdown?.length ? request.breakdown : (SEED_BREAKDOWNS[request.id] ?? []);
}

export function breakdownTotal(items: BillLineItem[]) {
  return items.reduce((sum, i) => sum + i.amount, 0);
}
