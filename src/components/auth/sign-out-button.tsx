"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import { useAuthStore } from "@/store/auth-store";

/** Signs out of a real (Supabase) or demo session and returns to the home page. */
export function useSignOut() {
  const router = useRouter();
  return React.useCallback(async () => {
    const session = useAuthStore.getState().session;
    if (session?.source === "supabase") {
      const res = await signOutAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      useAuthStore.getState().endSupabaseSession();
      toast.success("You've been signed out");
    } else {
      useAuthStore.getState().logout();
      toast.success("Signed out of the demo session");
    }
    router.push("/");
    router.refresh();
  }, [router]);
}

export function SignOutButton({ variant = "default" }: { variant?: "default" | "outline" | "ghost" }) {
  const signOut = useSignOut();
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut();
        setPending(false);
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />} Sign out
    </Button>
  );
}
