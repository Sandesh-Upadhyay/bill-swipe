import type { Metadata } from "next";
import { Building2, Handshake, Mail, Newspaper } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout/page-parts";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact" };

const CHANNELS = [
  { icon: Building2, title: "Investors", body: "Deck, roadmap and prototype walkthroughs." },
  { icon: Handshake, title: "Partners", body: "Utilities, landlords, hospitals, schools, NGOs and payment providers." },
  { icon: Newspaper, title: "Press", body: "Interviews and background on the BillSwipe concept." },
  { icon: Mail, title: "Early users", body: "Feedback that shapes the first live pilot." },
];

export default function ContactPage() {
  return (
    <PageContainer className="py-14 sm:py-20">
      <PageHeader
        eyebrow="Contact"
        title="Let's talk"
        description="Whether you're an investor, potential partner or early user, we'd love to hear from you."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-4">
          {CHANNELS.map((c) => (
            <div key={c.title} className="flex gap-4 rounded-3xl border bg-card p-5 shadow-soft">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                <c.icon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold tracking-tight">{c.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <ContactForm />
      </div>
    </PageContainer>
  );
}
