"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, Loader2, PencilLine, Repeat2, Send } from "lucide-react";
import { CATEGORIES, CATEGORY_MAP, COUNTRIES, COUNTRY_MAP, CURRENCIES } from "@/lib/constants";
import { cn, dueLabel, formatCurrency, formatDate, toUsd } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, FieldError, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Checkbox, Label } from "@/components/ui/primitives";
import { PageContainer } from "@/components/layout/page-parts";
import { CategoryBadge, FictionalTag } from "@/components/requests/badges";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { DocumentStep, type SelectedDocument } from "./document-step";
import { STEP_FIELDS, STEPS, buildSubmitSchema, type SubmitValues } from "./schema";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { useNotificationsStore } from "@/store/notifications-store";

type Form = UseFormReturn<SubmitValues>;

function Field({
  id,
  label,
  hint,
  error,
  children,
  counter,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  counter?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {counter && <span className="text-xs tabular-nums text-muted-foreground">{counter}</span>}
      </div>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} id={`${id}-error`} />
    </div>
  );
}

/* ---------------- Steps ---------------- */

function PersonalStep({ form, email }: { form: Form; email: string }) {
  const { register, formState, setValue, getValues } = form;
  const e = formState.errors;
  return (
    <div className="grid gap-5">
      <Field id="name" label="Display name" hint="Shown publicly. We recommend first name and last initial, e.g. “Sam O.”" error={e.name?.message}>
        <Input id="name" autoComplete="nickname" aria-invalid={!!e.name} {...register("name")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="country" label="Country" error={e.country?.message}>
          <NativeSelect
            id="country"
            aria-invalid={!!e.country}
            {...register("country", {
              onChange: (ev) => {
                const c = COUNTRY_MAP[ev.target.value as keyof typeof COUNTRY_MAP];
                if (c && !getValues("amount")) setValue("currency", c.currency);
                else if (c) setValue("currency", c.currency, { shouldValidate: true });
              },
            })}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="city" label="Town or city" error={e.city?.message}>
          <Input id="city" autoComplete="address-level2" aria-invalid={!!e.city} {...register("city")} />
        </Field>
      </div>
      <Field id="email" label="Contact email" hint="From your demo account. Never shown publicly.">
        <Input id="email" value={email} readOnly disabled />
      </Field>
    </div>
  );
}

function CategoryStep({ form, enabled }: { form: Form; enabled: string[] }) {
  const value = form.watch("category");
  const err = form.formState.errors.category?.message;
  return (
    <fieldset className="grid gap-3">
      <legend className="sr-only">Bill category</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {CATEGORIES.filter((c) => enabled.includes(c.id)).map((c) => {
          const active = value === c.id;
          return (
            <button
              type="button"
              key={c.id}
              aria-pressed={active}
              onClick={() => form.setValue("category", c.id, { shouldValidate: true })}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active ? "border-primary bg-primary/8 ring-1 ring-primary" : "bg-card hover:bg-muted/60",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", c.tone)}>
                <c.icon className="size-5" />
              </span>
              <span className="grid gap-0.5">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{c.description}</span>
              </span>
              {active && <Check className="ml-auto size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
      <FieldError message={err} />
    </fieldset>
  );
}

function AmountStep({ form, maxUsd }: { form: Form; maxUsd: number }) {
  const { register, formState, watch } = form;
  const e = formState.errors;
  const amount = watch("amount");
  const currency = watch("currency");
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
        <Field id="amount" label="Amount outstanding" error={e.amount?.message} hint="Enter the exact outstanding amount on the bill.">
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            placeholder="0"
            className="h-14 text-2xl font-semibold"
            aria-invalid={!!e.amount}
            {...register("amount", { valueAsNumber: true })}
          />
        </Field>
        <Field id="currency" label="Currency" error={e.currency?.message}>
          <NativeSelect id="currency" className="h-14" {...register("currency")}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {Number.isFinite(amount) && amount > 0 && currency && (
        <div className="rounded-2xl bg-muted/60 p-4 text-sm">
          <p>
            Requesting <strong>{formatCurrency(amount, currency, { decimals: true })}</strong>
            {currency !== "USD" && <span className="text-muted-foreground"> · ≈ {formatCurrency(toUsd(amount, currency), "USD")} at fixed demo rates</span>}
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Demo limit: about {formatCurrency(maxUsd, "USD")} per request (USD equivalent). Donors always see your local currency.
      </p>
    </div>
  );
}

function DueDateStep({ form }: { form: Form }) {
  const e = form.formState.errors;
  const due = form.watch("dueDate");
  const min = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <div className="grid gap-5">
      <Field id="dueDate" label="When is the bill due?" hint="Use the date shown on the bill. Overdue bills: choose the latest date before further action." error={e.dueDate?.message}>
        <Input id="dueDate" type="date" min={min} className="max-w-xs" aria-invalid={!!e.dueDate} {...form.register("dueDate")} />
      </Field>
      {due && !e.dueDate && (
        <p className="rounded-2xl bg-muted/60 p-4 text-sm">
          {formatDate(due + "T12:00:00")} · <span className="text-muted-foreground">{dueLabel(due + "T12:00:00")}</span>
        </p>
      )}
    </div>
  );
}

function StoryStep({ form }: { form: Form }) {
  const { register, formState, watch } = form;
  const e = formState.errors;
  const [title, summary, story] = watch(["title", "summary", "story"]);
  return (
    <div className="grid gap-5">
      <Field id="title" label="Request title" error={e.title?.message} counter={`${title?.length ?? 0}/80`}>
        <Input id="title" placeholder="e.g. Winter heating bill before shut-off" aria-invalid={!!e.title} {...register("title")} />
      </Field>
      <Field
        id="summary"
        label="Short summary"
        hint="Appears on swipe cards. One or two sentences."
        error={e.summary?.message}
        counter={`${summary?.length ?? 0}/220`}
      >
        <Textarea id="summary" className="min-h-20" aria-invalid={!!e.summary} {...register("summary")} />
      </Field>
      <Field
        id="story"
        label="Your story"
        hint="What happened, what the bill is for, and how help would change things. Avoid sharing sensitive details."
        error={e.story?.message}
        counter={`${story?.length ?? 0}/2500`}
      >
        <Textarea id="story" className="min-h-48" aria-invalid={!!e.story} {...register("story")} />
      </Field>
    </div>
  );
}

function ReviewStep({ form, doc, goTo }: { form: Form; doc: SelectedDocument | null; goTo: (s: number) => void }) {
  const v = form.getValues();
  const e = form.formState.errors;
  const country = COUNTRY_MAP[v.country];
  const rows: { step: number; label: string; value: React.ReactNode }[] = [
    { step: 0, label: "Display name", value: v.name },
    { step: 0, label: "Location", value: `${v.city}, ${country?.flag} ${country?.name}` },
    { step: 1, label: "Category", value: v.category ? <CategoryBadge category={v.category} /> : "—" },
    { step: 2, label: "Amount", value: v.currency && Number.isFinite(v.amount) ? formatCurrency(v.amount, v.currency, { decimals: true }) : "—" },
    { step: 3, label: "Due date", value: v.dueDate ? formatDate(v.dueDate + "T12:00:00") : "—" },
    { step: 4, label: "Title", value: v.title },
    { step: 5, label: "Document", value: doc ? `${doc.file.name} (local only)` : "None selected" },
  ];
  return (
    <div className="grid gap-6">
      <dl className="divide-y rounded-2xl border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="flex min-w-0 items-center gap-2 text-right text-sm font-medium">
              <span className="truncate">{r.value}</span>
              <button
                type="button"
                onClick={() => goTo(r.step)}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={`Edit ${r.label}`}
              >
                <PencilLine className="size-3.5" />
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2 rounded-2xl border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Card preview</p>
        <p className="font-semibold">{v.title}</p>
        <p className="text-sm text-muted-foreground">{v.summary}</p>
      </div>
      <div className="grid gap-3">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.watch("truthful")}
            onCheckedChange={(c) => form.setValue("truthful", c === true, { shouldValidate: true })}
            aria-invalid={!!e.truthful}
          />
          <span>The information I&apos;ve provided is accurate to the best of my knowledge.</span>
        </label>
        <FieldError message={e.truthful?.message} />
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={form.watch("understand")}
            onCheckedChange={(c) => form.setValue("understand", c === true, { shouldValidate: true })}
            aria-invalid={!!e.understand}
          />
          <span>I understand BillSwipe is a prototype: my request is demo data, and no real money will be raised or paid out.</span>
        </label>
        <FieldError message={e.understand?.message} />
      </div>
    </div>
  );
}

/* ---------------- Wizard ---------------- */

export function SubmitWizard() {
  const session = useAuthStore((s) => s.session);
  const setRole = useAuthStore((s) => s.setRole);
  const upsertUser = useAdminStore((s) => s.upsertUser);
  const settings = useAdminStore((s) => s.settings);
  const categorySettings = useAdminStore((s) => s.categories);
  const enabledCategories = React.useMemo(
    () => categorySettings.filter((c) => c.enabled).map((c) => c.id as string),
    [categorySettings],
  );
  const createRequest = useRequestsStore((s) => s.createRequest);
  const push = useNotificationsStore((s) => s.push);
  const reduced = useReducedMotion();

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [doc, setDoc] = React.useState<SelectedDocument | null>(null);
  const [docAck, setDocAck] = React.useState(false);
  const [docError, setDocError] = React.useState<string>();
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  const schema = React.useMemo(() => buildSubmitSchema(settings.maxRequestUsd), [settings.maxRequestUsd]);
  const form = useForm<SubmitValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: session ? `${session.name.split(" ")[0]} ${session.name.split(" ")[1]?.[0] ?? ""}${session.name.split(" ")[1] ? "." : ""}`.trim() : "",
      country: session?.country ?? "US",
      city: "",
      currency: COUNTRY_MAP[session?.country ?? "US"].currency,
      amount: undefined as unknown as number,
      dueDate: "",
      title: "",
      summary: "",
      story: "",
      truthful: false,
      understand: false,
    },
  });

  // Revoke the object URL when leaving the page
  React.useEffect(() => () => {
    if (doc) URL.revokeObjectURL(doc.url);
  }, [doc]);

  if (!session) return null;

  if (session.role === "donor") {
    return (
      <PageContainer className="max-w-xl">
        <Card className="grid justify-items-center gap-4 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Repeat2 className="size-6" />
          </span>
          <h1 className="text-xl font-semibold">Switch to a requester account?</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re using a donor demo account. To submit a bill, switch this demo account to the Requester role. You can switch back any time
            from your profile.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/discover">Keep discovering</Link>
            </Button>
            <Button
              onClick={() => {
                setRole("requester");
                upsertUser({
                  id: session.userId,
                  name: session.name,
                  email: session.email,
                  role: "requester",
                  country: session.country,
                  bio: session.bio,
                  memberSince: session.memberSince,
                  image: session.image,
                  status: "active",
                });
                toast.success("Switched to requester (demo)");
              }}
            >
              Switch to requester
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  const next = async () => {
    const fields = STEP_FIELDS[step];
    const ok = fields.length ? await form.trigger(fields, { shouldFocus: true }) : true;
    if (!ok) return;
    if (step === 5) {
      if (settings.requireDocument && !doc) {
        setDocError("Select a bill document (sample or redacted) to continue. Moderators require one in the current demo settings.");
        return;
      }
      setDocError(undefined);
    }
    goTo(step + 1);
  };

  const onSubmit = async (values: SubmitValues) => {
    if (settings.requireDocument && !doc) {
      goTo(5);
      return;
    }
    await new Promise((r) => setTimeout(r, 900)); // simulated latency
    const res = createRequest({
      userId: session.userId,
      name: values.name,
      country: values.country,
      city: values.city,
      currency: values.currency,
      category: values.category,
      title: values.title,
      amount: Math.round(values.amount * 100) / 100,
      summary: values.summary,
      story: values.story,
      dueDate: new Date(values.dueDate + "T12:00:00").toISOString(),
      // Metadata only — the file itself is discarded.
      document: doc ? { name: doc.file.name, type: doc.file.type, sizeKb: Math.round(doc.file.size / 1024) } : undefined,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (doc) URL.revokeObjectURL(doc.url);
    setDoc(null);
    push(session.userId, {
      title: "Request submitted for review",
      body: `“${values.title}” is in the demo moderation queue.`,
      href: `/requests/${res.id}`,
    });
    toast.success("Request submitted for review");
    setSubmitted(res.id);
  };

  if (submitted) {
    return (
      <PageContainer className="max-w-xl">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="grid justify-items-center gap-5 p-8 text-center sm:p-10">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="grid size-20 place-items-center rounded-full bg-primary/12 text-primary"
            >
              <CheckCircle2 className="size-10" />
            </motion.span>
            <div className="grid gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Submitted for review</h1>
              <p className="text-sm text-muted-foreground">
                Your demo request is now <strong className="text-foreground">pending review</strong>. A demo moderator can approve it from the admin
                panel, after which it appears in Discover.
              </p>
            </div>
            <p className="rounded-xl bg-muted/70 px-4 py-2 text-xs text-muted-foreground">
              Your bill document was not uploaded or stored — only its file name was kept for the demo.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/requests/${submitted}`}>View request</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/requester">Go to dashboard</Link>
              </Button>
            </div>
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => {
                form.reset();
                setDocAck(false);
                setSubmitted(null);
                setStep(0);
              }}
            >
              Submit another bill
            </button>
          </Card>
        </motion.div>
      </PageContainer>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <PageContainer className="max-w-6xl">
      <div className="mb-8 grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Submit a bill</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Share a genuine outstanding bill</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Seven short steps. Your request goes to a moderation queue before it appears to donors. <FictionalTag className="ml-1 align-middle" />
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Stepper */}
        <nav aria-label="Submission steps" className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted lg:hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm font-medium lg:hidden">
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </p>
          <ol className="hidden gap-1 lg:grid">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "current" : "todo";
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    disabled={i > step}
                    onClick={() => goTo(i)}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      state === "current" && "bg-accent font-medium text-foreground",
                      state === "done" && "text-foreground hover:bg-muted",
                      state === "todo" && "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                        state === "done" && "border-primary bg-primary text-primary-foreground",
                        state === "current" && "border-primary text-primary",
                      )}
                    >
                      {state === "done" ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    {s.title}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 hidden items-center gap-3 rounded-2xl border p-4 lg:flex">
            <DemoAvatar seed={session.image} className="size-9" label={session.name} />
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium">{session.name}</p>
              <p className="text-muted-foreground">Requester · demo</p>
            </div>
          </div>
        </nav>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <Card className="overflow-hidden">
            <div className="border-b p-6 sm:px-8">
              <h2 className="text-lg font-semibold">{STEPS[step].title}</h2>
            </div>
            <div className="relative p-6 sm:p-8">
              {/* Entrance-only transition: the new step renders immediately (no blocking exit animation). */}
                <motion.div
                  key={step}
                  initial={reduced ? false : { opacity: 0, x: direction * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  {step === 0 && <PersonalStep form={form} email={session.email} />}
                  {step === 1 && <CategoryStep form={form} enabled={enabledCategories} />}
                  {step === 2 && <AmountStep form={form} maxUsd={settings.maxRequestUsd} />}
                  {step === 3 && <DueDateStep form={form} />}
                  {step === 4 && <StoryStep form={form} />}
                  {step === 5 && (
                    <DocumentStep
                      doc={doc}
                      onChange={(d) => {
                        setDoc(d);
                        if (d) setDocError(undefined);
                      }}
                      acknowledged={docAck}
                      onAcknowledge={setDocAck}
                      error={docError}
                      required={settings.requireDocument}
                    />
                  )}
                  {step === 6 && <ReviewStep form={form} doc={doc} goTo={goTo} />}
                </motion.div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-4 sm:px-8">
              <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>
                  Continue <ArrowRight />
                </Button>
              ) : (
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                  Submit for review
                </Button>
              )}
            </div>
          </Card>
          {step === 1 && form.watch("category") && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" /> {CATEGORY_MAP[form.watch("category")].description}
            </p>
          )}
        </form>
      </div>
    </PageContainer>
  );
}
