"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, MailCheck, RotateCw } from "lucide-react";
import { resendConfirmationAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { PENDING_EMAIL_KEY } from "./signup-form";

const RESEND_COOLDOWN_S = 60;

/** Shown after sign-up when Supabase requires email confirmation. */
function readPendingEmail() {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return ""; // sessionStorage unavailable: the user can type the address
  }
}
const noopSubscribe = () => () => {};

export function CheckEmail() {
  // Read the address saved at sign-up without setting state in an effect (and SSR-safe).
  const stored = React.useSyncExternalStore(noopSubscribe, readPendingEmail, () => "");
  const [typed, setTyped] = React.useState("");
  const known = stored !== "";
  const email = known ? stored : typed;
  const setEmail = setTyped;
  const [error, setError] = React.useState<string>();
  const [pending, setPending] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setError(undefined);
    setPending(true);
    const res = await resendConfirmationAction(email);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success("Confirmation email sent", { description: "If the address needs confirming, a new link is on its way." });
    setCooldown(RESEND_COOLDOWN_S);
  };

  return (
    <div className="grid justify-items-center gap-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-primary/12 text-primary">
        <MailCheck className="size-8" />
      </span>
      <div className="grid gap-2" role="status" aria-live="polite">
        <h1 className="text-2xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link{known ? (
            <>
              {" "}to <strong className="text-foreground">{email}</strong>
            </>
          ) : null}
          . Open it on this device to activate your account. If you already have an account with this email, just log in instead.
        </p>
      </div>

      <div className="grid w-full gap-3 rounded-2xl border bg-card p-4 text-left shadow-soft">
        <p className="text-sm font-medium">Didn&apos;t get the email?</p>
        <p className="text-xs text-muted-foreground">Check your spam folder. Links expire after a while, so you can request a new one.</p>
        {!known && (
          <div className="grid gap-2">
            <Label htmlFor="ce-email">Email</Label>
            <Input id="ce-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="ce-email-err" />
          </div>
        )}
        <FieldError id="ce-email-err" message={error} />
        <Button variant="outline" onClick={resend} disabled={pending || cooldown > 0 || !email}>
          {pending ? <Loader2 className="animate-spin" /> : <RotateCw />}
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend confirmation email"}
        </Button>
      </div>

      <Button asChild className="w-full">
        <Link href="/login">Go to log in</Link>
      </Button>
    </div>
  );
}
