import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId, CountryCode, CurrencyCode } from "@/lib/types";
import { persistOptions } from "./persist";

/**
 * Saved-but-unsubmitted bill request, one per demo user.
 * Never holds the bill document itself: only its file name, type and size.
 * Amounts are `null` when the field was empty (NaN doesn't survive JSON).
 */
export interface SubmitDraft {
  values: {
    name: string;
    country: CountryCode;
    city: string;
    category?: CategoryId;
    amount: number | null;
    currency: CurrencyCode;
    breakdown: { label: string; amount: number | null }[];
    dueDate: string;
    title: string;
    summary: string;
    story: string;
  };
  /** Index of the wizard step the user had reached. */
  step: number;
  /** True when the user picked a currency themselves (so country changes don't override it). */
  currencyTouched: boolean;
  /** Metadata of the previously selected document. The file must be re-selected. */
  document?: { name: string; type: string; size: number };
  savedAt: string;
}

interface SubmitDraftState {
  drafts: Record<string, SubmitDraft>;
  saveDraft: (userId: string, draft: SubmitDraft) => void;
  clearDraft: (userId: string) => void;
  reset: () => void;
}

export const useSubmitDraftStore = create<SubmitDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (userId, draft) => set((s) => ({ drafts: { ...s.drafts, [userId]: draft } })),
      clearDraft: (userId) =>
        set((s) => {
          if (!(userId in s.drafts)) return s;
          const drafts = { ...s.drafts };
          delete drafts[userId];
          return { drafts };
        }),
      reset: () => set({ drafts: {} }),
    }),
    persistOptions<SubmitDraftState, Pick<SubmitDraftState, "drafts">>("submit-drafts", (s) => ({ drafts: s.drafts })),
  ),
);
