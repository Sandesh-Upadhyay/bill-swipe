/**
 * UI message catalogue.
 *
 * English is the only language today. To add one, create a dictionary with the same keys
 * (TypeScript enforces this through `Messages`), register it in `CATALOGUES`, and add a
 * language picker that calls `setLanguage`. Components read strings through `t()`.
 *
 * Not every string has moved here yet: shared chrome (navigation, swipe controls and
 * prototype disclaimers) comes first; page copy can migrate incrementally.
 */
const en = {
  "nav.discover": "Discover",
  "nav.explore": "Explore",
  "nav.submit": "Submit bill",
  "nav.submitShort": "Submit",
  "nav.saved": "Saved",
  "nav.dashboard": "Dashboard",
  "nav.profile": "Profile",

  "swipe.undo": "Undo last swipe",
  "swipe.skip": "Skip",
  "swipe.details": "View details",
  "swipe.interested": "Interested in helping",
  "swipe.save": "Save for later",
  "swipe.unsave": "Unsave",
  "swipe.disclaimer": "Swiping right only shows interest. It never charges you or sends money.",
  "swipe.remaining": "{left} of {total} requests left",
  "swipe.loading": "Finding requests…",

  "demo.bannerTitle": "Prototype v1.1 — not a live donation service.",
  "demo.bannerBody": "All people and requests are fictional. No payments are processed.",
  "demo.simulated": "Simulated",
  "demo.demoRates": "≈ USD at fixed demo rates",
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
export type Language = "en";

const CATALOGUES: Record<Language, Messages> = { en };

let language: Language = "en";

export function setLanguage(next: Language) {
  language = next;
}

/** Looks up a message and fills `{placeholders}` from `vars`. Falls back to English, then to the key. */
export function t(key: MessageKey, vars?: Record<string, string | number>) {
  const template = CATALOGUES[language][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}
