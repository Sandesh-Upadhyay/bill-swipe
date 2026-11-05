import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/basic";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-3xl" />}>
      <LoginForm />
    </Suspense>
  );
}
