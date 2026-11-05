"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  HandHeart,
  CalendarClock,
  Receipt,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, CountryCode, Role } from "@/lib/types";
import { CATEGORIES, COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FieldError, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Label, Progress } from "@/components/ui/primitives";
import { DemoAvatar } from "@/components/brand/demo-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useAdminStore } from "@/store/admin-store";

const STEPS = ["Your role", "Profile", "Preferences", "All set"];

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter a display name (2+ characters)").max(60, "Keep it under 60 characters"),
  country: z.enum(COUNTRIES.map((c) => c.code) as [CountryCode, ...CountryCode[]], { message: "Choose your country" }),
  bio: z.string().max(160, "Keep your bio under 160 characters"),
});

const ROLE_OPTIONS: { role: Exclude<Role, "admin">; title: string; body: string; icon: LucideIcon; perks: string[] }[] = [
  {
    role: "donor",
    title: "I want to help",
    body: "Discover genuine bills and support people when you're ready.",
    icon: HandHeart,
    perks: ["Swipe through requests", "Save and shortlist", "Track your simulated impact"],
  },
  {
    role: "requester",
    title: "I need help with a bill",
    body: "Share an essential bill and a short story with people who care.",
    icon: FileText,
    perks: ["Guided 7-step request", "Private document review", "Track simulated progress"],
  },
];

const PREPARE: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Receipt, title: "Your bill", body: "A photo or PDF of the bill. It's only used for review and never shown publicly." },
  { icon: CalendarClock, title: "The due date", body: "When the bill needs to be paid, so donors understand urgency." },
  { icon: Sparkles, title: "A short, honest story", body: "A few sentences about your situation. No need to share more than you're comfortable with." },
  { icon: ShieldCheck, title: "Patience with review", body: "Moderators may ask for more information before your request goes live." },
];

