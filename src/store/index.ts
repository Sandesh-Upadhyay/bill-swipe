import { useAdminStore } from "./admin-store";
import { useAuthStore } from "./auth-store";
import { useContributionsStore } from "./contributions-store";
import { useNotificationsStore } from "./notifications-store";
import { usePreferencesStore } from "./preferences-store";
import { useRequestsStore } from "./requests-store";
import { useSavedStore } from "./saved-store";
import { useSwipeStore } from "./swipe-store";

export const persistedStores = [
  useAuthStore,
  useRequestsStore,
  useSwipeStore,
  useSavedStore,
  useContributionsStore,
  useNotificationsStore,
  usePreferencesStore,
  useAdminStore,
] as const;

/** Clears every demo store back to its seed state (and signs the user out). */
export function resetAllDemoData() {
  useRequestsStore.getState().reset();
  useSwipeStore.getState().reset();
  useSavedStore.getState().reset();
  useContributionsStore.getState().reset();
  useNotificationsStore.getState().reset();
  usePreferencesStore.getState().reset();
  useAdminStore.getState().reset();
  useAuthStore.getState().reset();
}

export {
  useAdminStore,
  useAuthStore,
  useContributionsStore,
  useNotificationsStore,
  usePreferencesStore,
  useRequestsStore,
  useSavedStore,
  useSwipeStore,
};
