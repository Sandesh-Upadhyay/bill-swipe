"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, Check, LayoutDashboard, LogOut, Shield, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_INFO, RoleSwitchDialog, type SwitchableRole } from "./role-switch";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlays";
import { useAuthStore } from "@/store/auth-store";

export function dashboardPath(role?: string) {
  if (role === "admin") return "/admin";
  if (role === "requester") return "/dashboard/requester";
  return "/dashboard/donor";
}

export function UserMenu() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [pendingRole, setPendingRole] = React.useState<SwitchableRole | null>(null);
  if (!session) return null;
  return (
    <>
      <RoleSwitchDialog role={pendingRole} onOpenChange={(o) => !o && setPendingRole(null)} />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-full outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-[3px] focus-visible:ring-ring/60"
          aria-label="Open account menu"
        >
          <DemoAvatar seed={session.image} label={session.name} className="size-9 ring-2 ring-primary/30" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{session.name}</span>
            <span className="truncate">{session.email}</span>
            <span className="mt-1 w-fit rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
              {session.role} · demo
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {session.role !== "admin" && (
            <>
              <DropdownMenuLabel className="pb-1 text-[11px] font-semibold uppercase tracking-wider">Use BillSwipe as</DropdownMenuLabel>
              <div role="group" aria-label="Switch role" className="grid grid-cols-2 gap-1.5 px-1.5 pb-1.5">
                {(Object.keys(ROLE_INFO) as SwitchableRole[]).map((r) => {
                  const info = ROLE_INFO[r];
                  const active = session.role === r;
                  return (
                    <DropdownMenuItem
                      key={r}
                      aria-checked={active}
                      role="menuitemradio"
                      onSelect={(e) => {
                        if (active) {
                          e.preventDefault();
                          return;
                        }
                        setPendingRole(r);
                      }}
                      className={cn(
                        "flex-col items-start gap-1 rounded-xl border px-2.5 py-2 text-left",
                        active ? "border-primary bg-primary/10 text-foreground" : "border-transparent bg-muted/60",
                      )}
                    >
                      <span className="flex w-full items-center justify-between gap-1">
                        <info.icon className="size-4 text-primary" />
                        {active && <Check className="size-3.5 text-primary" aria-hidden />}
                      </span>
                      <span className="text-xs font-semibold">{info.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <Link href={dashboardPath(session.role)}>
              <LayoutDashboard /> Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/discover">
              <Sparkles /> Discover
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/saved">
              <Bookmark /> Saved & interested
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User /> Profile & settings
            </Link>
          </DropdownMenuItem>
          {session.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield /> Admin panel
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onSelect={() => {
              // Navigate away first so auth guards on the current page don't redirect to /login.
              router.push("/");
              setTimeout(() => {
                logout();
                toast.success("Signed out of the demo session");
              }, 250);
            }}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
