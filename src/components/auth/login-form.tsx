"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, HandHeart, Loader2, LogIn, ShieldCheck, FileText } from "lucide-react";
import type { Session } from "@/lib/types";
import { DEMO_ACCOUNTS } from "@/lib/data/users";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/basic";
import { Label, Separator } from "@/components/ui/primitives";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useHydrated } from "@/store/hydration-store";
import { DemoAuthNotice } from "./demo-notice";
import { defaultRouteFor, safeNext } from "./auth-helpers";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type Values = z.infer<typeof schema>;

const QUICK = [
  { key: "donor" as const, icon: HandHeart, label: "Donor", hint: "Swipe, save and simulate contributions" },
  { key: "requester" as const, icon: FileText, label: "Requester", hint: "Manage bill requests" },
  { key: "admin" as const, icon: ShieldCheck, label: "Admin", hint: "Moderation & analytics" },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const hydrated = useHydrated();
  const session = useAuthStore((s) => s.session);
  const login = useAuthStore((s) => s.login);
  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const seedWelcome = useNotificationsStore((s) => s.seedWelcome);
  const [quickLoading, setQuickLoading] = React.useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const finish = (s: Session) => {
    seedWelcome(s.userId, s.name);
    toast.success(`Welcome back, ${s.name.split(" ")[0]}`, { description: "You're using a demo session." });
    if (!s.onboarded) router.push("/onboarding");
    else router.push(next ?? defaultRouteFor(s.role));
  };

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 500));
    const res = loginWithEmail(v.email);
    if (!res.ok) {
      form.setError("email", { message: res.error });
      return;
    }
    finish(res.session);
  };

  const quickLogin = async (key: keyof typeof DEMO_ACCOUNTS) => {
    setQuickLoading(key);
    await new Promise((r) => setTimeout(r, 350));
    const s = DEMO_ACCOUNTS[key] as Session;
    login(s);
    finish(s);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid gap-2">
        <span className="w-fit rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">Demo authentication</span>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Log in with a demo account email, or jump straight in with a one-click demo profile.
        </p>
      </div>

      {hydrated && session && (
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
          <DemoAvatar seed={session.image} className="size-10" label={session.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Signed in as {session.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{session.role} · demo</p>
          </div>
          <Button size="sm" onClick={() => router.push(next ?? defaultRouteFor(session.role))}>
            Continue <ArrowRight />
          </Button>
        </div>
      )}

      <div className="grid gap-2.5">
        <p className="text-sm font-medium">Quick demo accounts</p>
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
                aria-label={`Log in as demo ${q.label}, ${acct.name}`}
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

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" /> or with email <Separator className="flex-1" />
      </div>

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
        <strong>Demo authentication.</strong> Passwords are never stored or checked — any 6+ characters works with a demo account
        email. Try <span className="font-mono">{DEMO_ACCOUNTS.requester.email}</span>.
      </DemoAuthNotice>

      <p className="text-center text-sm text-muted-foreground">
        New to BillSwipe?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium text-primary hover:underline">
          Create a demo account
        </Link>
      </p>
    </div>
  );
}
