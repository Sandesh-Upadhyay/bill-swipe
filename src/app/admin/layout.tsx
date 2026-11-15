import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { RouteGuard } from "@/components/auth/route-guard";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · BillSwipe" },
  robots: { index: false },
};

/**
 * Real accounts need is_admin() = true in the database (checked on the server by RouteGuard).
 * Demo sessions keep the browser-only demo moderation console, which manages fictional data.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard path="/admin" requireAdmin>
      <AdminShell>{children}</AdminShell>
    </RouteGuard>
  );
}
