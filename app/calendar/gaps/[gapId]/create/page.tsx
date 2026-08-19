import { notFound } from "next/navigation";
import { CreateEventScreen } from "@/components/create-event-screen";
import { mockManualEventRepository } from "@/lib/manual-event-repository";

export default async function CreatePage({ params }: { params: Promise<{ gapId: string }> }) {
  const { gapId } = await params;
  const context = await mockManualEventRepository.getContext(gapId);
  if (!context) notFound();

  return <CreateEventScreen context={context} />;
}
