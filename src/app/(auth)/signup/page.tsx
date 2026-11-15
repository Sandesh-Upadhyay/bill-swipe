import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { Skeleton } from "@/components/ui/basic";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[640px] w-full rounded-3xl" />}>
      <SignupForm />
    </Suspense>
  );
}
