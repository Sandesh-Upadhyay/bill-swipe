"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Bookmark, FileHeart, HandHeart, History, UserRound } from "lucide-react";
import type { Role } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/overlays";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { dashboardPath } from "./user-menu";

export type SwitchableRole = Extract<Role, "donor" | "requester">;

export const ROLE_INFO: Record<SwitchableRole, { label: string; hint: string; icon: typeof HandHeart }> = {
  donor: { label: "Donor", hint: "Discover and support requests", icon: HandHeart },
  requester: { label: "Requester", hint: "Share bills and track progress", icon: FileHeart },
};

/**
 * Where to land after switching: an explicit `next`, otherwise stay on the current page unless
 * it's the other role's dashboard (then go to the new role's dashboard).
 */
function destinationFor(role: SwitchableRole, pathname: string, next?: string) {
  if (next && next.startsWith("/")) return next;
  if (pathname.startsWith("/dashboard")) return dashboardPath(role);
  return pathname;
}

/**
 * Switches the demo account between donor and requester. Saved requests, swipes, contributions,
 * notifications and profile details are keyed by user ID, so they are untouched by a switch.
 */
export function useRoleSwitch() {
  const router = useRouter();
  const pathname = usePathname();

  return React.useCallback(
    (role: SwitchableRole, opts: { next?: string; silent?: boolean } = {}) => {
      const { session, setRole } = useAuthStore.getState();
      if (!session || session.role === role || session.role === "admin") return;
      const previous = session.role as SwitchableRole;
      setRole(role);
      // Keep the admin directory in step without writing a moderator audit entry (this is a self-service switch).
      useAdminStore.getState().upsertUser({
        id: session.userId,
        name: session.name,
        email: session.email,
        role,
        country: session.country,
        bio: session.bio,
        memberSince: session.memberSince,
        image: session.image,
        status: "active",
      });
      const dest = destinationFor(role, pathname, opts.next);
      if (dest !== pathname) router.push(dest);
      if (!opts.silent) {
        toast.success(`You're now using BillSwipe as a ${ROLE_INFO[role].label.toLowerCase()}`, {
          description: "Your saved requests, activity and profile are unchanged.",
          action: {
            label: "Undo",
            onClick: () => {
              useAuthStore.getState().setRole(previous);
              useAdminStore.getState().upsertUser({ ...useAdminStore.getState().users.find((u) => u.id === session.userId)!, role: previous });
              if (dest !== pathname) router.push(pathname);
              toast(`Switched back to ${ROLE_INFO[previous].label.toLowerCase()}`);
            },
          },
        });
      }
    },
    [router, pathname],
  );
}

/** Confirmation dialog shown before switching roles. */
export function RoleSwitchDialog({
  role,
  onOpenChange,
  next,
}: {
  role: SwitchableRole | null;
  onOpenChange: (open: boolean) => void;
  next?: string;
}) {
  const switchRole = useRoleSwitch();
  const info = role ? ROLE_INFO[role] : null;
  return (
    <AlertDialog open={!!role} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <ArrowLeftRight className="size-5" />
          </span>
          <AlertDialogTitle>Switch to {info?.label.toLowerCase()} mode?</AlertDialogTitle>
        </div>
        <AlertDialogDescription asChild>
          <div className="grid gap-3 text-sm text-muted-foreground">
            <p>{info?.hint}. Everything you&apos;ve done so far stays exactly as it is:</p>
            <ul className="grid gap-2">
              <li className="flex items-center gap-2.5">
                <Bookmark className="size-4 text-primary" /> Saved and interested requests
              </li>
              <li className="flex items-center gap-2.5">
                <History className="size-4 text-primary" /> Swipes, simulated contributions and activity
              </li>
              <li className="flex items-center gap-2.5">
                <UserRound className="size-4 text-primary" /> Your profile details
              </li>
            </ul>
            <p className="text-xs">You can switch back any time from the account menu.</p>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => role && switchRole(role, { next })}>Switch to {info?.label.toLowerCase()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
