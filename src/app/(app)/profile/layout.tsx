import type { Metadata } from "next";
import { RouteGuard } from "@/components/auth/route-guard";

export const metadata: Metadata = { title: "Profile & settings" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RouteGuard path="/profile">{children}</RouteGuard>;
}
