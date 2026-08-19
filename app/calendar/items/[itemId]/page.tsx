import { notFound } from "next/navigation";
import { EventScreen } from "@/components/event-screen";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const result = await createPostgresCalendarRepository().getEvent(itemId, await getCurrentTripId());

  if (!result) notFound();

  return <EventScreen event={result.event} participants={result.participants} />;
}
