"use client";

import { Accordion } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/data/content";

export function FaqAccordion() {
  return (
    <Accordion.Root type="single" collapsible defaultValue="item-0" className="grid gap-3">
      {FAQ.map((f, i) => (
        <Accordion.Item key={f.q} value={`item-${i}`} className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-medium outline-none transition hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden text-sm leading-relaxed text-muted-foreground data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="px-5 pb-5">{f.a}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
