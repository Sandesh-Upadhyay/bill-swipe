"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, NativeSelect, Textarea } from "@/components/ui/basic";
import { Label } from "@/components/ui/primitives";

const TOPICS = ["Investor enquiry", "Partnership (billers, NGOs, payments)", "Early user feedback", "Press", "Something else"] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  email: z.email("Enter a valid email address"),
  topic: z.enum(TOPICS, { message: "Choose a topic" }),
  message: z.string().trim().min(20, "Tell us a little more (at least 20 characters)").max(1000, "Keep it under 1000 characters"),
});
type Values = z.infer<typeof schema>;

export function ContactForm() {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", message: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (v: Values) => {
    await new Promise((r) => setTimeout(r, 700));
    setSentTo(v.name.split(" ")[0]);
    form.reset({ name: "", email: "", message: "" });
  };

  if (sentTo) {
    return (
      <div className="grid justify-items-center gap-4 rounded-3xl border bg-card p-10 text-center shadow-soft" role="status">
        <span className="grid size-16 place-items-center rounded-full bg-primary/12 text-primary">
          <CheckCircle2 className="size-8" />
        </span>
        <h2 className="text-xl font-semibold">Thanks, {sentTo}!</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This is a prototype, so your message wasn&apos;t actually sent or stored anywhere. In the live product, our team would reply
          within two working days.
        </p>
        <Button variant="outline" onClick={() => setSentTo(null)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-5 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-name">Full name</Label>
          <Input id="c-name" autoComplete="name" aria-invalid={!!errors.name} aria-describedby="c-name-err" {...form.register("name")} />
          <FieldError id="c-name-err" message={errors.name?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby="c-email-err"
            {...form.register("email")}
          />
          <FieldError id="c-email-err" message={errors.email?.message} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-topic">Topic</Label>
        <NativeSelect id="c-topic" defaultValue="" aria-invalid={!!errors.topic} aria-describedby="c-topic-err" {...form.register("topic")}>
          <option value="" disabled>
            Choose a topic
          </option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <FieldError id="c-topic-err" message={errors.topic?.message} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="c-message">Message</Label>
        <Textarea
          id="c-message"
          className="min-h-36"
          aria-invalid={!!errors.message}
          aria-describedby="c-message-err"
          placeholder="How can we help?"
          {...form.register("message")}
        />
        <FieldError id="c-message-err" message={errors.message?.message} />
      </div>
      <p className="text-xs text-muted-foreground">Prototype notice: this form is simulated. Nothing you type is sent or stored.</p>
      <Button type="submit" size="lg" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />} Send message
      </Button>
    </form>
  );
}
