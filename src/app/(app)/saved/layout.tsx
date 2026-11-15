import type { Metadata } from "next";
import { RouteGuard } from "@/components/auth/route-guard";

export const metadata: Metadata = { title: "Saved & interested" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RouteGuard path="/saved">{children}</RouteGuard>;
}
