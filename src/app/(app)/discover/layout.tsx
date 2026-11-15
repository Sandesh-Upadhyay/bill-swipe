import { RouteGuard } from "@/components/auth/route-guard";

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard path="/discover">{children}</RouteGuard>;
}
