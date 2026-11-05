import { z } from "zod";
import type { CategoryId, CountryCode, CurrencyCode } from "@/lib/types";
import { toUsd, formatCurrency } from "@/lib/utils";

const COUNTRY_CODES = ["US", "GB", "CA", "AU", "IN", "AE", "DE", "FR"] as const satisfies readonly CountryCode[];
const CURRENCY_CODES = ["USD", "GBP", "CAD", "AUD", "INR", "AED", "EUR"] as const satisfies readonly CurrencyCode[];
const CATEGORY_IDS = ["medical", "education", "rent", "electricity", "water", "emergency", "other"] as const satisfies readonly CategoryId[];

export const ACCEPTED_DOC_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
export const MAX_DOC_MB = 10;

export function buildSubmitSchema(maxRequestUsd: number) {
  return z
    .object({
      name: z.string().trim().min(2, "Enter a display name (at least 2 characters)").max(40, "Keep it under 40 characters"),
      country: z.enum(COUNTRY_CODES, { message: "Select your country" }),
      city: z.string().trim().min(2, "Enter your town or city").max(60, "Keep it under 60 characters"),
      category: z.enum(CATEGORY_IDS, { message: "Choose the bill category" }),
      amount: z.number({ message: "Enter the amount" }).positive("Amount must be greater than zero"),
      currency: z.enum(CURRENCY_CODES, { message: "Select a currency" }),
      dueDate: z
        .string()
        .min(1, "Choose the due date")
        .refine((v) => {
          const d = new Date(v + "T23:59:59");
          return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
        }, "The due date must be in the future")
        .refine((v) => new Date(v).getTime() < Date.now() + 365 * 86_400_000, "Due date must be within the next 12 months"),
      title: z.string().trim().min(8, "Title needs at least 8 characters").max(80, "Keep the title under 80 characters"),
      summary: z
        .string()
        .trim()
        .min(30, "Write at least 30 characters — this appears on swipe cards")
        .max(220, "Keep the summary under 220 characters"),
      story: z.string().trim().min(120, "Share at least 120 characters so donors understand your situation").max(2500, "Keep your story under 2,500 characters"),
      truthful: z.boolean().refine((v) => v, "Please confirm the information is accurate"),
      understand: z.boolean().refine((v) => v, "Please confirm you understand this is a prototype"),
    })
    .superRefine((v, ctx) => {
      if (v.amount && v.currency && toUsd(v.amount, v.currency) > maxRequestUsd) {
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `Requests are limited to about ${formatCurrency(maxRequestUsd, "USD")} (USD equivalent) in this demo`,
        });
      }
    });
}

export type SubmitValues = z.infer<ReturnType<typeof buildSubmitSchema>>;

export const STEP_FIELDS: (keyof SubmitValues)[][] = [
  ["name", "country", "city"],
  ["category"],
  ["amount", "currency"],
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