export function OnboardingWizard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const session = useAuthStore((s) => s.session);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const upsertUser = useAdminStore((s) => s.upsertUser);

  const [step, setStep] = React.useState(0);
  const [direction, setDirection] = React.useState(1);
  const [role, setRole] = React.useState<Exclude<Role, "admin"> | null>(
    session && session.role !== "admin" && session.onboarded ? session.role : null,
  );
  const [name, setName] = React.useState(session?.name ?? "");
  const [country, setCountry] = React.useState<string>(session?.country ?? "");
  const [bio, setBio] = React.useState(session?.bio ?? "");
  const [interests, setInterests] = React.useState<CategoryId[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [finishing, setFinishing] = React.useState(false);

  if (!session) return null;

  const go = (to: number) => {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  };

  const next = () => {
    if (step === 0) {
      if (!role) {
        setErrors({ role: "Choose how you'd like to use BillSwipe" });
        return;
      }
      setErrors({});
    }
    if (step === 1) {
      const res = profileSchema.safeParse({ name, country, bio });
      if (!res.success) {
        const errs: Record<string, string> = {};
        for (const issue of res.error.issues) errs[String(issue.path[0])] = issue.message;
        setErrors(errs);
        return;
      }
      setErrors({});
    }
    go(step + 1);
  };

  const finish = async () => {
    if (!role) return;
    setFinishing(true);
    await new Promise((r) => setTimeout(r, 450));
    const cc = country as CountryCode;
    updateProfile({ role, name: name.trim(), country: cc, bio: bio.trim() });
    completeOnboarding();
    upsertUser({
      id: session.userId,
      name: name.trim(),
      email: session.email,
      role,
      country: cc,
      bio: bio.trim(),
      memberSince: session.memberSince,
      image: session.image,
      status: "active",
    });
    toast.success("Your demo profile is ready");
    router.push(role === "requester" ? "/dashboard/requester" : "/discover");
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -40 }),
  };

  return (
    <div className="grid gap-7">
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length} · <span className="font-medium text-foreground">{STEPS[step]}</span>
          </span>
          <span className="rounded-full bg-primary/12 px-2 py-0.5 font-medium text-primary">Demo onboarding</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} aria-label={`Onboarding progress: step ${step + 1} of ${STEPS.length}`} />
        <ol className="hidden grid-cols-4 gap-2 sm:grid" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s} className={cn("flex items-center gap-1.5 text-xs", i <= step ? "text-foreground" : "text-muted-foreground")}>
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[10px]",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary text-primary",
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>

      <div className="relative min-h-[380px]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-5"
          >
            {step === 0 && (
              <>
                <div className="grid gap-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight">How will you use BillSwipe?</h1>
                  <p className="text-sm text-muted-foreground">You can switch roles later from your profile.</p>
                </div>
                <div className="grid gap-3" role="radiogroup" aria-label="Choose your role">
                  {ROLE_OPTIONS.map((o) => {
                    const selected = role === o.role;
                    return (
                      <button
                        key={o.role}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setRole(o.role);
                          setErrors({});
                        }}
                        className={cn(
                          "relative flex gap-4 rounded-3xl border bg-card p-5 text-left shadow-soft transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          selected ? "border-primary ring-1 ring-primary" : "hover:border-primary/40 hover:shadow-lift",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-12 shrink-0 place-items-center rounded-2xl",
                            selected ? "bg-primary text-primary-foreground" : "bg-primary/12 text-primary",
                          )}
                        >
                          <o.icon className="size-5" />
                        </span>
                        <span className="grid gap-1">
                          <span className="font-semibold">{o.title}</span>
                          <span className="text-sm text-muted-foreground">{o.body}</span>
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {o.perks.map((p) => (
                              <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {p}
                              </span>
                            ))}
                          </span>
                        </span>
                        {selected && <CheckCircle2 className="absolute right-4 top-4 size-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <FieldError message={errors.role} />
              </>
            )}

            {step === 1 && (
              <>
                <div className="flex items-center gap-4">
                  <DemoAvatar seed={session.image} className="size-14" label="Your generated profile illustration" />
                  <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
                    <p className="text-sm text-muted-foreground">This is what others see. You can upload a photo later.</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ob-name">Display name</Label>
                  <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} aria-describedby="ob-name-err" />
                  <FieldError id="ob-name-err" message={errors.name} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ob-country">Country</Label>
                  <NativeSelect
                    id="ob-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    aria-invalid={!!errors.country}
                    aria-describedby="ob-country-err"
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <FieldError id="ob-country-err" message={errors.country} />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ob-bio">Short bio (optional)</Label>
                    <span className={cn("text-xs tabular-nums", bio.length > 160 ? "text-destructive" : "text-muted-foreground")}>
                      {bio.length}/160
                    </span>
                  </div>
                  <Textarea
                    id="ob-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-24"
                    placeholder={role === "donor" ? "What kinds of requests do you care about?" : "A line about you — keep it as private as you like."}
                    aria-invalid={!!errors.bio}
                    aria-describedby="ob-bio-err"
                  />
                  <FieldError id="ob-bio-err" message={errors.bio} />
                </div>
              </>
            )}

            {step === 2 && role === "donor" && (
              <>
                <div className="grid gap-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight">What do you care about?</h1>
                  <p className="text-sm text-muted-foreground">Pick a few categories. You can always change filters in Discover.</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Categories of interest">
                  {CATEGORIES.map((c) => {
                    const on = interests.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setInterests((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id]))}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left text-sm transition outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                          on ? "border-primary bg-primary/8 ring-1 ring-primary" : "hover:bg-muted",
                        )}
                      >
                        <span className={cn("grid size-9 place-items-center rounded-xl", c.tone)}>
                          <c.icon className="size-4" />
                        </span>
                        <span className="font-medium">{c.label}</span>
                        {on && <Check className="ml-auto size-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Reminder: swiping right only shows interest. Every contribution in this prototype is simulated.
                </p>
              </>
            )}

            {step === 2 && role === "requester" && (
              <>
                <div className="grid gap-1.5">
                  <h1 className="text-2xl font-semibold tracking-tight">What to prepare</h1>
                  <p className="text-sm text-muted-foreground">Having these ready makes your request quick to submit and review.</p>
                </div>
                <ul className="grid gap-3">
                  {PREPARE.map((p) => (
                    <li key={p.title} className="flex gap-3.5 rounded-2xl border bg-card p-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                        <p.icon className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {step === 3 && (
              <div className="grid justify-items-center gap-5 py-6 text-center">
                <motion.span
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="grid size-20 place-items-center rounded-full bg-primary/12 text-primary"
                >
                  <CheckCircle2 className="size-10" />
                </motion.span>
                <div className="grid gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set, {name.split(" ")[0]}</h1>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {role === "donor"
                      ? "Start swiping through fictional requests. Right means interested — it never charges you."
                      : "Head to your dashboard to submit your first bill. Documents stay in your browser in this demo."}
                  </p>
                </div>
                <div className="rounded-2xl border border-dashed px-4 py-3 text-xs text-muted-foreground">
                  Role: <span className="font-medium capitalize text-foreground">{role}</span> · Country:{" "}
                  <span className="font-medium text-foreground">{COUNTRIES.find((c) => c.code === country)?.name}</span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || finishing}>
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={finishing} size="lg">
            {role === "requester" ? "Go to my dashboard" : "Start discovering"} <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  );
}
