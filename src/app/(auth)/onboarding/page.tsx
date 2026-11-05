import type { Metadata } from "next";
import { RequireAuth } from "@/components/layout/require-auth";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { Skeleton } from "@/components/ui/basic";

export const metadata: Metadata = { title: "Welcome" };

export default function OnboardingPage() {
  return (
    <RequireAuth fallback={<Skeleton className="h-[520px] w-full rounded-3xl" />}>
      <OnboardingWizard />
    </RequireAuth>
  );
}
