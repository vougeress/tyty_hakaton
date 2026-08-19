import { notFound } from "next/navigation";
import { ManualEventScreen } from "@/components/manual-event-screen";
import { createManualEventContextService } from "@/lib/manual-event-context";
import { mockManualEventRepository } from "@/lib/manual-event-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function ManualPage({ params }: { params: Promise<{ gapId: string }> }) {
  const { gapId } = await params;
  const context = process.env.E2E_MOCK_MODE === "1"
    ? await mockManualEventRepository.getContext(gapId)
    : await createManualEventContextService().getContext(await getCurrentTripId(), gapId);
  if (!context) notFound();

  return <ManualEventScreen context={context} />;
}
