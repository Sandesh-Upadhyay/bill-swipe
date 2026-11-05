import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Contribution, ContributionKind, CurrencyCode } from "@/lib/types";
import { buildSeedContributions } from "@/lib/data/users";
import { uid } from "@/lib/utils";
import { persistOptions } from "./persist";
import { useRequestsStore } from "./requests-store";

type Result = { ok: true; contribution: Contribution } | { ok: false; error: string };

interface ContributionsState {
  contributions: Contribution[];
  /**
   * Records a SIMULATED contribution or a commitment (pledge). Never processes a payment.
   */
  add: (input: {
    requestId: string;
    userId: string;
    donorName: string;
    amount: number;
    currency: CurrencyCode;
    kind: ContributionKind;
    message?: string;
  }) => Result;
  fulfillCommitment: (id: string) => Result;
  cancelCommitment: (id: string) => void;
  reset: () => void;
}

export const useContributionsStore = create<ContributionsState>()(
  persist(
    (set, get) => ({
      contributions: buildSeedContributions(),
      add: (input) => {
        // Duplicate-action guard (double clicks / rapid re-submits)
        const recent = get().contributions.find(
          (c) =>
            c.userId === input.userId &&
            c.requestId === input.requestId &&
            c.amount === input.amount &&
            c.kind === input.kind &&
            Date.now() - new Date(c.createdAt).getTime() < 4000,
        );
        if (recent) return { ok: false, error: "That was already recorded a moment ago." };
        if (input.kind === "commitment") {
          const open = get().contributions.find(
            (c) => c.userId === input.userId && c.requestId === input.requestId && c.kind === "commitment" && c.status === "open",
          );
          if (open) return { ok: false, error: "You already have an open commitment for this request." };
        } else {
          const res = useRequestsStore.getState().addSimulatedFunds(input.requestId, input.amount, input.userId);
          if (!res.ok) return res;
        }
        const contribution: Contribution = {
          ...input,
          id: uid("c"),
          status: input.kind === "commitment" ? "open" : "recorded",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ contributions: [contribution, ...s.contributions] }));
        return { ok: true, contribution };
      },
      fulfillCommitment: (id) => {
        const c = get().contributions.find((x) => x.id === id);
        if (!c || c.kind !== "commitment" || c.status !== "open") return { ok: false, error: "This commitment is no longer open." };
        const res = useRequestsStore.getState().addSimulatedFunds(c.requestId, c.amount, c.userId);
        if (!res.ok) return res;
        const updated: Contribution = { ...c, status: "fulfilled" };
        set((s) => ({ contributions: s.contributions.map((x) => (x.id === id ? updated : x)) }));
        return { ok: true, contribution: updated };
      },
      cancelCommitment: (id) =>
        set((s) => ({ contributions: s.contributions.map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)) })),
      reset: () => set({ contributions: buildSeedContributions() }),
    }),
    persistOptions<ContributionsState, Pick<ContributionsState, "contributions">>("contributions", (s) => ({
      contributions: s.contributions,
    })),
  ),
);
