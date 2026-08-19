import { notFound } from "next/navigation";
import { RescheduleEventScreen } from "@/components/reschedule-event-screen";
import { createPostgresConflictRepository } from "@/lib/audit/postgres-conflict-repository";
import { createTripService } from "@/lib/trips";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function RescheduleEventPage({
  params,
  searchParams
}: {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ conflictId?: string }>;
}) {
  const [{ itemId }, { conflictId }] = await Promise.all([params, searchParams]);
  if (!conflictId) notFound();

  const tripId = await getCurrentTripId();
  const service = createTripService();
  const [trip, event, conflict] = await Promise.all([
    service.getTrip(tripId),
    service.getEvent(itemId),
    createPostgresConflictRepository().getConflict(tripId, conflictId)
  ]);
  if (!trip || !event || event.tripId !== tripId || !conflict || !conflict.relatedEvents.some(({ id }) => id === itemId)) {
    notFound();
  }

  return <RescheduleEventScreen context={{
    conflictId,
    eventId: event.id,
    title: event.title,
    locationName: event.location?.name ?? "",
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: trip.timezone,
    currentParticipantId: trip.ownerId,
    participantNames: trip.participants
      .filter(({ id }) => event.participantIds.includes(id))
      .map(({ displayName }) => displayName),
    backHref: `/conflicts/${encodeURIComponent(conflictId)}`
  }} />;
}
