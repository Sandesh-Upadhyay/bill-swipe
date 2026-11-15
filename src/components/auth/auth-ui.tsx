"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signInWithGoogleAction } from "@/app/auth/actions";

/** Messages for ?error= / ?reason= codes set by the auth callbacks and guards. */
const MESSAGES: Record<string, { tone: "error" | "info" | "success"; text: string }> = {
  expired: { tone: "info", text: "Your session expired. Please log in again." },
  link_expired: { tone: "error", text: "That link has expired. Request a new one below." },
  link_invalid: { tone: "error", text: "That link isn't valid or was already used. Please try again." },
  oauth_cancelled: { tone: "info", text: "Google sign-in was cancelled." },
  oauth_failed: { tone: "error", text: "Google sign-in didn't complete. Please try again." },
  suspended: { tone: "error", text: "This account has been suspended. Contact support if you think this is a mistake." },
  not_configured: { tone: "info", text: "Accounts aren't available yet. You can still explore with a demo account." },
  password_updated: { tone: "success", text: "Your password was updated. Please log in with your new password." },
};

export function authMessageFor(code: string | null) {
  return code ? (MESSAGES[code] ?? null) : null;
}

export function AuthAlert({ tone, children, className }: { tone: "error" | "info" | "success"; children: React.ReactNode; className?: string }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border p-3 text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "info" && "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

/** Starts Google OAuth via a Server Action (PKCE verifier is stored in an httpOnly cookie). */
export function GoogleButton({ next, label = "Continue with Google" }: { next?: string; label?: string }) {
  const [pending, startTransition] = React.useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          // On success the action redirects the browser to Google; we only get here on failure.
          const res = await signInWithGoogleAction(next);
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <GoogleMark />} {label}
    </Button>
  );
}
