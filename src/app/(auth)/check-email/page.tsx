import type { Metadata } from "next";
import { CheckEmail } from "@/components/auth/check-email";

export const metadata: Metadata = { title: "Confirm your email", robots: { index: false } };

export default function CheckEmailPage() {
  return <CheckEmail />;
}
