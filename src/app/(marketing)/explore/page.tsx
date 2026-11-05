import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/page-parts";
import { ExploreBrowser } from "@/components/marketing/explore-browser";

export const metadata: Metadata = { title: "Explore requests" };

export default function ExplorePage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Explore"
        title="Browse bill requests"
        description="Every request here is fictional demo content. Documents are never shown publicly — only the requester's story and simulated progress."
        actions={
          <Button asChild>
            <Link href="/discover">
              <Sparkles /> Switch to swipe mode
            </Link>
          </Button>
        }
      />
      <ExploreBrowser />
    </PageContainer>
  );
}
