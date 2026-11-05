import type { Metadata } from "next";
import { RequestDetail } from "@/components/requests/request-detail";

export const metadata: Metadata = { title: "Request details" };

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RequestDetail id={id} />;
}
