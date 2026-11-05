import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CurrencyCode } from "./types";
import { currencyLocale, generalLocale } from "./i18n/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fixed, fictional demo conversion rates (1 unit of currency -> USD). Not live data. */
export const DEMO_USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
  INR: 0.012,
  AED: 0.27,
  EUR: 1.08,
};

export function toUsd(amount: number, currency: CurrencyCode) {
  return amount * DEMO_USD_RATES[currency];
}

// Intl formatters are relatively expensive to build, so reuse them per locale + options.
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(locale: string, options: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(options);
  let f = numberFormats.get(key);
  if (!f) numberFormats.set(key, (f = new Intl.NumberFormat(locale, options)));
  return f;
}

/** Formats an amount in its own currency, following the user's regional format (see lib/i18n/locale). */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  opts: { compact?: boolean; decimals?: boolean } = {},
) {
  return numberFormat(currencyLocale(currency), {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.decimals ? 2 : opts.compact ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, compact = false) {
  return numberFormat(generalLocale(), { notation: compact ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const locale = generalLocale();
  const key = locale + JSON.stringify(opts);
  let f = dateFormats.get(key);
  if (!f) dateFormats.set(key, (f = new Intl.DateTimeFormat(locale, opts)));
  return f.format(d);
}

export function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function dueLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return `Overdue by ${Math.abs(d)}d`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d} days`;
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function percent(raised: number, goal: number) {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Deterministic hash for seeding generated avatars/covers. */
export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function daysFromNow(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}
