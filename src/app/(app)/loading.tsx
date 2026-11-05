import { PageSkeleton } from "@/components/layout/require-auth";

/** Shown while an app route's code loads during navigation. */
export default function AppLoading() {
  return <PageSkeleton />;
}
