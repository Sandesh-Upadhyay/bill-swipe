import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, TimerOff } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/**
 * Reached from the password-recovery email via /auth/callback or /auth/confirm, which create a
 * short-lived recovery session. Without that session the link has expired or was already used.
 */
export default async function ResetPasswordPage() {
  const viewer = await getViewer();

  if (viewer.kind !== "user") {
    return (
      <div className="grid justify-items-center gap-5 text-center" role="alert">
        <span className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <TimerOff className="size-8" />
        </span>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">This reset link has expired</h1>
          <p className="text-sm text-muted-foreground">
            Password reset links work once and only for a short time. Request a new one and open it on this device.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/login">Back to log in</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid gap-2">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Setting a new password for <strong className="text-foreground">{viewer.profile.email || "your account"}</strong>.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
