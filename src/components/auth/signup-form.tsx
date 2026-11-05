"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import type { CountryCode } from "@/lib/types";
import { COUNTRIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { FieldError, Input, NativeSelect } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { DemoAuthNotice } from "./demo-notice";

const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]];

const schema = z
  .object({
    name: z.string().trim().min(2, "Enter your display name").max(60, "Keep it under 60 characters"),
    email: z.email("Enter a valid email address"),
    country: z.enum(COUNTRY_CODES, { message: "Choose your country" }),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[0-9]/, "Include at least one number")
      .regex(/[A-Za-z]/, "Include at least one letter"),
    confirm: z.string(),
    terms: z.literal(true, { message: "Please accept the demo terms to continue" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
type Values = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);
  const upsertUser = useAdminStore((s) => s.upsertUser);
  const seedWelcome = useNotificationsStore((s) => s.seedWelcome);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirm: "", terms: undefined as unknown as true },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 600));
    const res = signup({ name: v.name, email: v.email, country: v.country });
    if (!res.ok) {
      form.setError("email", { message: res.error });
      return;
    }
    const s = res.session;
    upsertUser({
      id: s.userId,
      name: s.name,
      email: s.email,
      role: s.role,
      country: s.country,
      bio: "",
      memberSince: s.memberSince,
      image: s.image,
      status: "active",
    });
    seedWelcome(s.userId, s.name);
    toast.success("Demo account created", { description: "Let's set up your profile." });
    router.push("/onboarding");
  };

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <span className="w-fit rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">Demo authentication</span>
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join as a donor or requester. You&apos;ll choose your role in the next step.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="su-name">Display name</Label>
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
              aria-describedby="su-password-err"
              {...form.register("password")}
            />
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
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register("terms")} />
          <span>I understand BillSwipe is a prototype with fictional data, and that no real money is collected or transferred.</span>
        </label>
        <FieldError message={errors.terms?.message} />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus />} Create demo account
        </Button>
      </form>

      <DemoAuthNotice />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
