import type { Metadata } from "next";
import { RequireAuth } from "@/components/layout/require-auth";
import { SubmitWizard } from "@/components/submit/submit-wizard";

export const metadata: Metadata = { title: "Submit a bill" };

export default function SubmitPage() {
  return (
    <RequireAuth>
      <SubmitWizard />
    </RequireAuth>
  );
}
