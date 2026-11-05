import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppNotification } from "@/lib/types";
import { uid } from "@/lib/utils";
import { persistOptions } from "./persist";

type StoredNotification = AppNotification & { userId: string };

interface NotificationsState {
  items: StoredNotification[];
  push: (userId: string, n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: (userId: string) => void;
  clear: (userId: string) => void;
  seedWelcome: (userId: string, name: string) => void;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      push: (userId, n) =>
        set((s) => ({
          items: [{ ...n, userId, id: uid("n"), createdAt: new Date().toISOString(), read: false }, ...s.items].slice(0, 60),
        })),
      markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: (userId) =>
        set((s) => ({ items: s.items.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),
      clear: (userId) => set((s) => ({ items: s.items.filter((n) => n.userId !== userId) })),
      seedWelcome: (userId, name) => {
        if (get().items.some((n) => n.userId === userId)) return;
        get().push(userId, {
          title: `Welcome to BillSwipe, ${name.split(" ")[0]}`,
          body: "This is a demo experience. Everything you see is fictional and every contribution is simulated.",
          href: "/discover",
        });
      },
      reset: () => set({ items: [] }),
    }),
    persistOptions<NotificationsState, Pick<NotificationsState, "items">>("notifications", (s) => ({ items: s.items })),
  ),
);
