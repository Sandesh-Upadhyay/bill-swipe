import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FormatLocale } from "@/lib/i18n/locale";
import { persistOptions } from "./persist";

export type ThemePreference = "light" | "dark" | "system";
export type CurrencyDisplay = "original" | "usd";

interface PreferencesState {
  theme: ThemePreference;
  currencyDisplay: CurrencyDisplay;
  showSwipeHints: boolean;
  /** Regional format for numbers, currencies and dates. UI text stays English. */
  locale: FormatLocale;
  setTheme: (t: ThemePreference) => void;
  setCurrencyDisplay: (c: CurrencyDisplay) => void;
  setShowSwipeHints: (v: boolean) => void;
  setLocale: (l: FormatLocale) => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      currencyDisplay: "original",
      showSwipeHints: true,
      locale: "auto",
      setTheme: (theme) => set({ theme }),
      setCurrencyDisplay: (currencyDisplay) => set({ currencyDisplay }),
      setShowSwipeHints: (showSwipeHints) => set({ showSwipeHints }),
      setLocale: (locale) => set({ locale }),
      reset: () => set({ currencyDisplay: "original", showSwipeHints: true, locale: "auto" }),
    }),
    persistOptions<PreferencesState, Pick<PreferencesState, "theme" | "currencyDisplay" | "showSwipeHints" | "locale">>(
      "preferences",
      (s) => ({ theme: s.theme, currencyDisplay: s.currencyDisplay, showSwipeHints: s.showSwipeHints, locale: s.locale }),
    ),
  ),
);
