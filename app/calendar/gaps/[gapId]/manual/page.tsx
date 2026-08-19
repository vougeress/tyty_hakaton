import { notFound } from "next/navigation";
import { ManualEventScreen } from "@/components/manual-event-screen";
import { mockManualEventRepository } from "@/lib/manual-event-repository";

export default async function ManualPage({ params }: { params: Promise<{ gapId: string }> }) {
  const { gapId } = await params;
  const context = await mockManualEventRepository.getContext(gapId);
  if (!context) notFound();

  return <ManualEventScreen context={context} />;
}
