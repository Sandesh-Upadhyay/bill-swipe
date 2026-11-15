import { RouteGuard } from "@/components/auth/route-guard";

/** Server-side access check for every dashboard page (donor and requester). */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard path="/dashboard">{children}</RouteGuard>;
}
