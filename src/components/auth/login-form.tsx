"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, FileText, HandHeart, Loader2, LogIn, MailCheck, ShieldCheck } from "lucide-react";
import type { Session } from "@/lib/types";
import { DEMO_ACCOUNTS } from "@/lib/data/users";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loginSchema, type LoginInput } from "@/lib/auth/validation";
import { resendConfirmationAction, signInAction, signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/basic";
import { Checkbox, Label, Separator } from "@/components/ui/primitives";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useHydrated } from "@/store/hydration-store";
import { DemoAuthNotice } from "./demo-notice";
import { AuthAlert, GoogleButton, authMessageFor } from "./auth-ui";
import { defaultRouteFor, safeNext } from "./auth-helpers";

const QUICK = [
  { key: "donor" as const, icon: HandHeart, label: "Donor", hint: "Swipe, save and simulate contributions" },
  { key: "requester" as const, icon: FileText, label: "Requester", hint: "Manage bill requests" },
  { key: "admin" as const, icon: ShieldCheck, label: "Admin", hint: "Moderation & analytics" },
];

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const notice = authMessageFor(params.get("error") ?? params.get("reason"));
  const hydrated = useHydrated();
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const real = isSupabaseConfigured;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid gap-2">
        <span className="w-fit rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
          {real ? "Secure sign-in" : "Demo authentication"}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          {real
            ? "Log in to your BillSwipe account, or explore with a demo profile. Demo data stays in this browser."
            : "Log in with a demo account email, or jump straight in with a one-click demo profile."}
        </p>
      </div>

      {notice && <AuthAlert tone={notice.tone}>{notice.text}</AuthAlert>}

      {hydrated && session && (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
          <DemoAvatar seed={session.image} className="size-10" label={session.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Signed in as {session.name}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {session.role} · {session.source === "supabase" ? "account" : "demo"}
            </p>
          </div>
          <Button size="sm" onClick={() => router.push(next ?? defaultRouteFor(session.role))}>
            Continue <ArrowRight />
          </Button>
        </div>
      )}

      {real ? <AccountLogin next={next} /> : <DemoEmailLogin next={next} />}

      <QuickDemoAccounts next={next} real={real} />

      <p className="text-center text-sm text-muted-foreground">
        New to BillSwipe?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary hover:underline">
          {real ? "Create an account" : "Create a demo account"}
        </Link>
      </p>
    </div>
  );
}

/* ---------------- Real Supabase login ---------------- */

