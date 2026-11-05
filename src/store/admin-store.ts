import * as React from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId, DemoUser } from "@/lib/types";
import { buildSeedUsers } from "@/lib/data/users";
import { CATEGORIES } from "@/lib/constants";
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

export type ModerationKind = "approved" | "rejected" | "info" | "flag" | "report" | "user" | "category";

/** One entry in the admin audit trail. Newest first; capped at MAX_LOG entries. */
export interface ModerationEntry {
  id: string;
  kind: ModerationKind;
  text: string;
  createdAt: string;
  requestId?: string;
  userId?: string;
}

const MAX_LOG = 200;

interface AdminState {
  users: DemoUser[];
  categories: CategorySetting[];
  settings: PlatformSettings;
  moderationLog: ModerationEntry[];
  upsertUser: (user: DemoUser) => void;
  setUserStatus: (id: string, status: DemoUser["status"]) => void;
  setUserRole: (id: string, role: DemoUser["role"]) => void;
  updateCategory: (id: CategoryId, patch: Partial<Omit<CategorySetting, "id">>) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  logModeration: (entry: Omit<ModerationEntry, "id" | "createdAt">) => void;
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
      reset: () => set({ users: buildSeedUsers(), categories: defaultCategories(), settings: defaultSettings(), moderationLog: [] }),
    }),
    persistOptions<AdminState, Pick<AdminState, "users" | "categories" | "settings" | "moderationLog">>("admin", (s) => ({
      users: s.users,
      categories: s.categories,
      settings: s.settings,
      moderationLog: s.moderationLog,
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
