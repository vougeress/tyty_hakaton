import { notFound } from "next/navigation";
import { EventScreen } from "@/components/event-screen";
import { buildCalendarPreset, buildEventDetails } from "@/lib/calendar-data";
import { createTripService } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const service = createTripService();
  const event = await service.getEvent(itemId);

  if (!event) notFound();

  const trip = await service.getTrip(event.tripId);
  if (!trip) notFound();

  const preset = buildCalendarPreset(trip, [event]);
  const participants = preset.participants.filter((participant) => event.participantIds.includes(participant.id));

  return <EventScreen event={buildEventDetails(event, trip)} participants={participants} />;
}
