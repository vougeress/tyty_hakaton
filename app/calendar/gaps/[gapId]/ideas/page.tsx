import { notFound } from "next/navigation";
import { IdeasScreen } from "@/components/ideas-screen";
import { mockIdeasRepository } from "@/lib/ideas";

export default async function IdeasPage({ params }: { params: Promise<{ gapId: string }> }) {
  const { gapId } = await params;
  const preset = mockIdeasRepository.getPreset(gapId);
  if (!preset) notFound();

  return <IdeasScreen preset={preset} />;
}
