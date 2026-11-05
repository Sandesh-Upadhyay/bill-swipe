import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActivityItem,
  BillRequest,
  CategoryId,
  CountryCode,
  CurrencyCode,
  ReportReason,
  RequestReport,
  RequestStatus,
  VerificationState,
} from "@/lib/types";
import { buildSeedRequests } from "@/lib/data/requests";
import { buildSeedReports } from "@/lib/data/users";
import { uid } from "@/lib/utils";
import { persistOptions } from "./persist";
import { useAdminStore } from "./admin-store";

export interface NewRequestInput {
  userId: string;
  name: string;
  country: CountryCode;
  city: string;
  currency: CurrencyCode;
  category: CategoryId;
  title: string;
  amount: number;
  summary: string;
  story: string;
  dueDate: string;
  document?: BillRequest["document"];
}

export type EditableFields = Partial<
  Pick<BillRequest, "title" | "summary" | "story" | "amount" | "dueDate" | "category" | "city">
>;

type Result = { ok: true } | { ok: false; error: string };

interface RequestsState {
  requests: BillRequest[];
  reports: RequestReport[];
  activity: ActivityItem[];
  createRequest: (input: NewRequestInput) => { ok: true; id: string } | { ok: false; error: string };
  updateRequest: (id: string, patch: EditableFields, actorId: string) => Result;
  withdrawRequest: (id: string, actorId: string) => Result;
  setStatus: (id: string, status: RequestStatus, note?: string) => void;
  setVerification: (id: string, v: VerificationState) => void;
  toggleFlag: (id: string) => void;
  addSimulatedFunds: (id: string, amount: number, actorId: string) => Result;
  report: (input: { requestId: string; reporterId: string; reason: ReportReason; details: string }) => Result;
  setReportStatus: (id: string, status: RequestReport["status"]) => void;
  reset: () => void;
}

const log = (item: Omit<ActivityItem, "id" | "createdAt">): ActivityItem => ({
  ...item,
  id: uid("act"),
  createdAt: new Date().toISOString(),
});

const initial = () => ({ requests: buildSeedRequests(), reports: buildSeedReports(), activity: [] as ActivityItem[] });

