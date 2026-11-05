"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { DemoAuthNotice } from "./demo-notice";

const schema = z.object({ email: z.email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 700));
    setSent(v.email);
  };

  if (sent) {
    return (
      <div className="grid justify-items-center gap-5 text-center" role="status">
        <span className="grid size-16 place-items-center rounded-full bg-primary/12 text-primary">
          <MailCheck className="size-8" />
        </span>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Check your inbox (in the live product)</h1>
          <p className="text-sm text-muted-foreground">
            In the live product we&apos;d email a reset link to <strong className="text-foreground">{sent}</strong>.{" "}
            <strong className="text-foreground">Nothing was sent</strong> — this is a demo, and demo accounts don&apos;t need a password.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => setSent(null)}>
            Try another email
          </Button>
          <Button asChild className="flex-1">
            <Link href="/login">Back to log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-7">
      <Link href="/login" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to log in
      </Link>
      <div className="grid gap-2">
        <span className="w-fit rounded-full bg-primary/12 px-2.5 py-1 text-xs font-medium text-primary">Demo authentication</span>
        <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter the email linked to your account and we&apos;ll simulate sending a reset link.</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="fp-email">Email</Label>
          <Input id="fp-email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby="fp-email-err" {...form.register("email")} />
          <FieldError id="fp-email-err" message={errors.email?.message} />
        </div>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Send reset link
        </Button>
      </form>
      <DemoAuthNotice>
        <strong>Simulated.</strong> No email is sent. Demo accounts don&apos;t use real passwords.
      </DemoAuthNotice>
    </div>
  );
}
