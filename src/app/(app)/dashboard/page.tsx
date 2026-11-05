"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RequireAuth, PageSkeleton } from "@/components/layout/require-auth";
import { dashboardPath } from "@/components/layout/user-menu";
import { useAuthStore } from "@/store/auth-store";

function Redirector() {
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  React.useEffect(() => {
    if (session) router.replace(dashboardPath(session.role));
  }, [session, router]);
  return <PageSkeleton />;
}

export default function DashboardIndexPage() {
  return (
    <RequireAuth>
      <Redirector />
    </RequireAuth>
  );
}
