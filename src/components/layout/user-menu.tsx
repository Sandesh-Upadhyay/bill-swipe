"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, LayoutDashboard, LogOut, Shield, Sparkles, User } from "lucide-react";
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
  if (!session) return null;
  return (
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
  );
}
