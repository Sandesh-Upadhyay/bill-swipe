import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CategoryId,
  DemoUser,
  ModeratorNote,
  VerificationCheckId,
  VerificationCheckStatus,
  VerificationChecklist,
} from "@/lib/types";
import { buildSeedUsers } from "@/lib/data/users";
import { CATEGORIES } from "@/lib/constants";
import { CHECK_META } from "@/lib/admin/checks";
import { uid } from "@/lib/utils";
import { persistOptions } from "./persist";

export interface CategorySetting {
  id: CategoryId;
  enabled: boolean;
  description: string;
  maxAmountUsd: number;
}

export interface PlatformSettings {
  requireDocument: boolean;
  autoFlagThreshold: number;
  maxRequestUsd: number;
  showDemoBanner: boolean;
  allowUnverifiedInFeed: boolean;
  moderatorEmail: string;
}

export type ModerationKind = "approved" | "rejected" | "info" | "flag" | "report" | "user" | "category" | "checklist" | "note";

/** One entry in the admin audit trail. Newest first; capped at MAX_LOG entries. */
export interface ModerationEntry {
  id: string;
  kind: ModerationKind;
  text: string;
  createdAt: string;
  requestId?: string;
  userId?: string;
  /** Display name of the demo moderator who made the change (missing on older entries). */
  actor?: string;
}

const MAX_LOG = 500;
const MAX_NOTES_PER_REQUEST = 50;

/** Context used to write a readable audit entry. */
export interface ReviewContext {
  title?: string;
  userId?: string;
}

type NoteResult = { ok: true } | { ok: false; error: string };

interface AdminState {
  users: DemoUser[];
  categories: CategorySetting[];
  settings: PlatformSettings;
  moderationLog: ModerationEntry[];
  /** Simulated review checklist per request ID. Missing entries mean every check is pending. */
  verificationChecks: Record<string, VerificationChecklist>;
  /** Internal moderator notes per request ID, newest first. */
  moderatorNotes: Record<string, ModeratorNote[]>;
  upsertUser: (user: DemoUser) => void;
  setUserStatus: (id: string, status: DemoUser["status"]) => void;
  setUserRole: (id: string, role: DemoUser["role"]) => void;
  updateCategory: (id: CategoryId, patch: Partial<Omit<CategorySetting, "id">>) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  logModeration: (entry: Omit<ModerationEntry, "id" | "createdAt">) => void;
  setVerificationCheck: (
    requestId: string,
    check: VerificationCheckId,
    status: VerificationCheckStatus,
    actor: string,
    context?: ReviewContext,
  ) => void;
  addModeratorNote: (requestId: string, text: string, author: string, context?: ReviewContext) => NoteResult;
  reset: () => void;
}

const defaultCategories = (): CategorySetting[] =>
  CATEGORIES.map((c) => ({ id: c.id, enabled: true, description: c.description, maxAmountUsd: c.id === "medical" ? 5000 : 3000 }));

const defaultSettings = (): PlatformSettings => ({
  requireDocument: true,
  autoFlagThreshold: 3,
  maxRequestUsd: 5000,
  showDemoBanner: true,
  allowUnverifiedInFeed: true,
  moderatorEmail: "moderation@demo.billswipe",
});

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      users: buildSeedUsers(),
      categories: defaultCategories(),
      settings: defaultSettings(),
      moderationLog: [],
      verificationChecks: {},
      moderatorNotes: {},
      upsertUser: (user) =>
        set((s) => {
          const exists = s.users.some((u) => u.id === user.id);
          return { users: exists ? s.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) : [user, ...s.users] };
        }),
      setUserStatus: (id, status) => {
        const user = get().users.find((u) => u.id === id);
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) }));
        if (user) get().logModeration({ kind: "user", userId: id, text: `${status === "suspended" ? "Suspended" : "Reactivated"} ${user.name}` });
      },
      setUserRole: (id, role) => {
        const user = get().users.find((u) => u.id === id);
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) }));
        if (user) get().logModeration({ kind: "user", userId: id, text: `Changed ${user.name}'s role from ${user.role} to ${role}` });
      },
      updateCategory: (id, patch) => {
        const before = get().categories.find((c) => c.id === id);
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        const label = CATEGORIES.find((c) => c.id === id)?.label ?? id;
        if (before && patch.enabled !== undefined && patch.enabled !== before.enabled) {
          get().logModeration({ kind: "category", text: `${patch.enabled ? "Enabled" : "Disabled"} the ${label} category` });
        } else if (patch.description !== undefined || patch.maxAmountUsd !== undefined) {
          get().logModeration({ kind: "category", text: `Edited the ${label} category settings` });
        }
      },
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      logModeration: (entry) =>
        set((s) => ({
          moderationLog: [
            { ...entry, id: `mod_${Math.random().toString(36).slice(2, 9)}`, createdAt: new Date().toISOString() },
            ...s.moderationLog,
          ].slice(0, MAX_LOG),
        })),
      setVerificationCheck: (requestId, check, status, actor, context) => {
        const current = get().verificationChecks[requestId]?.[check]?.status ?? "pending";
        if (current === status) return;
        set((s) => ({
          verificationChecks: {
            ...s.verificationChecks,
            [requestId]: { ...s.verificationChecks[requestId], [check]: { status, by: actor, at: new Date().toISOString() } },
          },
        }));
        const label = CHECK_META[check].label;
        const on = context?.title ? ` on “${context.title}”` : "";
        const verb = status === "pending" ? "Reset" : `Marked ${status}`;
        get().logModeration({
          kind: "checklist",
          requestId,
          userId: context?.userId,
          actor,
          text: `${verb}: “${label}”${on} (simulated check)`,
        });
      },
      addModeratorNote: (requestId, text, author, context) => {
        const clean = text.trim();
        if (clean.length < 3) return { ok: false, error: "Notes need at least 3 characters." };
        if (clean.length > 1000) return { ok: false, error: "Notes can be at most 1,000 characters." };
        const note: ModeratorNote = { id: uid("note"), text: clean, createdAt: new Date().toISOString(), author };
        set((s) => ({
          moderatorNotes: {
            ...s.moderatorNotes,
            [requestId]: [note, ...(Array.isArray(s.moderatorNotes[requestId]) ? s.moderatorNotes[requestId] : [])].slice(0, MAX_NOTES_PER_REQUEST),
          },
        }));
        const preview = clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
        get().logModeration({
          kind: "note",
          requestId,
          userId: context?.userId,
          actor: author,
          text: `Added an internal note${context?.title ? ` on “${context.title}”` : ""}: ${preview}`,
        });
        return { ok: true };
      },
      reset: () =>
        set({
          users: buildSeedUsers(),
          categories: defaultCategories(),
          settings: defaultSettings(),
          moderationLog: [],
          verificationChecks: {},
          moderatorNotes: {},
        }),
    }),
    persistOptions<
      AdminState,
      Pick<AdminState, "users" | "categories" | "settings" | "moderationLog" | "verificationChecks" | "moderatorNotes">
    >("admin", (s) => ({
      users: s.users,
      categories: s.categories,
      settings: s.settings,
      moderationLog: s.moderationLog,
      verificationChecks: s.verificationChecks,
      moderatorNotes: s.moderatorNotes,
    })),
  ),
);

/** IDs of users a moderator has suspended. Their requests are hidden from donors. */
export function useSuspendedUserIds() {
  const key = useAdminStore((s) =>
    s.users
      .filter((u) => u.status === "suspended")
      .map((u) => u.id)
      .join(","),
  );
  return React.useMemo(() => new Set(key ? key.split(",") : []), [key]);
}
