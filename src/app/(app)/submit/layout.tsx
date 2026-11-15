import { RouteGuard } from "@/components/auth/route-guard";

export default function SubmitLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard path="/submit">{children}</RouteGuard>;
}