export const useRequestsStore = create<RequestsState>()(
  persist(
    (set, get) => ({
      ...initial(),

      createRequest: (input) => {
        const duplicate = get().requests.find(
          (r) =>
            r.userId === input.userId &&
            r.title.trim().toLowerCase() === input.title.trim().toLowerCase() &&
            r.amount === input.amount &&
            r.status !== "withdrawn",
        );
        if (duplicate) return { ok: false, error: "You already have a request with this title and amount." };
        const now = new Date().toISOString();
        const id = uid("req");
        const request: BillRequest = {
          ...input,
          id,
          amountRaised: 0,
          supporters: 0,
          status: "pending_review",
          verification: "pending",
          image: input.userId,
          createdAt: now,
          updatedAt: now,
          flagged: false,
          isDemo: true,
        };
        set((s) => ({
          requests: [request, ...s.requests],
          activity: [log({ userId: input.userId, requestId: id, kind: "created", text: `Submitted “${input.title}” for review` }), ...s.activity],
        }));
        return { ok: true, id };
      },

      updateRequest: (id, patch, actorId) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r) return { ok: false, error: "Request not found." };
        if (r.userId !== actorId) return { ok: false, error: "You can only edit your own requests." };
        if (r.status === "withdrawn" || r.status === "completed") return { ok: false, error: "This request can no longer be edited." };
        if (patch.amount !== undefined && patch.amount < r.amountRaised)
          return { ok: false, error: "Amount can't be lower than what has already been raised (simulated)." };
        set((s) => ({
          requests: s.requests.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...patch,
                  // Edits after review go back to the moderation queue
                  status: x.status === "needs_info" || x.status === "active" ? "pending_review" : x.status,
                  verification: x.verification === "rejected" ? x.verification : "pending",
                  updatedAt: new Date().toISOString(),
                }
              : x,
          ),
          activity: [log({ userId: actorId, requestId: id, kind: "updated", text: `Edited “${patch.title ?? r.title}” — sent back for review` }), ...s.activity],
        }));
        return { ok: true };
      },

      withdrawRequest: (id, actorId) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r) return { ok: false, error: "Request not found." };
        if (r.userId !== actorId) return { ok: false, error: "You can only withdraw your own requests." };
        if (r.status === "withdrawn") return { ok: false, error: "This request is already withdrawn." };
        set((s) => ({
          requests: s.requests.map((x) => (x.id === id ? { ...x, status: "withdrawn", updatedAt: new Date().toISOString() } : x)),
          activity: [log({ userId: actorId, requestId: id, kind: "withdrawn", text: `Withdrew “${r.title}”` }), ...s.activity],
        }));
        return { ok: true };
      },

      setStatus: (id, status, note) =>
        set((s) => {
          const r = s.requests.find((x) => x.id === id);
          if (!r) return s;
          return {
            requests: s.requests.map((x) =>
              x.id === id ? { ...x, status, adminNote: note ?? x.adminNote, updatedAt: new Date().toISOString() } : x,
            ),
            activity: [
              log({ userId: r.userId, requestId: id, kind: "status", text: `Moderator changed “${r.title}” to ${status.replace("_", " ")}` }),
              ...s.activity,
            ],
          };
        }),

      setVerification: (id, verification) =>
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, verification } : x)) })),

      toggleFlag: (id) =>
        set((s) => ({ requests: s.requests.map((x) => (x.id === id ? { ...x, flagged: !x.flagged } : x)) })),

      addSimulatedFunds: (id, amount, actorId) => {
        const r = get().requests.find((x) => x.id === id);
        if (!r) return { ok: false, error: "Request not found." };
        if (r.status !== "active") return { ok: false, error: "This request isn't accepting simulated contributions." };
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Enter a valid amount." };
        const remaining = r.amount - r.amountRaised;
        if (amount > remaining) return { ok: false, error: "Amount exceeds the remaining balance." };
        const amountRaised = r.amountRaised + amount;
        set((s) => ({
          requests: s.requests.map((x) =>
            x.id === id
              ? {
                  ...x,
                  amountRaised,
                  supporters: x.supporters + 1,
                  status: amountRaised >= x.amount ? "completed" : x.status,
                  updatedAt: new Date().toISOString(),
                }
              : x,
          ),
          activity: [
            log({ userId: r.userId, requestId: id, kind: "contribution", text: `Received a simulated contribution on “${r.title}”` }),
            ...s.activity,
          ],
        }));
        void actorId;
        return { ok: true };
      },

      report: ({ requestId, reporterId, reason, details }) => {
        const already = get().reports.some((r) => r.requestId === requestId && r.reporterId === reporterId && r.status === "open");
        if (already) return { ok: false, error: "You've already reported this request. Our moderators are reviewing it." };
        const threshold = useAdminStore.getState().settings.autoFlagThreshold;
        set((s) => {
          const reports: RequestReport[] = [
            { id: uid("rep"), requestId, reporterId, reason, details, createdAt: new Date().toISOString(), status: "open" },
            ...s.reports,
          ];
          const openCount = reports.filter((r) => r.requestId === requestId && r.status === "open").length;
          const autoFlag = threshold > 0 && openCount >= threshold;
          return {
            reports,
            requests: autoFlag ? s.requests.map((r) => (r.id === requestId ? { ...r, flagged: true } : r)) : s.requests,
          };
        });
        return { ok: true };
      },

      setReportStatus: (id, status) => set((s) => ({ reports: s.reports.map((r) => (r.id === id ? { ...r, status } : r)) })),

      reset: () => set(initial()),
    }),
    persistOptions<RequestsState, Pick<RequestsState, "requests" | "reports" | "activity">>("requests", (s) => ({
      requests: s.requests,
      reports: s.reports,
      activity: s.activity,
    })),
  ),
);

export const isDiscoverable = (r: BillRequest) => r.status === "active" && !r.flagged;
