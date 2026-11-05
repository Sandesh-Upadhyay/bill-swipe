"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import type { CategoryId } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { Card, FieldError, Input, Textarea } from "@/components/ui/basic";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/overlays";
import { Label, Switch } from "@/components/ui/primitives";
import { useAdminStore, type CategorySetting } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { CATEGORY_MAP } from "@/lib/constants";
import { cn, formatCurrency } from "@/lib/utils";

const schema = z.object({
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(160, "Keep it under 160 characters"),
  maxAmountUsd: z
    .number({ message: "Enter a number" })
    .int("Use a whole number")
    .min(50, "Minimum is $50")
    .max(50000, "Maximum is $50,000"),
});
type Values = z.infer<typeof schema>;

export default function AdminCategoriesPage() {
  const categories = useAdminStore((s) => s.categories);
  const updateCategory = useAdminStore((s) => s.updateCategory);
  const requests = useRequestsStore((s) => s.requests);
  const [editing, setEditing] = React.useState<CategorySetting | null>(null);
  const [disabling, setDisabling] = React.useState<CategoryId | null>(null);

  const counts = React.useMemo(() => {
    const m = new Map<CategoryId, { total: number; active: number }>();
    for (const r of requests) {
      const c = m.get(r.category) ?? { total: 0, active: 0 };
      c.total += 1;
      if (r.status === "active") c.active += 1;
      m.set(r.category, c);
    }
    return m;
  }, [requests]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Configuration"
        title="Categories"
        description="Control which bill categories requesters can choose and the maximum request size per category (USD equivalent at fixed demo rates)."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((c) => {
          const meta = CATEGORY_MAP[c.id];
          const Icon = meta.icon;
          const count = counts.get(c.id) ?? { total: 0, active: 0 };
          return (
            <Card key={c.id} className={cn("grid gap-4 p-5 transition", !c.enabled && "opacity-70")}>
              <div className="flex items-start gap-4">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", meta.tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{meta.label}</h2>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`cat-${c.id}`} className="text-xs font-normal text-muted-foreground">
                        {c.enabled ? "Enabled" : "Disabled"}
                      </Label>
                      <Switch
                        id={`cat-${c.id}`}
                        checked={c.enabled}
                        onCheckedChange={(v) => {
                          // Disabling hides live requests from donors, so it needs a confirmation. Enabling is harmless.
                          if (!v) {
                            setDisabling(c.id);
                            return;
                          }
                          updateCategory(c.id, { enabled: true });
                          toast.success(`${meta.label} enabled`);
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
                <dl className="flex gap-6">
                  <div>
                    <dt className="text-xs text-muted-foreground">Requests</dt>
                    <dd className="font-medium tabular-nums">{count.total}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Active</dt>
                    <dd className="font-medium tabular-nums">{count.active}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Max request</dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(c.maxAmountUsd, "USD")}</dd>
                  </div>
                </dl>
                <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                  <Pencil /> Edit
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
      <EditCategoryDialog
        category={editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSave={(id, v) => {
          updateCategory(id, v);
          toast.success(`${CATEGORY_MAP[id].label} updated`);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!disabling}
        onOpenChange={(o) => !o && setDisabling(null)}
        title={disabling ? `Disable ${CATEGORY_MAP[disabling].label}?` : ""}
        description={
          disabling
            ? `Requesters won't be able to choose this category, and its ${counts.get(disabling)?.active ?? 0} active request(s) will be hidden from Discover until you enable it again. Nothing is deleted.`
            : ""
        }
        confirmLabel="Disable category"
        destructive
        onConfirm={() => {
          if (!disabling) return;
          updateCategory(disabling, { enabled: false });
          toast.success(`${CATEGORY_MAP[disabling].label} disabled`);
          setDisabling(null);
        }}
      />
    </div>
  );
}

function EditCategoryDialog({
  category,
  onOpenChange,
  onSave,
}: {
  category: CategorySetting | null;
  onOpenChange: (o: boolean) => void;
  onSave: (id: CategoryId, v: Values) => void;
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  React.useEffect(() => {
    if (category) form.reset({ description: category.description, maxAmountUsd: category.maxAmountUsd });
  }, [category, form]);

  return (
    <Dialog open={!!category} onOpenChange={onOpenChange}>
      <DialogContent>
        {category && (
          <form onSubmit={form.handleSubmit((v) => onSave(category.id, v))} className="grid gap-5" noValidate>
            <DialogHeader>
              <DialogTitle>Edit {CATEGORY_MAP[category.id].label}</DialogTitle>
              <DialogDescription>Changes apply to the demo submission flow and moderation guidelines.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" className="min-h-20" aria-invalid={!!form.formState.errors.description} {...form.register("description")} />
              <FieldError message={form.formState.errors.description?.message} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-max">Maximum request (USD equivalent)</Label>
              <Input
                id="cat-max"
                type="number"
                inputMode="numeric"
                aria-invalid={!!form.formState.errors.maxAmountUsd}
                {...form.register("maxAmountUsd", { valueAsNumber: true })}
              />
              <FieldError message={form.formState.errors.maxAmountUsd?.message} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
