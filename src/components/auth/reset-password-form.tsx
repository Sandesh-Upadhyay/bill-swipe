"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { PASSWORD_MIN, resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth/validation";
import { updatePasswordAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { AuthAlert } from "./auth-ui";

export function ResetPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: ResetPasswordInput) => {
    setFormError(null);
    const res = await updatePasswordAction(v);
    if (!res.ok) {
      if (res.field === "password") form.setError("password", { message: res.error });
      else setFormError(res.error);
      return;
    }
    toast.success("Password updated", { description: "You're signed in with your new password." });
    router.push(res.next);
    router.refresh();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4" aria-busy={isSubmitting}>
      {formError && <AuthAlert tone="error">{formError}</AuthAlert>}
      <div className="grid gap-2">
        <Label htmlFor="rp-password">New password</Label>
        <Input
          id="rp-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby="rp-password-err rp-password-hint"
          {...form.register("password")}
        />
        {!errors.password && (
          <p id="rp-password-hint" className="text-xs text-muted-foreground">
            At least {PASSWORD_MIN} characters, with a letter and a number.
          </p>
        )}
        <FieldError id="rp-password-err" message={errors.password?.message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rp-confirm">Confirm new password</Label>
        <Input id="rp-confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} aria-describedby="rp-confirm-err" {...form.register("confirm")} />
        <FieldError id="rp-confirm-err" message={errors.confirm?.message} />
      </div>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />} {isSubmitting ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
