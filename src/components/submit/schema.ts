import { z } from "zod";
import type { CategoryId, CountryCode, CurrencyCode } from "@/lib/types";
import { toUsd, formatCurrency } from "@/lib/utils";

const COUNTRY_CODES = ["US", "GB", "CA", "AU", "IN", "AE", "DE", "FR"] as const satisfies readonly CountryCode[];
const CURRENCY_CODES = ["USD", "GBP", "CAD", "AUD", "INR", "AED", "EUR"] as const satisfies readonly CurrencyCode[];
const CATEGORY_IDS = ["medical", "education", "rent", "electricity", "water", "emergency", "other"] as const satisfies readonly CategoryId[];

export const ACCEPTED_DOC_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_DOC_MB = 10;

/** Character limits for the free-text fields (shared by the schema and the on-screen counters). */
export const TEXT_LIMITS = {
  title: { min: 8, max: 80 },
  summary: { min: 30, max: 220 },
  story: { min: 120, max: 2500 },
} as const;

/** `limitFor` returns the maximum request size (USD equivalent) for a category. */
export function buildSubmitSchema(limitFor: (category: CategoryId | undefined) => number) {
  return z
    .object({
      name: z.string().trim().min(2, "Enter a display name (at least 2 characters)").max(40, "Keep it under 40 characters"),
      country: z.enum(COUNTRY_CODES, { message: "Select your country" }),
      city: z.string().trim().min(2, "Enter your town or city (at least 2 characters)").max(60, "Keep it under 60 characters"),
      category: z.enum(CATEGORY_IDS, { message: "Choose the bill category" }),
      amount: z.number({ message: "Enter the amount outstanding, for example 120.50" }).positive("Amount must be greater than zero"),
      currency: z.enum(CURRENCY_CODES, { message: "Select a currency" }),
      /** Optional itemised lines. When present they must add up to `amount` (see `breakdownMismatch`). */
      breakdown: z
        .array(
          z.object({
            label: z.string().trim().min(2, "Describe this item").max(60, "Keep it under 60 characters"),
            amount: z.number({ message: "Enter an amount" }).positive("Must be more than zero"),
          }),
        )
        .max(MAX_BREAKDOWN_ITEMS, `Use up to ${MAX_BREAKDOWN_ITEMS} items`),
      dueDate: z
        .string()
        .min(1, "Choose the due date")
        .refine((v) => {
          const d = new Date(v + "T23:59:59");
          return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
        }, "The due date must be in the future")
        .refine((v) => new Date(v).getTime() < Date.now() + 365 * 86_400_000, "Due date must be within the next 12 months"),
      title: z.string().trim().min(TEXT_LIMITS.title.min, "Title needs at least 8 characters").max(TEXT_LIMITS.title.max, "Keep the title under 80 characters"),
      summary: z
        .string()
        .trim()
        .min(TEXT_LIMITS.summary.min, "Write at least 30 characters — this appears on swipe cards")
        .max(TEXT_LIMITS.summary.max, "Keep the summary under 220 characters"),
      story: z.string().trim().min(TEXT_LIMITS.story.min, "Share at least 120 characters so donors understand your situation").max(TEXT_LIMITS.story.max, "Keep your story under 2,500 characters"),
      truthful: z.boolean().refine((v) => v, "Please confirm the information is accurate"),
      understand: z.boolean().refine((v) => v, "Please confirm you understand this is a prototype"),
    })
    .superRefine((v, ctx) => {
      const overLimit = amountLimitError(v.amount, v.currency, limitFor(v.category));
      if (overLimit) ctx.addIssue({ code: "custom", path: ["amount"], message: overLimit });
      const mismatch = breakdownMismatch(v.amount, v.currency, v.breakdown);
      if (mismatch) ctx.addIssue({ code: "custom", path: ["breakdown"], message: mismatch });
    });
}

export const MAX_BREAKDOWN_ITEMS = 8;

/** Returns an error message when the amount exceeds the limit (compared in USD at the fixed demo rates), otherwise null. */
export function amountLimitError(amount: number, currency: CurrencyCode, limitUsd: number) {
  if (!amount || !currency || toUsd(amount, currency) <= limitUsd) return null;
  return `Requests in this category are limited to about ${formatCurrency(limitUsd, "USD")} (USD equivalent at fixed demo rates) in this demo`;
}

/** Returns an error message when itemised lines don't add up to the total, otherwise null. */
export function breakdownMismatch(amount: number, currency: CurrencyCode, items: { amount: number }[] | undefined) {
  if (!items?.length || !Number.isFinite(amount) || amount <= 0) return null;
  const sum = items.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0);
  if (Math.abs(sum - amount) < 0.005) return null;
  return `Your items add up to ${formatCurrency(sum, currency, { decimals: true })}, but the amount outstanding is ${formatCurrency(amount, currency, { decimals: true })}. Adjust the items or the amount.`;
}

export type SubmitValues = z.infer<ReturnType<typeof buildSubmitSchema>>;

export const STEP_FIELDS: (keyof SubmitValues)[][] = [
  ["name", "country", "city"],
  ["category"],
  ["amount", "currency", "breakdown"],
  ["dueDate"],
  ["title", "summary", "story"],
  [],
  ["truthful", "understand"],
];

export const STEPS = [
  { title: "Personal information", short: "You" },
  { title: "Bill category", short: "Category" },
  { title: "Amount & currency", short: "Amount" },
  { title: "Due date", short: "Due date" },
  { title: "Your story", short: "Story" },
  { title: "Bill document", short: "Document" },
  { title: "Review & submit", short: "Review" },
];

/** Rough minutes each step takes, used for the "About N min left" estimate. */
export const STEP_MINUTES = [1, 0.5, 1.5, 0.5, 4, 1, 1];

/** Minutes left including the current step, rounded up (0 means "under a minute"). */
export function minutesLeft(step: number) {
  const m = STEP_MINUTES.slice(step).reduce((s, n) => s + n, 0);
  return m < 1 ? 0 : Math.ceil(m);
}

/** Human labels for the error summary. */
export const FIELD_LABELS: Record<keyof SubmitValues, string> = {
  name: "Display name",
  country: "Country",
  city: "Town or city",
  category: "Bill category",
  amount: "Amount outstanding",
  currency: "Currency",
  breakdown: "Itemised breakdown",
  dueDate: "Due date",
  title: "Request title",
  summary: "Short summary",
  story: "Your story",
  truthful: "Accuracy confirmation",
  understand: "Prototype confirmation",
};
