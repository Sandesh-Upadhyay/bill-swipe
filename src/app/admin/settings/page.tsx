"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-parts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, FieldError, Input } from "@/components/ui/basic";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Label, Separator, Switch } from "@/components/ui/primitives";
import { useAdminStore } from "@/store/admin-store";
import { resetAllDemoData } from "@/store";

const schema = z.object({
  requireDocument: z.boolean(),
  allowUnverifiedInFeed: z.boolean(),
  showDemoBanner: z.boolean(),
  autoFlagThreshold: z.number({ message: "Enter a number" }).int("Use a whole number").min(1, "At least 1 report").max(20, "At most 20 reports"),
  maxRequestUsd: z.number({ message: "Enter a number" }).int("Use a whole number").min(100, "Minimum is $100").max(100000, "Maximum is $100,000"),
  moderatorEmail: z.email("Enter a valid email address"),
});
type Values = z.infer<typeof schema>;

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AdminSettingsPage() {
  const settings = useAdminStore((s) => s.settings);
  const updateSettings = useAdminStore((s) => s.updateSettings);
  const router = useRouter();
  const [resetOpen, setResetOpen] = React.useState(false);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: settings });
  const { errors, isDirty } = form.formState;

  const onSubmit = (v: Values) => {
    updateSettings(v);
    form.reset(v);
    toast.success("Platform settings saved", { description: "Stored locally for this demo." });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Configuration" title="Settings" description="Platform-wide moderation settings for the demo. Saved to this browser only." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
        <Card>
          <CardHeader>
            <CardTitle>Moderation rules</CardTitle>
            <CardDescription>How new requests are reviewed and surfaced.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y pt-0">
            <Controller
              control={form.control}
              name="requireDocument"
              render={({ field }) => (
                <ToggleRow
                  id="requireDocument"
                  label="Require a bill document"
                  description="Requesters must select a document for review (never stored or shown publicly in this prototype)."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="allowUnverifiedInFeed"
              render={({ field }) => (
                <ToggleRow
                  id="allowUnverifiedInFeed"
                  label="Show unreviewed requests in Discover"
                  description="When off, only demo-approved requests should appear in the swipe feed."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={form.control}
              name="showDemoBanner"
              render={({ field }) => (
                <ToggleRow
                  id="showDemoBanner"
                  label="Show prototype banner"
                  description="Displays the “not a live donation service” notice across the site. Recommended on."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="autoFlagThreshold">Auto-flag after N open reports</Label>
                <Input id="autoFlagThreshold" type="number" inputMode="numeric" aria-invalid={!!errors.autoFlagThreshold} {...form.register("autoFlagThreshold", { valueAsNumber: true })} />
                <FieldError message={errors.autoFlagThreshold?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxRequestUsd">Maximum request (USD equivalent)</Label>
                <Input id="maxRequestUsd" type="number" inputMode="numeric" aria-invalid={!!errors.maxRequestUsd} {...form.register("maxRequestUsd", { valueAsNumber: true })} />
                <FieldError message={errors.maxRequestUsd?.message} />
              </div>
            </div>
            <div className="grid gap-2 py-4">
              <Label htmlFor="moderatorEmail">Moderation contact email</Label>
              <Input id="moderatorEmail" type="email" aria-invalid={!!errors.moderatorEmail} {...form.register("moderatorEmail")} />
              <FieldError message={errors.moderatorEmail?.message} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => form.reset(settings)}>
            Discard changes
          </Button>
          <Button type="submit" disabled={!isDirty}>
            <Save /> Save settings
          </Button>
        </div>
      </form>

      <Separator className="my-10" />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" /> Danger zone
          </CardTitle>
          <CardDescription>
            Reset every demo store — requests, swipes, saved items, simulated contributions, notifications, users and settings — back to the original
            fictional seed data. You will be signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setResetOpen(true)}>
            <RotateCcw /> Reset all demo data
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all demo data?"
        description="This clears everything stored by BillSwipe in this browser and restores the seed data. This can't be undone."
        confirmLabel="Reset everything"
        destructive
        onConfirm={() => {
          resetAllDemoData();
          toast.success("Demo data reset");
          router.push("/");
        }}
      />
    </div>
  );
}