function AccountLogin({ next }: { next: string | null }) {
  const router = useRouter();
  const adopt = useAuthStore((s) => s.adoptSupabaseSession);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: LoginInput) => {
    setFormError(null);
    setUnconfirmedEmail(null);
    const res = await signInAction({ ...v, next: next ?? undefined });
    if (!res.ok) {
      if (res.code === "email_not_confirmed") setUnconfirmedEmail(String(v.email));
      setFormError(res.error);
      form.setValue("password", "");
      return;
    }
    adopt(res.profile);
    toast.success(`Welcome back, ${res.profile.displayName.split(" ")[0]}`);
    router.push(res.next);
    router.refresh();
  };

  const resend = async () => {
    if (!unconfirmedEmail) return;
    setResending(true);
    const res = await resendConfirmationAction(unconfirmedEmail);
    setResending(false);
    if (res.ok) toast.success("If that address needs confirming, we've sent a new link.");
    else toast.error(res.error);
  };

  return (
    <div className="grid gap-4">
      <GoogleButton next={next ?? undefined} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> or with email <Separator className="flex-1" />
      </div>

      {formError && (
        <AuthAlert tone="error">
          <p>{formError}</p>
          {unconfirmedEmail && (
            <Button type="button" variant="link" size="sm" className="h-auto px-0 text-destructive underline" onClick={resend} disabled={resending}>
              {resending ? <Loader2 className="animate-spin" /> : <MailCheck />} Resend confirmation email
            </Button>
          )}
        </AuthAlert>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" aria-busy={isSubmitting}>
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={!!errors.email}
            aria-describedby="login-email-err"
            {...form.register("email")}
          />
          <FieldError id="login-email-err" message={errors.email?.message} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby="login-password-err"
            {...form.register("password")}
          />
          <FieldError id="login-password-err" message={errors.password?.message} />
        </div>
        <label htmlFor="login-remember" className="flex items-center gap-2.5 text-sm">
          <Checkbox
            id="login-remember"
            checked={form.watch("remember") !== false}
            onCheckedChange={(v) => form.setValue("remember", v === true)}
          />
          Keep me signed in on this device
        </label>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />} {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}

/* ---------------- Demo-only email login (when Supabase isn't configured) ---------------- */

const demoSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type DemoValues = z.infer<typeof demoSchema>;

function useFinishDemo(next: string | null) {
  const router = useRouter();
  const seedWelcome = useNotificationsStore((s) => s.seedWelcome);
  return (s: Session) => {
    seedWelcome(s.userId, s.name);
    toast.success(`Welcome back, ${s.name.split(" ")[0]}`, { description: "You're using a demo session." });
    if (!s.onboarded) router.push("/onboarding");
    else router.push(next ?? defaultRouteFor(s.role));
  };
}

function DemoEmailLogin({ next }: { next: string | null }) {
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const finish = useFinishDemo(next);
  const form = useForm<DemoValues>({ resolver: zodResolver(demoSchema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: DemoValues) => {
    await new Promise((r) => setTimeout(r, 500));
    const res = loginWithEmail(v.email);
    if (!res.ok) {
      form.setError("email", { message: res.error });
      return;
    }
    finish(res.session);
  };

  return (
    <div className="grid gap-4">
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={DEMO_ACCOUNTS.donor.email}
            aria-invalid={!!errors.email}
            aria-describedby="login-email-err"
            {...form.register("email")}
          />
          <FieldError id="login-email-err" message={errors.email?.message} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Any 6+ characters"
            aria-invalid={!!errors.password}
            aria-describedby="login-password-err"
            {...form.register("password")}
          />
          <FieldError id="login-password-err" message={errors.password?.message} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn />} Log in
        </Button>
      </form>
      <DemoAuthNotice>
        <strong>Demo authentication.</strong> Passwords are never stored or checked — any 6+ characters works with a demo account email. Try{" "}
        <span className="font-mono">{DEMO_ACCOUNTS.requester.email}</span>.
      </DemoAuthNotice>
    </div>
  );
}

/* ---------------- One-click demo profiles (always available) ---------------- */

function QuickDemoAccounts({ next, real }: { next: string | null; real: boolean }) {
  const login = useAuthStore((s) => s.login);
  const session = useAuthStore((s) => s.session);
  const finish = useFinishDemo(next);
  const [quickLoading, setQuickLoading] = React.useState<string | null>(null);

  const quickLogin = async (key: keyof typeof DEMO_ACCOUNTS) => {
    setQuickLoading(key);
    // Never mix a real account with demo data: sign the real account out first.
    if (session?.source === "supabase") {
      await signOutAction();
      useAuthStore.getState().endSupabaseSession();
    }
    await new Promise((r) => setTimeout(r, 300));
    const res = login(DEMO_ACCOUNTS[key] as Session);
    if (!res.ok) {
      setQuickLoading(null);
      toast.error(res.error);
      return;
    }
    finish(res.session);
  };

  return (
    <div className="grid gap-2.5">
      {real && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" /> or explore without an account <Separator className="flex-1" />
        </div>
      )}
      <p className="text-sm font-medium">{real ? "Demo profiles (fictional data, this browser only)" : "Quick demo accounts"}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {QUICK.map((q) => {
          const acct = DEMO_ACCOUNTS[q.key];
          return (
            <button
              key={q.key}
              type="button"
              disabled={!!quickLoading}
              onClick={() => quickLogin(q.key)}
              className="group grid gap-2 rounded-2xl border bg-card p-3.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift disabled:opacity-60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-label={`Explore as demo ${q.label}, ${acct.name}`}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-8 place-items-center rounded-xl bg-primary/12 text-primary">
                  {quickLoading === q.key ? <Loader2 className="size-4 animate-spin" /> : <q.icon className="size-4" />}
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{q.label}</p>
                <p className="text-xs text-muted-foreground">{acct.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
