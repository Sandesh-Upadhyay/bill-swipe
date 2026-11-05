"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Ban, HandHeart, LogOut, Monitor, Moon, RotateCcw, ShieldCheck, Sun, Trash2, FileHeart } from "lucide-react";
import type { Role, Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/basic";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Label, Switch } from "@/components/ui/primitives";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { dashboardPath } from "@/components/layout/user-menu";
import { resetAllDemoData } from "@/store";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { usePreferencesStore, type ThemePreference } from "@/store/preferences-store";
import { useRequestsStore } from "@/store/requests-store";
import { useBlockedIds, useSavedStore } from "@/store/saved-store";
import { useSwipeStore } from "@/store/swipe-store";

function OptionButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:size-4",
        active ? "border-primary bg-primary/8 font-medium ring-1 ring-primary" : "hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function RoleCard({ session }: { session: Session }) {
  const setRole = useAuthStore((s) => s.setRole);
  const setUserRole = useAdminStore((s) => s.setUserRole);
  const router = useRouter();
  const [pending, setPending] = React.useState<Role | null>(null);

  if (session.role === "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account role</CardTitle>
          <CardDescription>You&apos;re using the demo moderator account. Sign in as a donor or requester demo account to try those experiences.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const options: { role: Role; label: string; hint: string; icon: typeof HandHeart }[] = [
    { role: "donor", label: "Donor", hint: "Discover and support requests", icon: HandHeart },
    { role: "requester", label: "Requester", hint: "Share bills and track progress", icon: FileHeart },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account role</CardTitle>
        <CardDescription>Switch between experiences at any time in this demo.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.role}
            type="button"
            aria-pressed={session.role === o.role}
            onClick={() => session.role !== o.role && setPending(o.role)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              session.role === o.role ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted",
            )}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <o.icon className="size-5" />
            </span>
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </span>
          </button>
        ))}
      </CardContent>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Switch to ${pending ?? ""} mode?`}
        description="Your demo data stays intact. You'll be taken to the matching dashboard."
        confirmLabel="Switch role"
        onConfirm={() => {
          if (!pending) return;
          setRole(pending);
          setUserRole(session.userId, pending);
          toast.success(`You're now in ${pending} mode`);
          router.push(dashboardPath(pending));
          setPending(null);
        }}
      />
    </Card>
  );
}

export function PreferencesCard() {
  const theme = usePreferencesStore((s) => s.theme);
  const setThemePref = usePreferencesStore((s) => s.setTheme);
  const currencyDisplay = usePreferencesStore((s) => s.currencyDisplay);
  const setCurrencyDisplay = usePreferencesStore((s) => s.setCurrencyDisplay);
  const showSwipeHints = usePreferencesStore((s) => s.showSwipeHints);
  const setShowSwipeHints = usePreferencesStore((s) => s.setShowSwipeHints);
  const { setTheme } = useTheme();

  const chooseTheme = (t: ThemePreference) => {
    setThemePref(t);
    setTheme(t);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Saved locally in this browser.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            <OptionButton active={theme === "light"} onClick={() => chooseTheme("light")}>
              <Sun /> Light
            </OptionButton>
            <OptionButton active={theme === "dark"} onClick={() => chooseTheme("dark")}>
              <Moon /> Dark
            </OptionButton>
            <OptionButton active={theme === "system"} onClick={() => chooseTheme("system")}>
              <Monitor /> System
            </OptionButton>
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Currency display</legend>
          <div className="grid grid-cols-2 gap-2">
            <OptionButton active={currencyDisplay === "original"} onClick={() => setCurrencyDisplay("original")}>
              Original only
            </OptionButton>
            <OptionButton active={currencyDisplay === "usd"} onClick={() => setCurrencyDisplay("usd")}>
              Show ≈ USD
            </OptionButton>
          </div>
          <p className="text-xs text-muted-foreground">USD equivalents use fixed, fictional demo rates.</p>
        </fieldset>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="swipe-hints">Swipe hints</Label>
            <p className="text-xs text-muted-foreground">Show gesture tips in Discover.</p>
          </div>
          <Switch id="swipe-hints" checked={showSwipeHints} onCheckedChange={setShowSwipeHints} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SafetyCard({ session }: { session: Session }) {
  const blocked = useBlockedIds(session.userId);
  const unblock = useSavedStore((s) => s.unblock);
  const users = useAdminStore((s) => s.users);
  const requests = useRequestsStore((s) => s.requests);

  const lookup = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (u) return { name: u.name, image: u.image };
    const r = requests.find((x) => x.userId === id);
    return { name: r?.name ?? "Unknown user", image: r?.image ?? id };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Safety
        </CardTitle>
        <CardDescription>People you&apos;ve blocked won&apos;t appear in Discover or Explore.</CardDescription>
      </CardHeader>
      <CardContent>
        {blocked.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
            <Ban className="size-4" /> You haven&apos;t blocked anyone.
          </p>
        ) : (
          <ul className="grid gap-2">
            {blocked.map((id) => {
              const u = lookup(id);
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl border p-3">
                  <DemoAvatar seed={u.image} label={u.name} className="size-9" />
                  <span className="flex-1 text-sm font-medium">{u.name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      unblock(session.userId, id);
                      toast.success(`${u.name} unblocked`);
                    }}
                  >
                    Unblock
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DangerZoneCard({ session }: { session: Session }) {
  const resetUser = useSwipeStore((s) => s.resetUser);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Demo data</CardTitle>
        <CardDescription>Everything is stored only in this browser&apos;s LocalStorage.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Reset my swipes</p>
            <p className="text-xs text-muted-foreground">Bring every request back into your Discover deck.</p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="outline" size="sm">
                <RotateCcw /> Reset swipes
              </Button>
            }
            title="Reset your swipe history?"
            description="Your skipped and interested requests will return to the Discover deck. Saved requests are kept."
            confirmLabel="Reset swipes"
            onConfirm={() => {
              resetUser(session.userId);
              toast.success("Swipe history cleared");
            }}
          />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End this demo session. Your demo data stays on this device.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Navigate away first so the auth guard doesn't bounce to /login
              router.push("/");
              setTimeout(() => {
                logout();
                toast.success("Signed out of the demo session");
              }, 250);
            }}
          >
            <LogOut /> Sign out
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-destructive">Reset all demo data</p>
            <p className="text-xs text-muted-foreground">Restores the original fictional data and signs you out.</p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="destructive" size="sm">
                <Trash2 /> Reset everything
              </Button>
            }
            title="Reset all demo data?"
            description="This clears your session, swipes, saved requests, simulated contributions, notifications and any requests you created, then restores the seed data."
            confirmLabel="Reset all data"
            destructive
            onConfirm={() => {
              router.push("/");
              setTimeout(() => {
                resetAllDemoData();
                toast.success("Demo data reset");
              }, 250);
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
