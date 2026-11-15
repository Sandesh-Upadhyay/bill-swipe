import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, Session } from "@/lib/types";
import type { AuthProfile } from "@/lib/auth/profile";
import { setDemoCookie } from "@/lib/auth/demo-cookie";
import { DEMO_ACCOUNTS } from "@/lib/data/users";
import { persistOptions } from "./persist";
import { useAdminStore } from "./admin-store";

/** Maps a server-verified Supabase profile onto the app's session shape. */
export function sessionFromProfile(p: AuthProfile): Session {
  return {
    userId: p.id,
    name: p.displayName,
    email: p.email,
    role: p.mode,
    country: p.country ?? "US",
    bio: p.bio,
    image: p.id,
    memberSince: p.createdAt,
    onboarded: p.onboarded,
    source: "supabase",
    status: p.status,
    isAdmin: p.isAdmin,
    avatarUrl: p.avatarUrl,
    preferredCurrency: p.preferredCurrency,
  };
}

type ProfilePatch = Partial<Pick<Session, "name" | "country" | "bio" | "image" | "role">>;
type LoginResult = { ok: true; session: Session } | { ok: false; error: string };

export const SUSPENDED_MESSAGE = "This demo account has been suspended by a moderator. Try another demo account.";

/** Applies moderator decisions (suspension, role changes made in the admin panel) to a session at login. */
function applyModeration(session: Session): LoginResult {
  const record = useAdminStore.getState().users.find((u) => u.id === session.userId);
  if (record?.status === "suspended") return { ok: false, error: SUSPENDED_MESSAGE };
  return { ok: true, session: record && record.role !== session.role ? { ...session, role: record.role } : session };
}

interface AuthState {
  session: Session | null;
  /** Demo accounts created through sign-up in this browser (no passwords stored). */
  accounts: Session[];
  login: (session: Session) => LoginResult;
  loginWithEmail: (email: string) => LoginResult;
  signup: (input: { name: string; email: string; country: Session["country"] }) =>
    | { ok: true; session: Session }
    | { ok: false; error: string };
  logout: () => void;
  updateProfile: (patch: ProfilePatch) => void;
  setRole: (role: Role) => void;
  /** Pushes a moderator's role change onto the live session and any locally created account. */
  syncModeratedUser: (userId: string, patch: Pick<Session, "role">) => void;
  completeOnboarding: () => void;
  /** Real account signed in (or refreshed): replaces any demo session. */
  adoptSupabaseSession: (profile: AuthProfile) => void;
  /** Real account signed out or expired: clears only a Supabase-sourced session. */
  endSupabaseSession: () => void;
  reset: () => void;
}

const builtIn = Object.values(DEMO_ACCOUNTS) as Session[];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      accounts: [],
      login: (session) => {
        // Demo accounts only. Real accounts sign in through Supabase (adoptSupabaseSession).
        const res = applyModeration({ ...session, source: "demo" });
        if (res.ok) {
          set({ session: res.session });
          setDemoCookie(true);
        }
        return res;
      },
      loginWithEmail: (email) => {
        const normalized = email.trim().toLowerCase();
        const match = [...builtIn, ...get().accounts].find((a) => a.email.toLowerCase() === normalized);
        if (!match) {
          return { ok: false, error: "No demo account uses that email. Try a quick demo account below or sign up." };
        }
        return get().login(match);
      },
      signup: ({ name, email, country }) => {
        const normalized = email.trim().toLowerCase();
        const exists = [...builtIn, ...get().accounts].some((a) => a.email.toLowerCase() === normalized);
        if (exists) return { ok: false, error: "An account with this email already exists in this demo. Try logging in." };
        const session: Session = {
          userId: `u_local_${Math.random().toString(36).slice(2, 9)}`,
          name: name.trim(),
          email: normalized,
          role: "donor",
          country,
          bio: "",
          image: normalized,
          memberSince: new Date().toISOString(),
          onboarded: false,
          source: "demo",
        };
        set((s) => ({ session, accounts: [...s.accounts, session] }));
        setDemoCookie(true);
        return { ok: true, session };
      },
      logout: () => {
        set({ session: null });
        setDemoCookie(false);
      },
      updateProfile: (patch) =>
        set((s) => {
          if (!s.session) return s;
          const session = { ...s.session, ...patch };
          return {
            session,
            accounts: s.accounts.map((a) => (a.userId === session.userId ? session : a)),
          };
        }),
      setRole: (role) => get().updateProfile({ role }),
      syncModeratedUser: (userId, patch) =>
        set((s) => ({
          session: s.session?.userId === userId ? { ...s.session, ...patch } : s.session,
          accounts: s.accounts.map((a) => (a.userId === userId ? { ...a, ...patch } : a)),
        })),
      completeOnboarding: () =>
        set((s) => {
          if (!s.session) return s;
          const session = { ...s.session, onboarded: true };
          return { session, accounts: s.accounts.map((a) => (a.userId === session.userId ? session : a)) };
        }),
      adoptSupabaseSession: (profile) => {
        set({ session: sessionFromProfile(profile) });
        setDemoCookie(false);
      },
      endSupabaseSession: () =>
        set((s) => (s.session?.source === "supabase" ? { session: null } : s)),
      reset: () => set({ session: null, accounts: [] }),
    }),
    persistOptions<AuthState, Pick<AuthState, "session" | "accounts">>("auth", (s) => ({
      // Real accounts: keep only display info in LocalStorage (no email). Tokens live in
      // Supabase's cookies, never here; the session is re-verified with the server on load.
      session: s.session?.source === "supabase" ? { ...s.session, email: "" } : s.session,
      accounts: s.accounts,
    })),
  ),
);

export const useSession = () => useAuthStore((s) => s.session);
