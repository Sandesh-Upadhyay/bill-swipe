import { PageSkeleton } from "@/components/layout/require-auth";

/** Shown while an admin route's code loads during navigation. */
export default function AdminLoading() {
  return <PageSkeleton />;
}
