import type { Metadata } from "next";
import { RequireAuth } from "@/components/layout/require-auth";
import { DiscoverFeed } from "@/components/discover/discover-feed";

export const metadata: Metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <RequireAuth>
      <DiscoverFeed />
    </RequireAuth>
  );
}
