import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, ShieldAlert } from "lucide-react";
import { getViewer } from "@/lib/auth/viewer";
import { loginRedirectPath, safeNextPath } from "@/lib/auth/redirects";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "./sign-out-button";

/**
 * Server-side access check for protected routes (rendered in each protected layout).
 *
 *  - Supabase user: session verified with getClaims(); account status and admin rights are
 *    read from the database (profiles.status, is_admin()). Client state is never trusted.
 *  - Demo session (explicit demo cookie): only fictional, browser-local data, so the page
 *    renders and the existing client guards handle demo roles.
 *  - Nobody signed in: redirect to /login?next=<this path>.
 *  - Supabase not configured: the app is demo-only, so client guards apply as before.
 */
export async function RouteGuard({
  path,
  requireAdmin = false,
  allowIncompleteOnboarding = false,
  children,
}: {
  path: string;
  requireAdmin?: boolean;
  allowIncompleteOnboarding?: boolean;
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  if (viewer.kind === "unconfigured" || viewer.kind === "demo") return <>{children}</>;
  if (viewer.kind === "anonymous") redirect(loginRedirectPath(path, { expired: viewer.sessionExpired }));

  const { profile } = viewer;
  if (profile.status === "suspended") return <SuspendedScreen name={profile.displayName} />;
  if (!profile.onboarded && !allowIncompleteOnboarding) redirect(`/onboarding?next=${encodeURIComponent(safeNextPath(path))}`);
  if (requireAdmin && !profile.isAdmin) return <ForbiddenScreen />;
  return <>{children}</>;
}

function SuspendedScreen({ name }: { name: string }) {
  return (
    <main id="main" className="mx-auto grid min-h-[60dvh] max-w-md place-items-center gap-4 px-4 py-24 text-center" role="alert">
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10">
        <Ban className="size-6 text-destructive" />
      </span>
      <h1 className="text-xl font-semibold">This account is suspended</h1>
      <p className="text-sm text-muted-foreground">
        {name}, a moderator has suspended your account, so you can&apos;t use this part of BillSwipe right now. If you think this is a mistake, please
        get in touch.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/contact">Contact us</Link>
        </Button>
        <SignOutButton />
      </div>
    </main>
  );
}

function ForbiddenScreen() {
  return (
    <main id="main" className="mx-auto grid min-h-[60dvh] max-w-md place-items-center gap-4 px-4 py-24 text-center" role="alert">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted">
        <ShieldAlert className="size-6 text-muted-foreground" />
      </span>
      <h1 className="text-xl font-semibold">Administrators only</h1>
      <p className="text-sm text-muted-foreground">Your account doesn&apos;t have moderator access. Administrator access can only be granted by the BillSwipe team.</p>
      <Button asChild>
        <Link href="/discover">Back to Discover</Link>
      </Button>
    </main>
  );
}
