import { createJSONStorage, type PersistOptions } from "zustand/middleware";

export const STORAGE_PREFIX = "billswipe:v1:";

/**
 * Shared persist options for every demo store.
 * - skipHydration: stores rehydrate on the client only (see <StoreHydrator />), avoiding SSR mismatches.
 * - merge: guards against corrupted / outdated LocalStorage by type-checking each persisted key.
 */
export function persistOptions<S extends object, P = Partial<S>>(
  name: string,
  partialize: (s: S) => P,
): PersistOptions<S, P> {
  return {
    name: STORAGE_PREFIX + name,
    version: 1,
    skipHydration: true,
    storage: createJSONStorage(() => localStorage),
    partialize,
    merge: (persisted, current) => {
      if (!persisted || typeof persisted !== "object") return current;
      const next = { ...current } as Record<string, unknown>;
      for (const [key, value] of Object.entries(persisted as Record<string, unknown>)) {
        const existing = (current as Record<string, unknown>)[key];
        if (existing === undefined || existing === null) {
          next[key] = value;
          continue;
        }
        const sameKind =
          Array.isArray(existing) === Array.isArray(value) && typeof existing === typeof value;
        if (sameKind) next[key] = value;
      }
      return next as S;
    },
  };
}
