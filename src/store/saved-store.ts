import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "./persist";

interface SavedState {
  saved: Record<string, string[]>;
  /** Requester user IDs blocked by each user. */
  blocked: Record<string, string[]>;
  toggleSaved: (userId: string, requestId: string) => boolean;
  block: (userId: string, targetUserId: string) => void;
  unblock: (userId: string, targetUserId: string) => void;
  reset: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      saved: {},
      blocked: {},
      toggleSaved: (userId, requestId) => {
        const list = get().saved[userId] ?? [];
        const isSaved = list.includes(requestId);
        set((s) => ({
          saved: { ...s.saved, [userId]: isSaved ? list.filter((id) => id !== requestId) : [requestId, ...list] },
        }));
        return !isSaved;
      },
      block: (userId, targetUserId) =>
        set((s) => {
          const list = s.blocked[userId] ?? [];
          if (list.includes(targetUserId)) return s;
          return { blocked: { ...s.blocked, [userId]: [...list, targetUserId] } };
        }),
      unblock: (userId, targetUserId) =>
        set((s) => ({
          blocked: { ...s.blocked, [userId]: (s.blocked[userId] ?? []).filter((id) => id !== targetUserId) },
        })),
      reset: () => set({ saved: {}, blocked: {} }),
    }),
    persistOptions<SavedState, Pick<SavedState, "saved" | "blocked">>("saved", (s) => ({ saved: s.saved, blocked: s.blocked })),
  ),
);

const EMPTY: string[] = [];
export const useSavedIds = (userId?: string) => useSavedStore((s) => (userId ? (s.saved[userId] ?? EMPTY) : EMPTY));
export const useBlockedIds = (userId?: string) => useSavedStore((s) => (userId ? (s.blocked[userId] ?? EMPTY) : EMPTY));
