import { notFound } from "next/navigation";
import { EventScreen } from "@/components/event-screen";
import { CalendarScreen } from "@/components/calendar-screen";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const repository = createPostgresCalendarRepository();
  const tripId = await getCurrentTripId();
  const [result, calendar] = await Promise.all([
    repository.getEvent(itemId, tripId),
    repository.getWeek(tripId)
  ]);

  if (!result || !calendar) notFound();

  return <EventScreen
    event={result.event}
    participants={result.participants}
    calendarBackground={<CalendarScreen preset={calendar} embedded />}
  />;
}
