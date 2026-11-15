"use client";

import * as React from "react";
import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";
import { hasDemoCookie, setDemoCookie } from "@/lib/auth/demo-cookie";
import { getMyProfileAction } from "@/app/auth/actions";
import { useAuthStore } from "@/store/auth-store";
import { useHydrated } from "@/store/hydration-store";

/** True once the first Supabase session check has finished (always true without Supabase). */
export const useAuthSyncStore = create<{ ready: boolean; setReady: () => void }>((set) => ({
  ready: !isSupabaseConfigured,
  setReady: () => set({ ready: true }),
}));
export const useAuthSyncReady = () => useAuthSyncStore((s) => s.ready);

/**
 * Keeps the app's session in step with Supabase Auth.
 *
 * The browser only learns THAT something changed (onAuthStateChange); who the user is, their
 * status and admin flag always come from the server (getMyProfileAction verifies the JWT with
 * getClaims and reads the profile under RLS). Demo sessions are left alone unless a real
 * session appears, which always takes precedence.
 */
export function AuthSync() {
  const hydrated = useHydrated();

  React.useEffect(() => {
    if (!hydrated) return;

    // Demo sessions saved before Phase 2 need the demo marker so server guards let them through.
    const stored = useAuthStore.getState().session;
    if (stored && stored.source !== "supabase" && !hasDemoCookie()) setDemoCookie(true);

    if (!isSupabaseConfigured) return;

    let active = true;
    const supabase = createClient();

    const refresh = async () => {
      const res = await getMyProfileAction();
      if (!active) return;
      if (res.ok) useAuthStore.getState().adoptSupabaseSession(res.profile);
      else if (res.code === "session_expired") useAuthStore.getState().endSupabaseSession();
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.getState().endSupabaseSession();
        return;
      }
      const hadRealSession = useAuthStore.getState().session?.source === "supabase";
      if (event === "INITIAL_SESSION") {
        // A stored real session with no Supabase session means it expired or was revoked.
        if (session || hadRealSession) void refresh().finally(() => useAuthSyncStore.getState().setReady());
        else useAuthSyncStore.getState().setReady();
        return;
      }
      if (session && (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED")) void refresh();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [hydrated]);

  return null;
}
