import { RouteGuard } from "@/components/auth/route-guard";

/** Signed-in users who haven't finished onboarding may stay here; everyone else needs to log in. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard path="/onboarding" allowIncompleteOnboarding>
      {children}
    </RouteGuard>
  );
}
