import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SwipeDirection, SwipeRecord } from "@/lib/types";
import { persistOptions } from "./persist";

interface SwipeState {
  byUser: Record<string, SwipeRecord[]>;
  swipe: (userId: string, requestId: string, direction: SwipeDirection) => boolean;
  undo: (userId: string) => SwipeRecord | null;
  removeInterest: (userId: string, requestId: string) => void;
  resetUser: (userId: string) => void;
  reset: () => void;
}

export const useSwipeStore = create<SwipeState>()(
  persist(
    (set, get) => ({
      byUser: {},
      swipe: (userId, requestId, direction) => {
        const history = get().byUser[userId] ?? [];
        // Duplicate guard: a request can only be swiped once
        if (history.some((h) => h.requestId === requestId)) return false;
        set((s) => ({
          byUser: { ...s.byUser, [userId]: [...history, { requestId, direction, at: new Date().toISOString() }] },
        }));
        return true;
      },
      undo: (userId) => {
        const history = get().byUser[userId] ?? [];
        const last = history.at(-1) ?? null;
        if (!last) return null;
        set((s) => ({ byUser: { ...s.byUser, [userId]: history.slice(0, -1) } }));
        return last;
      },
      removeInterest: (userId, requestId) =>
        set((s) => ({
          byUser: { ...s.byUser, [userId]: (s.byUser[userId] ?? []).filter((h) => h.requestId !== requestId) },
        })),
      resetUser: (userId) => set((s) => ({ byUser: { ...s.byUser, [userId]: [] } })),
      reset: () => set({ byUser: {} }),
    }),
    persistOptions<SwipeState, Pick<SwipeState, "byUser">>("swipes", (s) => ({ byUser: s.byUser })),
  ),
);

const EMPTY: SwipeRecord[] = [];
export const useSwipeHistory = (userId?: string) =>
  useSwipeStore((s) => (userId ? (s.byUser[userId] ?? EMPTY) : EMPTY));
