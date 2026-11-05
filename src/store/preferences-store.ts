import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "./persist";

export type ThemePreference = "light" | "dark" | "system";
export type CurrencyDisplay = "original" | "usd";

interface PreferencesState {
  theme: ThemePreference;
  currencyDisplay: CurrencyDisplay;
  showSwipeHints: boolean;
  setTheme: (t: ThemePreference) => void;
  setCurrencyDisplay: (c: CurrencyDisplay) => void;
  setShowSwipeHints: (v: boolean) => void;
  reset: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "dark",
      currencyDisplay: "original",
      showSwipeHints: true,
      setTheme: (theme) => set({ theme }),
      setCurrencyDisplay: (currencyDisplay) => set({ currencyDisplay }),
      setShowSwipeHints: (showSwipeHints) => set({ showSwipeHints }),
      reset: () => set({ currencyDisplay: "original", showSwipeHints: true }),
    }),
    persistOptions<PreferencesState, Pick<PreferencesState, "theme" | "currencyDisplay" | "showSwipeHints">>(
      "preferences",
      (s) => ({ theme: s.theme, currencyDisplay: s.currencyDisplay, showSwipeHints: s.showSwipeHints }),
    ),
  ),
);
