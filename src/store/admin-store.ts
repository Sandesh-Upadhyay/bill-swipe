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

interface AdminState {
  users: DemoUser[];
  categories: CategorySetting[];
  settings: PlatformSettings;
  upsertUser: (user: DemoUser) => void;
  setUserStatus: (id: string, status: DemoUser["status"]) => void;
  setUserRole: (id: string, role: DemoUser["role"]) => void;
  updateCategory: (id: CategoryId, patch: Partial<Omit<CategorySetting, "id">>) => void;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
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
    (set) => ({
      users: buildSeedUsers(),
      categories: defaultCategories(),
      settings: defaultSettings(),
      upsertUser: (user) =>
        set((s) => {
          const exists = s.users.some((u) => u.id === user.id);
          return { users: exists ? s.users.map((u) => (u.id === user.id ? { ...u, ...user } : u)) : [user, ...s.users] };
        }),
      setUserStatus: (id, status) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status } : u)) })),
      setUserRole: (id, role) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, role } : u)) })),
      updateCategory: (id, patch) =>
        set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      reset: () => set({ users: buildSeedUsers(), categories: defaultCategories(), settings: defaultSettings() }),
    }),
    persistOptions<AdminState, Pick<AdminState, "users" | "categories" | "settings">>("admin", (s) => ({
      users: s.users,
      categories: s.categories,
      settings: s.settings,
    })),
  ),
);
