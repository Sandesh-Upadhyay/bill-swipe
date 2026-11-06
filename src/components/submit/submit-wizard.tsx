"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useFieldArray, useForm, type FieldError, type FieldErrors, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock,
  CloudCheck,
  FileClock,
  FileText,
  Loader2,
  PencilLine,
  Plus,
  Repeat2,
  Save,
  Send,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { CATEGORIES, CATEGORY_MAP, COUNTRIES, COUNTRY_MAP, CURRENCIES } from "@/lib/constants";
import { cn, dueLabel, formatCurrency, formatDate, formatNumber, toUsd } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, FieldError as FieldErrorText, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Checkbox, Label, Progress } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlays";
import { PageContainer } from "@/components/layout/page-parts";
import { CategoryBadge, FictionalTag } from "@/components/requests/badges";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { DocumentStep, docKindLabel, formatBytes, type DocumentMeta, type SelectedDocument } from "./document-step";
import {
  FIELD_LABELS,
  MAX_BREAKDOWN_ITEMS,
  STEP_FIELDS,
  STEPS,
  TEXT_LIMITS,
  amountLimitError,
  breakdownMismatch,
  buildSubmitSchema,
  minutesLeft,
  type SubmitValues,
} from "./schema";
import type { CategoryId, CountryCode, CurrencyCode } from "@/lib/types";
import type { CategorySetting } from "@/store/admin-store";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";
import { useRequestsStore } from "@/store/requests-store";
import { useNotificationsStore } from "@/store/notifications-store";
import { useSubmitDraftStore, type SubmitDraft } from "@/store/submit-draft-store";

type Form = UseFormReturn<SubmitValues>;

/** One problem listed in the error summary. `id` is the element to focus. */
interface Issue {
  id: string;
  label: string;
  message: string;
}

const AUTOSAVE_MS = 800;
const STORY_EXCERPT = 280;
const DOC_REQUIRED_MESSAGE = "Select a bill document (sample or redacted) to continue. Moderators require one in the current demo settings.";

/* ---------------- Helpers ---------------- */

function focusById(id: string | undefined, reduced: boolean | null) {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.focus({ preventScroll: true });
  if (id !== "step-heading") el.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
}

/** Lists the errors belonging to one step, in on-screen order. */
function issuesFor(step: number, errors: FieldErrors<SubmitValues>): Issue[] {
  const out: Issue[] = [];
  for (const field of STEP_FIELDS[step]) {
    if (field === "breakdown") {
      const be = errors.breakdown;
      if (!be) continue;
      for (let i = 0; i < MAX_BREAKDOWN_ITEMS; i++) {
        const le = be[i];
        if (le?.label?.message) out.push({ id: `bd-label-${i}`, label: `Item ${i + 1} description`, message: le.label.message });
        if (le?.amount?.message) out.push({ id: `bd-amount-${i}`, label: `Item ${i + 1} amount`, message: le.amount.message });
      }
      const root = be.message ?? be.root?.message;
      if (root) out.push({ id: "bd-amount-0", label: FIELD_LABELS.breakdown, message: root });
      continue;
    }
    const message = (errors[field] as FieldError | undefined)?.message;
    if (message) out.push({ id: field, label: FIELD_LABELS[field], message });
  }
  return out;
}

const isCountry = (v: unknown): v is CountryCode => COUNTRIES.some((c) => c.code === v);
const isCurrency = (v: unknown): v is CurrencyCode => CURRENCIES.some((c) => c.code === v);
const isCategory = (v: unknown): v is CategoryId => CATEGORIES.some((c) => c.id === v);
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : (undefined as unknown as number));
const clampStep = (s: unknown) => (typeof s === "number" && Number.isInteger(s) ? Math.min(Math.max(s, 0), STEPS.length - 1) : 0);

function isUsableDraft(d: unknown): d is SubmitDraft {
  if (!d || typeof d !== "object") return false;
  const x = d as Partial<SubmitDraft>;
  return !!x.values && typeof x.values === "object" && typeof x.savedAt === "string";
}

function docMetaFrom(d: unknown): DocumentMeta | undefined {
  if (!d || typeof d !== "object") return undefined;
  const x = d as Partial<DocumentMeta>;
  if (typeof x.name !== "string" || typeof x.size !== "number") return undefined;
  return { name: x.name, type: str(x.type), size: x.size };
}

/** Rebuilds form values from a stored draft, defensively (LocalStorage may hold anything). */
function valuesFromDraft(d: SubmitDraft, defaults: SubmitValues): SubmitValues {
  const v = d.values as Partial<Record<keyof SubmitDraft["values"], unknown>>;
  return {
    ...defaults,
    name: str(v.name, defaults.name),
    country: isCountry(v.country) ? v.country : defaults.country,
    city: str(v.city),
    category: isCategory(v.category) ? v.category : (undefined as unknown as CategoryId),
    amount: num(v.amount),
    currency: isCurrency(v.currency) ? v.currency : defaults.currency,
    breakdown: Array.isArray(v.breakdown)
      ? v.breakdown.slice(0, MAX_BREAKDOWN_ITEMS).map((b: { label?: unknown; amount?: unknown } | null) => ({ label: str(b?.label), amount: num(b?.amount) }))
      : [],
    dueDate: str(v.dueDate),
    title: str(v.title),
    summary: str(v.summary),
    story: str(v.story),
    truthful: false,
    understand: false,
  };
}

