import type { CurrencyCode } from "@/lib/types";

/**
 * Regional formatting for numbers, currencies and dates.
 *
 * "auto" keeps the original defaults (dates as en-GB, each currency formatted in its home convention),
 * which is also what the server renders, so first paint never mismatches. A chosen locale applies after
 * the client has hydrated.
 */
export type FormatLocale = "auto" | "en-GB" | "en-US" | "en-IN" | "en-AU" | "en-CA" | "de-DE" | "fr-FR" | "ar-AE";

export const FORMAT_LOCALES: { id: FormatLocale; label: string; example: string }[] = [
  { id: "auto", label: "Automatic", example: "5 Nov 2026 · CA$1,234 · ₹1,23,450" },
  { id: "en-GB", label: "English (United Kingdom)", example: "5 Nov 2026 · 1,234.50" },
  { id: "en-US", label: "English (United States)", example: "Nov 5, 2026 · 1,234.50" },
  { id: "en-IN", label: "English (India)", example: "5 Nov 2026 · 1,23,450" },
  { id: "en-AU", label: "English (Australia)", example: "5 Nov 2026 · 1,234.50" },
  { id: "en-CA", label: "English (Canada)", example: "Nov 5, 2026 · 1,234.50" },
  { id: "de-DE", label: "Deutsch (Deutschland)", example: "5. Nov. 2026 · 1.234,50" },
  { id: "fr-FR", label: "Français (France)", example: "5 nov. 2026 · 1 234,50" },
  { id: "ar-AE", label: "العربية (الإمارات)", example: "Arabic regional format" },
];

/**
 * Formatting convention per currency when the locale is "auto". en-US keeps every dollar currency
 * unambiguous (CA$, A$, US$-style symbols) in a mixed-currency list; INR uses Indian digit grouping.
 */
const CURRENCY_AUTO_LOCALE: Record<CurrencyCode, string> = {
  USD: "en-US",
  GBP: "en-US",
  CAD: "en-US",
  AUD: "en-US",
  INR: "en-IN",
  AED: "en-US",
  EUR: "en-US",
};

let current: FormatLocale = "auto";

export function setFormatLocale(locale: FormatLocale) {
  current = locale;
}

export function getFormatLocale(): FormatLocale {
  return current;
}

/** Locale for formatting an amount in `currency`. */
export function currencyLocale(currency: CurrencyCode) {
  return current === "auto" ? CURRENCY_AUTO_LOCALE[currency] : current;
}

/** Locale for dates and plain numbers. */
export function generalLocale() {
  return current === "auto" ? "en-GB" : current;
}

/** BCP 47 language for the <html lang> attribute. UI text is English; only formats change. */
export function documentLang() {
  return "en";
}
