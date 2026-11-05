"use client";

import * as React from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/primitives";
import { persistedStores } from "@/store";
import { useHydrationStore } from "@/store/hydration-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { documentLang, setFormatLocale } from "@/lib/i18n/locale";

/** Rehydrates every persisted Zustand store on the client, then flags the app as hydrated. */
function StoreHydrator() {
  React.useEffect(() => {
    let cancelled = false;
    Promise.all(persistedStores.map((s) => s.persist.rehydrate()))
      .catch(() => {
        // Corrupt storage: fall back to seeded defaults rather than crashing.
        console.warn("[BillSwipe] Could not restore demo data from LocalStorage. Using defaults.");
      })
      .finally(() => {
        if (!cancelled) useHydrationStore.getState().setHydrated();
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

/** Keeps next-themes in sync with the persisted theme preference. */
function ThemeSync() {
  const { setTheme } = useTheme();
  const theme = usePreferencesStore((s) => s.theme);
  const hydrated = useHydrationStore((s) => s.hydrated);
  React.useEffect(() => {
    if (hydrated) setTheme(theme);
  }, [hydrated, theme, setTheme]);
  return null;
}

/**
 * Applies the regional-format preference before children render. Formatting helpers read the
 * locale from module state, so the subtree remounts (via `key`) when it changes. Until the stores
 * hydrate, "auto" is used, matching the server render.
 */
function LocaleBoundary({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrationStore((s) => s.hydrated);
  const preferred = usePreferencesStore((s) => s.locale);
  const locale = hydrated ? preferred : "auto";
  setFormatLocale(locale);
  React.useEffect(() => {
    document.documentElement.lang = documentLang();
  }, [locale]);
  return <React.Fragment key={locale}>{children}</React.Fragment>;
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={(resolvedTheme as "light" | "dark") ?? "dark"}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "!rounded-2xl !font-sans" } }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange storageKey="billswipe:theme">
      <TooltipProvider>
        <StoreHydrator />
        <ThemeSync />
        <LocaleBoundary>{children}</LocaleBoundary>
        <ThemedToaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
