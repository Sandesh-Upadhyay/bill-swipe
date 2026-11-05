"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, FlaskConical, HandHeart, Loader2 } from "lucide-react";
import type { BillRequest, ContributionKind } from "@/lib/types";
import { PRESET_AMOUNTS } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { FieldError, Input, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useAuthStore } from "@/store/auth-store";
import { useContributionsStore } from "@/store/contributions-store";
import { useNotificationsStore } from "@/store/notifications-store";

export function ContributeDialog({
  request,
  open,
  onOpenChange,
}: {
  request: BillRequest;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const session = useAuthStore((s) => s.session);
  const add = useContributionsStore((s) => s.add);
  const push = useNotificationsStore((s) => s.push);
  const remaining = Math.max(0, request.amount - request.amountRaised);
  const presets = PRESET_AMOUNTS[request.currency].filter((p) => p <= remaining);
  const [done, setDone] = React.useState<{ amount: number; kind: ContributionKind } | null>(null);

  const schema = React.useMemo(
    () =>
      z.object({
        amount: z
          .number({ message: "Enter an amount" })
          .positive("Amount must be greater than zero")
          .max(remaining, `The remaining balance is ${formatCurrency(remaining, request.currency)}`),
        kind: z.enum(["simulated", "commitment"]),
        message: z.string().max(140, "Keep your message under 140 characters").optional(),
        acknowledge: z.literal(true, { message: "Please confirm you understand this is a simulation" }),
      }),
    [remaining, request.currency],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: presets[1] ?? presets[0] ?? remaining, kind: "simulated", message: "", acknowledge: undefined as unknown as true },
  });
  const amount = form.watch("amount");
  const kind = form.watch("kind");

  React.useEffect(() => {
    if (open) {
      setDone(null);
      form.reset({ amount: presets[1] ?? presets[0] ?? remaining, kind: "simulated", message: "", acknowledge: undefined as unknown as true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (values: Values) => {
    if (!session) return;
    await new Promise((r) => setTimeout(r, 650)); // simulated latency
    const res = add({
      requestId: request.id,
      userId: session.userId,
      donorName: session.name,
      amount: values.amount,
      currency: request.currency,
      kind: values.kind,
      message: values.message || undefined,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    push(session.userId, {
      title: values.kind === "simulated" ? "Simulated contribution recorded" : "Commitment saved",
      body: `${formatCurrency(values.amount, request.currency)} for “${request.title}”. No real money moved.`,
      href: `/requests/${request.id}`,
      tone: "success",
    });
    setDone({ amount: values.amount, kind: values.kind });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {!session ? (
          <div className="grid gap-4 text-center">
            <DialogHeader className="pr-0">
              <DialogTitle>Log in to continue</DialogTitle>
              <DialogDescription>Simulated contributions are tied to a demo account so you can track them on your dashboard.</DialogDescription>
            </DialogHeader>
            <Button asChild>
              <Link href={`/login?next=/requests/${request.id}`}>Log in to a demo account</Link>
            </Button>
          </div>
        ) : done ? (
          <div className="grid justify-items-center gap-4 py-2 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-primary/12 text-primary">
              <CheckCircle2 className="size-8" />
            </span>
            <DialogHeader className="pr-0">
              <DialogTitle>{done.kind === "simulated" ? "Simulated contribution recorded" : "Commitment saved"}</DialogTitle>
              <DialogDescription>
                {formatCurrency(done.amount, request.currency)} toward {request.name}&apos;s request.{" "}
                <strong className="text-foreground">No payment was processed and no money was transferred.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button asChild className="flex-1">
                <Link href="/dashboard/donor">View dashboard</Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandHeart className="size-5 text-primary" /> Simulate a contribution
              </DialogTitle>
              <DialogDescription>
                Remaining for this fictional request: <strong className="text-foreground">{formatCurrency(remaining, request.currency)}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
              <FlaskConical className="mt-0.5 size-4 shrink-0" />
              <p>
                <strong>Demo only.</strong> This is not a live donation service. You won&apos;t be charged and the requester doesn&apos;t receive any
                money.
              </p>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Type</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["simulated", "Contribute now", "Updates progress (simulated)"],
                    ["commitment", "Commit for later", "Save a pledge to fulfil later"],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={kind === value}
                    onClick={() => form.setValue("kind", value)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      kind === value ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted",
                    )}
                  >
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">Amount ({request.currency})</legend>
              {presets.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={amount === p}
                      onClick={() => form.setValue("amount", p, { shouldValidate: true })}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-medium tabular-nums transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        amount === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {formatCurrency(p, request.currency, { compact: p >= 1000 })}
                    </button>
                  ))}
                </div>
              )}
              <Label htmlFor="custom-amount" className="sr-only">
                Custom amount
              </Label>
              <Input
                id="custom-amount"
                type="number"
                inputMode="decimal"
                min={1}
                step="1"
                placeholder="Custom amount"
                aria-invalid={!!form.formState.errors.amount}
                {...form.register("amount", { valueAsNumber: true })}
              />
              <button
                type="button"
                className="justify-self-start text-xs font-medium text-primary hover:underline"
                onClick={() => form.setValue("amount", remaining, { shouldValidate: true })}
              >
                Cover the full remaining balance
              </button>
              <FieldError message={form.formState.errors.amount?.message} />
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="msg">Message of support (optional)</Label>
              <Textarea id="msg" className="min-h-20" placeholder="Wishing you all the best…" {...form.register("message")} />
              <FieldError message={form.formState.errors.message?.message} />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" {...form.register("acknowledge")} />
              I understand this is a simulated action in a prototype and no money will be charged or sent.
            </label>
            <FieldError message={form.formState.errors.acknowledge?.message} />

            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <HandHeart />}
              {kind === "simulated" ? "Record simulated contribution" : "Save commitment"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
