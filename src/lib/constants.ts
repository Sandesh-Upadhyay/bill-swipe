import {
  Droplets,
  GraduationCap,
  HeartPulse,
  Home,
  Package,
  Siren,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, CountryCode, CurrencyCode, ReportReason, RequestStatus } from "./types";

export const APP_NAME = "BillSwipe";
export const TAGLINE = "Swipe Right. Make a Difference.";

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the chip */
  tone: string;
  /** Gradient used on generated covers */
  gradient: [string, string];
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "medical", label: "Medical", description: "Hospital, prescriptions, therapy and care bills.", icon: HeartPulse, tone: "bg-rose-500/12 text-rose-700 dark:text-rose-300", gradient: ["#123b30", "#be3455"] },
  { id: "education", label: "Education", description: "Tuition, exam fees and learning essentials.", icon: GraduationCap, tone: "bg-sky-500/12 text-sky-700 dark:text-sky-300", gradient: ["#0d2f3a", "#1f7fb8"] },
  { id: "rent", label: "Rent", description: "Rent arrears and essential housing costs.", icon: Home, tone: "bg-amber-500/14 text-amber-800 dark:text-amber-300", gradient: ["#2b2a14", "#c98213"] },
  { id: "electricity", label: "Electricity", description: "Power and heating utility bills.", icon: Zap, tone: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300", gradient: ["#1d2c12", "#b8930f"] },
  { id: "water", label: "Water", description: "Water and sanitation utilities.", icon: Droplets, tone: "bg-cyan-500/12 text-cyan-800 dark:text-cyan-300", gradient: ["#0b2d33", "#14889e"] },
  { id: "emergency", label: "Emergency", description: "Urgent, unexpected essential costs.", icon: Siren, tone: "bg-red-500/12 text-red-700 dark:text-red-300", gradient: ["#2b1414", "#c43c3c"] },
  { id: "other", label: "Other essentials", description: "Other essential living expenses.", icon: Package, tone: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300", gradient: ["#0b2a20", "#13946a"] },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryMeta>;

export interface CountryMeta {
  code: CountryCode;
  name: string;
  flag: string;
  currency: CurrencyCode;
}

export const COUNTRIES: CountryMeta[] = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currency: "AED" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
];

export const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c])) as Record<CountryCode, CountryMeta>;

export const CURRENCIES: { code: CurrencyCode; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "AED", name: "UAE Dirham" },
  { code: "EUR", name: "Euro" },
];

/** Suggested simulated contribution amounts per currency. */
export const PRESET_AMOUNTS: Record<CurrencyCode, number[]> = {
  USD: [10, 25, 50, 100],
  GBP: [10, 20, 50, 100],
  CAD: [15, 30, 60, 120],
  AUD: [15, 30, 75, 150],
  INR: [500, 1000, 2500, 5000],
  AED: [40, 100, 200, 400],
  EUR: [10, 25, 50, 100],
};

export const STATUS_META: Record<RequestStatus, { label: string; tone: string }> = {
  pending_review: { label: "Pending review", tone: "bg-amber-500/14 text-amber-800 dark:text-amber-300" },
  active: { label: "Active", tone: "bg-emerald-500/14 text-emerald-800 dark:text-emerald-300" },
  needs_info: { label: "More info requested", tone: "bg-sky-500/14 text-sky-800 dark:text-sky-300" },
  completed: { label: "Goal reached (simulated)", tone: "bg-teal-500/14 text-teal-800 dark:text-teal-300" },
  rejected: { label: "Rejected", tone: "bg-red-500/12 text-red-700 dark:text-red-300" },
  withdrawn: { label: "Withdrawn", tone: "bg-zinc-500/14 text-zinc-700 dark:text-zinc-300" },
};

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "suspicious", label: "Looks suspicious or fraudulent" },
  { id: "misleading", label: "Misleading information" },
  { id: "duplicate", label: "Duplicate request" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "other", label: "Something else" },
];

export const DEMO_DISCLAIMER =
  "BillSwipe is a prototype. All people, requests, balances and contributions are fictional and simulated. No money is collected or transferred.";
