"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Info, Loader2 } from "lucide-react";
import type { BillRequest } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { FieldError, Input, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";
import { useRequestsStore } from "@/store/requests-store";

const toDateInput = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

export function EditRequestDialog({
  request,
  userId,
  open,
  onOpenChange,
}: {
  request: BillRequest;
  userId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const update = useRequestsStore((s) => s.updateRequest);

  const schema = React.useMemo(
    () =>
      z.object({
        title: z.string().trim().min(6, "Title must be at least 6 characters").max(80, "Keep the title under 80 characters"),
        city: z.string().trim().min(2, "Enter your city").max(60),
        summary: z.string().trim().min(20, "Summary must be at least 20 characters").max(220, "Keep the summary under 220 characters"),
        story: z.string().trim().min(80, "Story must be at least 80 characters").max(2000, "Keep the story under 2000 characters"),
        amount: z
          .number({ message: "Enter an amount" })
          .positive("Amount must be greater than zero")
          .min(Math.max(1, request.amountRaised), `Amount can't be lower than the ${formatCurrency(request.amountRaised, request.currency)} already raised (simulated)`),
        dueDate: z
          .string()
          .min(1, "Choose a due date")
          .refine((v) => new Date(v).getTime() >= new Date(new Date().toISOString().slice(0, 10)).getTime(), "Due date can't be in the past"),
      }),
    [request.amountRaised, request.currency],
  );
  type Values = z.infer<typeof schema>;

  const defaults = React.useCallback(
    (): Values => ({
      title: request.title,
      city: request.city,
      summary: request.summary,
      story: request.story,
      amount: request.amount,
      dueDate: toDateInput(request.dueDate),
    }),
    [request],
  );

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (open) form.reset(defaults());
  }, [open, defaults, form]);

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 400));
    const res = update(
      request.id,
      { ...v, dueDate: new Date(`${v.dueDate}T12:00:00Z`).toISOString() },
      userId,
    );
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Changes saved — your request was sent back for demo review.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Edit request</DialogTitle>
            <DialogDescription>Update the details of your fictional demo request.</DialogDescription>
          </DialogHeader>
          <p className="flex items-start gap-2 rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-200">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Saving edits returns the request to the moderation queue (pending review) before it appears in Discover again.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" aria-invalid={!!errors.title} {...form.register("title")} />
              <FieldError message={errors.title?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Amount ({request.currency})</Label>
              <Input id="edit-amount" type="number" inputMode="decimal" min={1} aria-invalid={!!errors.amount} {...form.register("amount", { valueAsNumber: true })} />
              <FieldError message={errors.amount?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due">Due date</Label>
              <Input id="edit-due" type="date" aria-invalid={!!errors.dueDate} {...form.register("dueDate")} />
              <FieldError message={errors.dueDate?.message} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" aria-invalid={!!errors.city} {...form.register("city")} />
              <FieldError message={errors.city?.message} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="edit-summary">Short summary</Label>
              <Textarea id="edit-summary" className="min-h-20" aria-invalid={!!errors.summary} {...form.register("summary")} />
              <FieldError message={errors.summary?.message} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="edit-story">Full story</Label>
              <Textarea id="edit-story" className="min-h-40" aria-invalid={!!errors.story} {...form.register("story")} />
              <FieldError message={errors.story?.message} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