/** Builds the persisted draft. Never includes the file — only its metadata. */
function draftFrom(values: SubmitValues, step: number, currencyTouched: boolean, document: DocumentMeta | undefined): SubmitDraft {
  const finite = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
  return {
    values: {
      name: values.name ?? "",
      country: values.country,
      city: values.city ?? "",
      category: values.category || undefined,
      amount: finite(values.amount),
      currency: values.currency,
      breakdown: (values.breakdown ?? []).map((b) => ({ label: b?.label ?? "", amount: finite(b?.amount) })),
      dueDate: values.dueDate ?? "",
      title: values.title ?? "",
      summary: values.summary ?? "",
      story: values.story ?? "",
    },
    step,
    currencyTouched,
    document,
    savedAt: new Date().toISOString(),
  };
}

function savedLabel(iso: string) {
  const d = new Date(iso);
  const time = formatDate(iso, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return `today at ${time}`;
  return `${formatDate(iso, { day: "numeric", month: "short" })} at ${time}`;
}

/* ---------------- Field parts ---------------- */

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
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  counter?: React.ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const counterId = counter ? `${id}-counter` : undefined;
  const describedBy = [errorId, hintId, counterId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <Label htmlFor={id}>{label}</Label>
        {counter && <span id={counterId}>{counter}</span>}
      </div>
      {React.cloneElement(children, { "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldErrorText message={error} id={errorId} />
    </div>
  );
}

/** Live character count against the min/max the schema enforces (counts trimmed text, like the schema). */
function CharCounter({ value, min, max }: { value: string | undefined; min: number; max: number }) {
  const len = (value ?? "").trim().length;
  const over = len > max;
  const ok = len >= min && !over;
  return (
    <span className={cn("text-xs tabular-nums", over ? "text-destructive" : ok ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
      {over ? `${formatNumber(len - max)} over · ` : len < min ? `${formatNumber(min - len)} more needed · ` : ""}
      {formatNumber(len)}/{formatNumber(max)}
      <span className="sr-only"> characters, minimum {formatNumber(min)}</span>
    </span>
  );
}

function ErrorSummary({ issues, final, onSelect }: { issues: Issue[]; final: boolean; onSelect: (id: string) => void }) {
  const n = issues.length;
  return (
    <div role="alert" aria-labelledby="error-summary-title" className="mb-6 grid gap-2 rounded-2xl border border-destructive/40 bg-destructive/8 p-4 text-sm">
      <p id="error-summary-title" className="flex items-center gap-2 font-semibold text-destructive">
        <CircleAlert className="size-4 shrink-0" />
        Check {n === 1 ? "1 thing" : `${n} things`} before {final ? "submitting" : "continuing"}
      </p>
      <ul className="grid list-disc gap-1 pl-6 text-[13px]">
        {issues.map((i) => (
          <li key={i.id + i.message}>
            <button
              type="button"
              className="break-words text-left underline underline-offset-2 hover:text-destructive"
              onClick={() => onSelect(i.id)}
            >
              <span className="font-medium">{i.label}:</span> {i.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressPanel({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const mins = minutesLeft(step);
  const time = mins === 0 ? "Less than a minute left" : `About ${mins} min left`;
  return (
    <div className="grid gap-2.5 rounded-2xl border bg-card p-4">
      <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium tabular-nums">
          Step {step + 1} of {STEPS.length} · {pct}%<span className="sr-only">: {STEPS[step].title}.</span>
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" aria-hidden /> {time}
        </p>
      </div>
      <Progress value={pct} aria-label="Submission progress" getValueLabel={() => `Step ${step + 1} of ${STEPS.length}, ${pct}% complete`} />
      <p className="text-xs text-muted-foreground lg:hidden">{STEPS[step].title}</p>
    </div>
  );
}

/* ---------------- Steps ---------------- */

function PersonalStep({ form, email, currencyTouched }: { form: Form; email: string; currencyTouched: boolean }) {
  const { register, formState, setValue, getValues, watch } = form;
  const e = formState.errors;
  const [country, currency] = watch(["country", "currency"]);
  const countryCurrency = COUNTRY_MAP[country]?.currency;
  return (
    <div className="grid gap-5">
      <Field id="name" label="Display name" hint="Shown publicly. We recommend first name and last initial, e.g. “Sam O.”" error={e.name?.message}>
        <Input id="name" autoComplete="nickname" aria-invalid={!!e.name} {...register("name")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="country"
          label="Country"
          error={e.country?.message}
          hint={
            countryCurrency &&
            (currencyTouched && currency !== countryCurrency
              ? `Your currency stays ${currency} because you chose it.`
              : `Your bill currency will be ${countryCurrency}. You can change it later.`)
          }
        >
          <NativeSelect
            id="country"
            aria-invalid={!!e.country}
            {...register("country", {
              onChange: (ev) => {
                const c = COUNTRY_MAP[ev.target.value as CountryCode];
                // Follow the country's currency unless the user picked one themselves.
                if (!c || currencyTouched) return;
                if (!getValues("amount")) setValue("currency", c.currency);
                else setValue("currency", c.currency, { shouldValidate: true });
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

function CategoryStep({ form, settings }: { form: Form; settings: CategorySetting[] }) {
  const value = form.watch("category");
  const err = form.formState.errors.category?.message;
  const byId = new Map(settings.map((s) => [s.id, s]));
  const enabled = CATEGORIES.filter((c) => byId.get(c.id)?.enabled ?? true);
  return (
    <fieldset className="grid gap-3" aria-describedby={err ? "category-error" : undefined}>
      <legend className="sr-only">Bill category</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {enabled.map((c, i) => {
          const active = value === c.id;
          return (
            <button
              type="button"
              key={c.id}
              id={i === 0 ? "category" : undefined}
              aria-pressed={active}
              onClick={() => form.setValue("category", c.id, { shouldValidate: true })}
              className={cn(
                "flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active ? "border-primary bg-primary/8 ring-1 ring-primary" : "bg-card hover:bg-muted/60",
                err && !value && "border-destructive/50",
              )}
            >
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", c.tone)}>
                <c.icon className="size-5" />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="font-medium">{c.label}</span>
                <span className="text-xs text-muted-foreground">{byId.get(c.id)?.description ?? c.description}</span>
              </span>
              {active && <Check className="ml-auto size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
      <FieldErrorText message={err} id="category-error" />
    </fieldset>
  );
}

function AmountStep({
  form,
  maxUsd,
  currencyTouched,
  onCurrencyTouched,
}: {
  form: Form;
  maxUsd: number;
  currencyTouched: boolean;
  onCurrencyTouched: (v: boolean) => void;
}) {
  const { register, formState, watch, setValue, getValues } = form;
  const e = formState.errors;
  const [amount, currency, country] = watch(["amount", "currency", "country"]);
  const countryCurrency = COUNTRY_MAP[country]?.currency;
  let currencyHint: React.ReactNode;
  if (countryCurrency && currency === countryCurrency && !currencyTouched) currencyHint = "Set from your country — you can change it";
  else if (countryCurrency && currency !== countryCurrency)
    currencyHint = (
      <button
        type="button"
        className="text-primary underline-offset-2 hover:underline"
        onClick={() => {
          setValue("currency", countryCurrency, { shouldValidate: Number.isFinite(getValues("amount")) });
          onCurrencyTouched(false);
        }}
      >
        Use {countryCurrency}, your country&apos;s currency
      </button>
    );
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
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
        <Field id="currency" label="Currency" error={e.currency?.message} hint={currencyHint}>
          <NativeSelect id="currency" className="h-14" aria-invalid={!!e.currency} {...register("currency", { onChange: () => onCurrencyTouched(true) })}>
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
          <p className="break-words">
            Requesting <strong>{formatCurrency(amount, currency, { decimals: true })}</strong>
            {currency !== "USD" && (
              <span className="text-muted-foreground"> · ≈ {formatCurrency(toUsd(amount, currency), "USD")} at fixed demo rates, not live exchange rates</span>
            )}
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Demo limit for this category: about {formatCurrency(maxUsd, "USD")} per request (USD equivalent at fixed demo rates, not live exchange rates). Donors always see your local currency.
      </p>
      <BreakdownEditor form={form} />
    </div>
  );
}

/** Optional itemised lines. Itemised bills are easier for donors to trust and for moderators to review. */
function BreakdownEditor({ form }: { form: Form }) {
  const { control, register, formState, watch, setValue, clearErrors } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "breakdown" });
  const amount = watch("amount");
  const currency = watch("currency");
  const items = watch("breakdown") ?? [];
  const sum = items.reduce((s, i) => s + (Number.isFinite(i?.amount) ? i.amount : 0), 0);
  const remaining = Number.isFinite(amount) ? Math.round((amount - sum) * 100) / 100 : null;
  const e = formState.errors.breakdown;
  const rootError = e?.message ?? e?.root?.message;

  return (
    <fieldset className="grid min-w-0 gap-3 rounded-2xl border p-3 sm:p-5" aria-describedby={rootError ? "breakdown-error" : undefined}>
      <legend className="px-1 text-sm font-medium">
        Itemise your bill <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p className="-mt-1 text-xs text-muted-foreground">
        List what the amount covers, such as &ldquo;Two months of rent&rdquo; and &ldquo;Late fee&rdquo;. Items must add up to the amount outstanding.
      </p>
      {fields.length > 0 && (
        <ul className="grid gap-2.5">
          {fields.map((f, i) => {
            const le = e?.[i];
            return (
              <li
                key={f.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 min-[420px]:grid-cols-[minmax(0,1fr)_7.5rem_auto]"
              >
                <div className="col-span-2 grid min-w-0 gap-1 min-[420px]:col-span-1">
                  <Label htmlFor={`bd-label-${i}`} className="sr-only">
                    Item {i + 1} description
                  </Label>
                  <Input
                    id={`bd-label-${i}`}
                    placeholder={`Item ${i + 1}`}
                    aria-invalid={!!le?.label}
                    aria-describedby={le?.label ? `bd-label-${i}-error` : undefined}
                    {...register(`breakdown.${i}.label`)}
                  />
                  <FieldErrorText message={le?.label?.message} id={`bd-label-${i}-error`} />
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor={`bd-amount-${i}`} className="sr-only">
                    Item {i + 1} amount
                  </Label>
                  <Input
                    id={`bd-amount-${i}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0"
                    className="text-right tabular-nums"
                    aria-invalid={!!le?.amount || (!!rootError && i === 0)}
                    aria-describedby={[le?.amount ? `bd-amount-${i}-error` : "", rootError ? "breakdown-error" : ""].filter(Boolean).join(" ") || undefined}
                    {...register(`breakdown.${i}.amount`, { valueAsNumber: true })}
                  />
                  <FieldErrorText message={le?.amount?.message} id={`bd-amount-${i}-error`} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)}>
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          id="breakdown-add"
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_BREAKDOWN_ITEMS}
          onClick={() => {
            clearErrors("breakdown");
            // Pre-fill the last line with whatever is still unaccounted for.
            const prefill = remaining && remaining > 0 && fields.length > 0 ? remaining : (undefined as unknown as number);
            append({ label: "", amount: prefill }, { shouldFocus: true });
          }}
        >
          <Plus /> Add item
        </Button>
        {fields.length > 0 && currency && remaining !== null && (
          <p className={cn("text-xs tabular-nums", remaining === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")} aria-live="polite">
            {remaining === 0
              ? "Items match the amount outstanding"
              : remaining > 0
                ? `${formatCurrency(remaining, currency, { decimals: true })} not yet itemised`
                : `${formatCurrency(-remaining, currency, { decimals: true })} over the amount`}
          </p>
        )}
      </div>
      {fields.length > 0 && (
        <button
          type="button"
          className="justify-self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => {
            setValue("breakdown", [], { shouldDirty: true });
            clearErrors("breakdown");
          }}
        >
          Remove all items
        </button>
      )}
      <FieldErrorText message={rootError} id="breakdown-error" />
    </fieldset>
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
      <Field id="title" label="Request title" error={e.title?.message} counter={<CharCounter value={title} {...TEXT_LIMITS.title} />}>
        <Input id="title" placeholder="e.g. Winter heating bill before shut-off" aria-invalid={!!e.title} {...register("title")} />
      </Field>
      <Field
        id="summary"
        label="Short summary"
        hint="Appears on swipe cards. One or two sentences."
        error={e.summary?.message}
        counter={<CharCounter value={summary} {...TEXT_LIMITS.summary} />}
      >
        <Textarea id="summary" className="min-h-20" aria-invalid={!!e.summary} {...register("summary")} />
      </Field>
      <Field
        id="story"
        label="Your story"
        hint="What happened, what the bill is for, and how help would change things. Avoid sharing sensitive details."
        error={e.story?.message}
        counter={<CharCounter value={story} {...TEXT_LIMITS.story} />}
      >
        <Textarea id="story" className="min-h-48" aria-invalid={!!e.story} {...register("story")} />
      </Field>
    </div>
  );
}

/* ---------------- Review ---------------- */

function ReviewSection({ id, title, step, goTo, children }: { id: string; title: string; step: number; goTo: (s: number) => void; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`review-${id}`} className="grid min-w-0 gap-3 rounded-2xl border p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id={`review-${id}`} className="text-sm font-semibold">
          {title}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => goTo(step)} aria-label={`Edit ${title}`}>
          <PencilLine /> Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-0.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function ReviewStep({
  form,
  doc,
  rememberedDoc,
  email,
  requireDocument,
  goTo,
}: {
  form: Form;
  doc: SelectedDocument | null;
  rememberedDoc?: DocumentMeta;
  email: string;
  requireDocument: boolean;
  goTo: (s: number) => void;
}) {
  const [storyOpen, setStoryOpen] = React.useState(false);
  const v = form.getValues();
  const e = form.formState.errors;
  const country = COUNTRY_MAP[v.country];
  const hasAmount = !!v.currency && Number.isFinite(v.amount);
  const items = v.breakdown ?? [];
  const itemsTotal = items.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0);
  const itemsMatch = hasAmount && Math.abs(itemsTotal - v.amount) < 0.005;
  const story = v.story?.trim() ?? "";
  const longStory = story.length > STORY_EXCERPT;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Check everything below. Use Edit to jump back to a step — your answers are kept.</p>

      <ReviewSection id="you" title="You" step={0} goTo={goTo}>
        <dl className="grid gap-3">
          <ReviewRow label="Display name">{v.name || "—"}</ReviewRow>
          <ReviewRow label="Location">{v.city ? `${v.city}, ${country?.flag} ${country?.name}` : `${country?.flag} ${country?.name}`}</ReviewRow>
          <ReviewRow label="Contact email">
            {email} <span className="font-normal text-muted-foreground">· never shown publicly</span>
          </ReviewRow>
        </dl>
      </ReviewSection>

      <ReviewSection id="bill" title="Bill" step={2} goTo={goTo}>
        <dl className="grid gap-3">
          <ReviewRow label="Category">
            <span className="flex flex-wrap items-center gap-2">
              {v.category ? <CategoryBadge category={v.category} /> : "—"}
              <button type="button" className="text-xs font-normal text-primary underline-offset-2 hover:underline" onClick={() => goTo(1)}>
                Change category
              </button>
            </span>
          </ReviewRow>
          <ReviewRow label="Amount outstanding">
            {hasAmount ? formatCurrency(v.amount, v.currency, { decimals: true }) : "—"}
            {hasAmount && v.currency !== "USD" && (
              <span className="block text-xs font-normal text-muted-foreground">
                ≈ {formatCurrency(toUsd(v.amount, v.currency), "USD")} at fixed demo rates, not live exchange rates
              </span>
            )}
          </ReviewRow>
          <ReviewRow label="Currency">{CURRENCIES.find((c) => c.code === v.currency)?.name ?? v.currency}</ReviewRow>
        </dl>
      </ReviewSection>

      <ReviewSection id="breakdown" title="Breakdown" step={2} goTo={goTo}>
        {items.length ? (
          <div className="grid gap-2 text-sm">
            <ul className="grid gap-1.5">
              {items.map((it, i) => (
                <li key={i} className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="min-w-0 break-words">{it.label || `Item ${i + 1}`}</span>
                  <span className="shrink-0 tabular-nums">{Number.isFinite(it.amount) ? formatCurrency(it.amount, v.currency, { decimals: true }) : "—"}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between gap-3 border-t pt-2 font-semibold">
              <span>Total itemised</span>
              <span className="tabular-nums">{formatCurrency(itemsTotal, v.currency, { decimals: true })}</span>
            </div>
            <p className={cn("flex items-center gap-1.5 text-xs", itemsMatch ? "text-emerald-700 dark:text-emerald-300" : "text-destructive")}>
              {itemsMatch ? <Check className="size-3.5 shrink-0" /> : <TriangleAlert className="size-3.5 shrink-0" />}
              {itemsMatch ? "Matches the amount outstanding" : "Doesn't match the amount outstanding"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not itemised. Itemised bills are easier for donors to trust.</p>
        )}
      </ReviewSection>

      <ReviewSection id="due" title="Due date" step={3} goTo={goTo}>
        <p className="text-sm font-medium">
          {v.dueDate ? (
            <>
              {formatDate(v.dueDate + "T12:00:00")} <span className="font-normal text-muted-foreground">· {dueLabel(v.dueDate + "T12:00:00")}</span>
            </>
          ) : (
            "—"
          )}
        </p>
      </ReviewSection>

      <ReviewSection id="story" title="Story" step={4} goTo={goTo}>
        <div className="grid gap-1 rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Card preview</p>
          <p className="break-words font-semibold">{v.title || "—"}</p>
          <p className="break-words text-sm text-muted-foreground">{v.summary || "—"}</p>
        </div>
        <div className="grid gap-1.5">
          <p id="review-story-text" className="whitespace-pre-line break-words text-sm leading-relaxed">
            {storyOpen || !longStory ? story || "—" : `${story.slice(0, STORY_EXCERPT).trimEnd()}…`}
          </p>
          {longStory && (
            <button
              type="button"
              aria-expanded={storyOpen}
              aria-controls="review-story-text"
              className="justify-self-start text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setStoryOpen((o) => !o)}
            >
              {storyOpen ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      </ReviewSection>

      <ReviewSection id="document" title="Document" step={5} goTo={goTo}>
        {doc ? (
          <dl className="grid gap-3">
            <ReviewRow label="File">{doc.file.name}</ReviewRow>
            <ReviewRow label="Type and size">
              {docKindLabel(doc.file.type)} · {formatBytes(doc.file.size)}
            </ReviewRow>
            <ReviewRow label="Privacy">
              <span className="font-normal text-muted-foreground">Stays on this device. Only the name, type and size are kept.</span>
            </ReviewRow>
          </dl>
        ) : (
          <p className={cn("text-sm", requireDocument ? "text-destructive" : "text-muted-foreground")}>
            {rememberedDoc
              ? `Not selected. Your draft remembered “${rememberedDoc.name}”, but files are never stored — select it again.`
              : "None selected."}
            {requireDocument && " A document is required in the current demo settings."}
          </p>
        )}
      </ReviewSection>

      <div className="grid gap-3 pt-1">
        <label htmlFor="truthful" className="flex items-start gap-3 text-sm">
          <Checkbox
            id="truthful"
            checked={form.watch("truthful")}
            onCheckedChange={(c) => form.setValue("truthful", c === true, { shouldValidate: true })}
            aria-invalid={!!e.truthful}
            aria-describedby={e.truthful ? "truthful-error" : undefined}
          />
          <span>The information I&apos;ve provided is accurate to the best of my knowledge.</span>
        </label>
        <FieldErrorText message={e.truthful?.message} id="truthful-error" />
        <label htmlFor="understand" className="flex items-start gap-3 text-sm">
          <Checkbox
            id="understand"
            checked={form.watch("understand")}
            onCheckedChange={(c) => form.setValue("understand", c === true, { shouldValidate: true })}
            aria-invalid={!!e.understand}
            aria-describedby={e.understand ? "understand-error" : undefined}
          />
          <span>I understand BillSwipe is a prototype: my request is demo data, and no real money will be raised or paid out.</span>
        </label>
        <FieldErrorText message={e.understand?.message} id="understand-error" />
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
  /** Effective per-request limit: the lower of the platform limit and the category's own limit. */
  const limitFor = React.useCallback(
    (category: CategoryId | undefined) => {
      const cat = categorySettings.find((c) => c.id === category);
      return cat ? Math.min(settings.maxRequestUsd, cat.maxAmountUsd) : settings.maxRequestUsd;
    },
    [categorySettings, settings.maxRequestUsd],
  );
  const createRequest = useRequestsStore((s) => s.createRequest);
  const push = useNotificationsStore((s) => s.push);
  const saveDraft = useSubmitDraftStore((s) => s.saveDraft);
  const clearDraft = useSubmitDraftStore((s) => s.clearDraft);
  const reduced = useReducedMotion();
  const userId = session?.userId;

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [doc, setDoc] = React.useState<SelectedDocument | null>(null);
  const [docAck, setDocAck] = React.useState(false);
  const [docError, setDocError] = React.useState<string>();
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  /** True once the user picks a currency themselves; country changes then stop overriding it. */
  const [currencyTouched, setCurrencyTouched] = React.useState(false);
  /** Metadata of a document from a restored draft (the file itself is never stored). */
  const [rememberedDoc, setRememberedDoc] = React.useState<DocumentMeta>();
  /** A saved draft found on arrival. Auto-save is paused until the user resumes or starts over. */
  const [resumeDraft, setResumeDraft] = React.useState<SubmitDraft | null>(() => {
    const d = userId ? useSubmitDraftStore.getState().drafts[userId] : undefined;
    return isUsableDraft(d) ? d : null;
  });
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  /** Step whose error summary is showing (set when Continue / Submit fails). */
  const [summaryStep, setSummaryStep] = React.useState<number | null>(null);
  const [focusTarget, setFocusTarget] = React.useState<{ id: string; n: number } | null>(null);

  const defaultValues = React.useMemo<SubmitValues>(() => {
    const [first, last] = (session?.name ?? "").split(" ");
    const country = session?.country ?? "US";
    return {
      name: session ? `${first} ${last?.[0] ?? ""}${last ? "." : ""}`.trim() : "",
      country,
      city: "",
      category: undefined as unknown as CategoryId,
      currency: COUNTRY_MAP[country].currency,
      amount: undefined as unknown as number,
      breakdown: [],
      dueDate: "",
      title: "",
      summary: "",
      story: "",
      truthful: false,
      understand: false,
    };
  }, [session]);

  const schema = React.useMemo(() => buildSubmitSchema(limitFor), [limitFor]);
  const form = useForm<SubmitValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  /* ----- Draft auto-save ----- */
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const latestRef = React.useRef({ step, doc, currencyTouched, rememberedDoc, paused: true });
  React.useEffect(() => {
    latestRef.current = { step, doc, currencyTouched, rememberedDoc, paused: !!resumeDraft || !!submitted };
  });

  const saveNow = React.useCallback(() => {
    if (!userId) return;
    const l = latestRef.current;
    const meta = l.doc ? { name: l.doc.file.name, type: l.doc.file.type, size: l.doc.file.size } : l.rememberedDoc;
    const draft = draftFrom(form.getValues(), l.step, l.currencyTouched, meta);
    saveDraft(userId, draft);
    setLastSavedAt(draft.savedAt);
  }, [form, saveDraft, userId]);

  const scheduleSave = React.useCallback(() => {
    if (!dirtyRef.current || latestRef.current.paused) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined;
      saveNow();
    }, AUTOSAVE_MS);
  }, [saveNow]);

  React.useEffect(() => {
    const sub = form.watch((_, info) => {
      if (!info.name) return; // resets (resume / start over) aren't user edits
      dirtyRef.current = true;
      scheduleSave();
    });
    return () => sub.unsubscribe();
  }, [form, scheduleSave]);

  React.useEffect(() => {
    scheduleSave();
  }, [step, doc, currencyTouched, scheduleSave]);

  // Flush a pending save when leaving the page.
  React.useEffect(
    () => () => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      if (!latestRef.current.paused) saveNow();
    },
    [saveNow],
  );

  // Revoke the object URL when the document changes or the page is left
  React.useEffect(() => () => {
    if (doc) URL.revokeObjectURL(doc.url);
  }, [doc]);

  React.useEffect(() => {
    if (!focusTarget) return;
    const raf = requestAnimationFrame(() => focusById(focusTarget.id, reduced));
    return () => cancelAnimationFrame(raf);
  }, [focusTarget, reduced]);

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

  const goTo = (target: number, focusId?: string) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
    setFocusTarget({ id: focusId ?? "step-heading", n: Date.now() });
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  const docIssue = (message: string): Issue => ({ id: docAck ? "bill-doc-choose" : "doc-ack", label: "Bill document", message });

  /** Shows the step's error summary and focuses its first problem. */
  const failStep = (s: number, issues: Issue[]) => {
    setSummaryStep(s);
    if (s === step) focusById(issues[0]?.id, reduced);
    else goTo(s, issues[0]?.id);
  };

  const next = async () => {
    const fields = STEP_FIELDS[step];
    const ok = fields.length ? await form.trigger(fields) : true;
    if (!ok) return failStep(step, issuesFor(step, form.formState.errors));
    if (step === 2) {
      // Cross-field checks: the schema's object-level refinements only run once every step is filled in.
      const { amount, currency, category, breakdown } = form.getValues();
      const overLimit = amountLimitError(amount, currency, limitFor(category));
      if (overLimit) {
        form.setError("amount", { type: "custom", message: overLimit });
        return failStep(2, [{ id: "amount", label: FIELD_LABELS.amount, message: overLimit }]);
      }
      const mismatch = breakdownMismatch(amount, currency, breakdown);
      if (mismatch) {
        form.setError("breakdown", { type: "custom", message: mismatch });
        return failStep(2, [{ id: "bd-amount-0", label: FIELD_LABELS.breakdown, message: mismatch }]);
      }
    }
    if (step === 5) {
      if (settings.requireDocument && !doc) {
        setDocError(DOC_REQUIRED_MESSAGE);
        return failStep(5, [docIssue(DOC_REQUIRED_MESSAGE)]);
      }
      setDocError(undefined);
    }
    setSummaryStep(null);
    goTo(step + 1);
  };

  const onInvalid = (errors: FieldErrors<SubmitValues>) => {
    const s = STEP_FIELDS.findIndex((fields) => fields.some((f) => errors[f]));
    if (s >= 0) failStep(s, issuesFor(s, errors));
  };

  const resume = () => {
    if (!resumeDraft) return;
    const target = clampStep(resumeDraft.step);
    const remembered = docMetaFrom(resumeDraft.document);
    form.reset(valuesFromDraft(resumeDraft, defaultValues));
    setCurrencyTouched(resumeDraft.currencyTouched === true);
    setRememberedDoc(remembered);
    setLastSavedAt(resumeDraft.savedAt);
    setResumeDraft(null);
    setSummaryStep(null);
    dirtyRef.current = true;
    goTo(target);
    toast.success("Draft restored", {
      description: remembered ? `Select “${remembered.name}” again on the Document step — files are never stored.` : undefined,
    });
  };

  const startOver = () => {
    clearDraft(session.userId);
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    dirtyRef.current = false;
    form.reset(defaultValues);
    setResumeDraft(null);
    setDoc(null);
    setDocAck(false);
    setDocError(undefined);
    setRememberedDoc(undefined);
    setCurrencyTouched(false);
    setLastSavedAt(null);
    setSummaryStep(null);
    goTo(0);
    toast("Draft discarded. Starting a new request.");
  };

  const saveDraftNow = () => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    dirtyRef.current = true;
    saveNow();
    toast.success("Draft saved on this device", {
      description: "Your document isn't saved — files are never stored, so you'll select it again when you come back.",
    });
  };

  const onSubmit = async (values: SubmitValues) => {
    if (settings.requireDocument && !doc) {
      setDocError(DOC_REQUIRED_MESSAGE);
      failStep(5, [docIssue(DOC_REQUIRED_MESSAGE)]);
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
      breakdown: values.breakdown.length
        ? values.breakdown.map((b) => ({ label: b.label.trim(), amount: Math.round(b.amount * 100) / 100 }))
        : undefined,
      // Metadata only — the file itself is discarded.
      document: doc ? { name: doc.file.name, type: doc.file.type, sizeKb: Math.round(doc.file.size / 1024) } : undefined,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    // The request exists now, so the draft is no longer needed.
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
    dirtyRef.current = false;
    clearDraft(session.userId);
    setLastSavedAt(null);
    setRememberedDoc(undefined);
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
          <Card className="grid justify-items-center gap-5 p-6 text-center sm:p-10">
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
                setDocError(undefined);
                setCurrencyTouched(false);
                setSummaryStep(null);
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

  const isReview = step === STEPS.length - 1;
  const currentIssues = step === 5 ? (docError ? [docIssue(docError)] : []) : issuesFor(step, form.formState.errors);
  const draftStep = resumeDraft ? clampStep(resumeDraft.step) : 0;
  const draftTitle = resumeDraft ? str(resumeDraft.values.title).trim() : "";

  return (
    <PageContainer className="max-w-6xl">
      <div className="mb-8 grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Submit a bill</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Share a genuine outstanding bill</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Seven short steps. Your request goes to a moderation queue before it appears to donors. <FictionalTag className="ml-1 align-middle" />
        </p>
      </div>

      {resumeDraft && (
        <section
          aria-labelledby="draft-banner-title"
          className="mb-6 grid gap-4 rounded-3xl border border-primary/30 bg-primary/6 p-4 sm:flex sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex min-w-0 gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <FileClock className="size-5" />
            </span>
            <div className="grid min-w-0 gap-1">
              <h2 id="draft-banner-title" className="font-semibold">
                Resume your draft from {savedLabel(resumeDraft.savedAt)}
              </h2>
              <p className="break-words text-sm text-muted-foreground">
                You&apos;d reached step {draftStep + 1} of {STEPS.length} ({STEPS[draftStep].title})
                {draftTitle && <> for &ldquo;{draftTitle}&rdquo;</>}. Bill documents are never saved, so you&apos;ll need to select yours again.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline">
                  Start over
                </Button>
              }
              title="Start over?"
              description="This discards your saved draft on this device and starts a new request. It can't be undone."
              confirmLabel="Discard draft"
              destructive
              onConfirm={startOver}
            />
            <Button type="button" onClick={resume}>
              Resume draft
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        {/* Stepper */}
        <nav aria-label="Submission steps" className="grid min-w-0 gap-4 lg:sticky lg:top-24 lg:self-start">
          <ProgressPanel step={step} />
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
          <div className="hidden items-center gap-3 rounded-2xl border p-4 lg:flex">
            <DemoAvatar seed={session.image} className="size-9" label={session.name} />
            <div className="min-w-0 text-xs">
              <p className="truncate font-medium">{session.name}</p>
              <p className="text-muted-foreground">Requester · demo</p>
            </div>
          </div>
        </nav>

        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate className="min-w-0">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b p-4 sm:px-8 sm:py-6">
              <h2 id="step-heading" tabIndex={-1} className="text-lg font-semibold outline-none">
                {STEPS[step].title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {lastSavedAt && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CloudCheck className="size-3.5" aria-hidden /> Saved {savedLabel(lastSavedAt)}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveDraftNow}
                  disabled={!!resumeDraft}
                  title={resumeDraft ? "Resume or discard your earlier draft first" : undefined}
                >
                  <Save /> Save draft
                </Button>
              </div>
            </div>
            <div className="relative p-4 sm:p-8">
              {summaryStep === step && currentIssues.length > 0 && (
                <ErrorSummary issues={currentIssues} final={isReview} onSelect={(id) => focusById(id, reduced)} />
              )}
              {/* Entrance-only transition: the new step renders immediately (no blocking exit animation). */}
              <motion.div
                key={step}
                initial={reduced ? false : { opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
              >
                {step === 0 && <PersonalStep form={form} email={session.email} currencyTouched={currencyTouched} />}
                {step === 1 && <CategoryStep form={form} settings={categorySettings} />}
                {step === 2 && (
                  <AmountStep
                    form={form}
                    maxUsd={limitFor(form.getValues("category"))}
                    currencyTouched={currencyTouched}
                    onCurrencyTouched={setCurrencyTouched}
                  />
                )}
                {step === 3 && <DueDateStep form={form} />}
                {step === 4 && <StoryStep form={form} />}
                {step === 5 && (
                  <DocumentStep
                    doc={doc}
                    onChange={(d) => {
                      setDoc(d);
                      dirtyRef.current = true;
                      if (d) {
                        setDocError(undefined);
                        setRememberedDoc(undefined);
                      }
                    }}
                    acknowledged={docAck}
                    onAcknowledge={setDocAck}
                    error={docError}
                    required={settings.requireDocument}
                    rememberedDoc={rememberedDoc}
                  />
                )}
                {step === 6 && (
                  <ReviewStep
                    form={form}
                    doc={doc}
                    rememberedDoc={rememberedDoc}
                    email={session.email}
                    requireDocument={settings.requireDocument}
                    goTo={goTo}
                  />
                )}
              </motion.div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-4 sm:px-8">
              <Button type="button" variant="ghost" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <ArrowLeft /> Back
              </Button>
              {!isReview ? (
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
          <p className="mt-3 text-xs text-muted-foreground">
            Progress is saved automatically on this device. Bill documents are never saved — you&apos;d select yours again after a break.
          </p>
          {step === 1 && form.watch("category") && (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5 shrink-0" />{" "}
              {categorySettings.find((c) => c.id === form.watch("category"))?.description ?? CATEGORY_MAP[form.watch("category")].description}
            </p>
          )}
        </form>
      </div>
    </PageContainer>
  );
}
