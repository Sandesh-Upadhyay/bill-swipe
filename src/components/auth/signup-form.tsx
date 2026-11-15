"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { PASSWORD_MIN, signupSchema, type SignupInput } from "@/lib/auth/validation";
import { signUpAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, NativeSelect } from "@/components/ui/basic";
import { Separator } from "@/components/ui/primitives";
import { Label } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { DemoAuthNotice } from "./demo-notice";
import { AuthAlert, GoogleButton } from "./auth-ui";
import { safeNext } from "./auth-helpers";

/** Email awaiting confirmation, kept in sessionStorage (not the URL) for the check-email screen. */
export const PENDING_EMAIL_KEY = "bs_pending_email";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const real = isSupabaseConfigured;
  const signup = useAuthStore((s) => s.signup);
  const adopt = useAuthStore((s) => s.adoptSupabaseSession);
  const upsertUser = useAdminStore((s) => s.upsertUser);
  const seedWelcome = useNotificationsStore((s) => s.seedWelcome);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "", terms: undefined as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: SignupInput) => {
    setFormError(null);
    if (real) {
      const res = await signUpAction({ ...v, next: next ?? undefined });
      if (!res.ok) {
        if (res.field === "password" || res.field === "email") form.setError(res.field, { message: res.error });
        else setFormError(res.error);
        return;
      }
      if (res.needsConfirmation) {
        try {
          sessionStorage.setItem(PENDING_EMAIL_KEY, v.email);
        } catch {
          /* private mode: the check-email screen asks for the address instead */
        }
        router.push("/check-email");
        return;
      }
      if (res.profile) adopt(res.profile);
      toast.success("Account created", { description: "Let's set up your profile." });
      router.push(res.next);
      router.refresh();
      return;
    }

    // Demo mode (Supabase not configured): browser-only fictional account.
    await new Promise((r) => setTimeout(r, 600));
    const res = signup({ name: v.name, email: v.email, country: v.country });
    if (!res.ok) {
      form.setError("email", { message: res.error });
      return;
    }
    const s = res.session;
    upsertUser({ id: s.userId, name: s.name, email: s.email, role: s.role, country: s.country, bio: "", memberSince: s.memberSince, image: s.image, status: "active" });
    seedWelcome(s.userId, s.name);
    toast.success("Demo account created", { description: "Let's set up your profile." });
    router.push("/onboarding");
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <div className="grid gap-2">
        <span className="w-fit rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">
          {real ? "Create your account" : "Demo authentication"}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          One account lets you both support bills and request help. You&apos;ll choose where to start in the next step.
        </p>
      </div>

      {real && (
        <>
          <GoogleButton next={next ?? undefined} label="Sign up with Google" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" /> or with email <Separator className="flex-1" />
          </div>
        </>
      )}

      {formError && <AuthAlert tone="error">{formError}</AuthAlert>}

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" aria-busy={isSubmitting}>
        <div className="grid gap-2">
          <Label htmlFor="su-name">Full name</Label>
          <Input id="su-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="su-name-err" {...form.register("name")} />
          <FieldError id="su-name-err" message={errors.name?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="su-email">Email</Label>
            <Input
              id="su-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!errors.email}
              aria-describedby="su-email-err"
              {...form.register("email")}
            />
            <FieldError id="su-email-err" message={errors.email?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="su-country">Country</Label>
            <NativeSelect id="su-country" defaultValue="" aria-invalid={!!errors.country} aria-describedby="su-country-err" {...form.register("country")}>
              <option value="" disabled>
                Select…
              </option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError id="su-country-err" message={errors.country?.message} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="su-password">Password</Label>
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              aria-describedby="su-password-err su-password-hint"
              {...form.register("password")}
            />
            {!errors.password && (
              <p id="su-password-hint" className="text-xs text-muted-foreground">
                At least {PASSWORD_MIN} characters, with a letter and a number.
              </p>
            )}
            <FieldError id="su-password-err" message={errors.password?.message} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input
              id="su-confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirm}
              aria-describedby="su-confirm-err"
              {...form.register("confirm")}
            />
            <FieldError id="su-confirm-err" message={errors.confirm?.message} />
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            aria-describedby="su-terms-err"
            aria-invalid={!!errors.terms}
            {...form.register("terms")}
          />
          <span>
            I agree to BillSwipe&apos;s terms and understand that requests are reviewed by moderators and that contributions are simulated during
            early access. <Link href="/faq" className="font-medium text-primary hover:underline">Read the FAQ</Link>
          </span>
        </label>
        <FieldError id="su-terms-err" message={errors.terms?.message} />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />}{" "}
          {isSubmitting ? "Creating account…" : real ? "Create account" : "Create demo account"}
        </Button>
      </form>

      {!real && <DemoAuthNotice />}

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
