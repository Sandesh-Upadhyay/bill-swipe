import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page-parts";
import { FaqAccordion } from "@/components/marketing/faq-accordion";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return (
    <PageContainer className="max-w-3xl py-14 sm:py-20">
      <PageHeader
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Everything you need to know about BillSwipe and this prototype."
      />
      <FaqAccordion />
      <div className="mt-12 flex flex-col items-center gap-3 rounded-3xl border bg-card p-8 text-center shadow-soft">
        <MessageCircleQuestion className="size-7 text-primary" />
        <h2 className="text-lg font-semibold">Still have questions?</h2>
        <p className="text-sm text-muted-foreground">We&apos;d love to hear from investors, partners and early users.</p>
        <Button asChild>
          <Link href="/contact">Contact the team</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
