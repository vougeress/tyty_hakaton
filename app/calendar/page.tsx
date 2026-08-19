import { CalendarScreen } from "@/components/calendar-screen";
import { TripsEmptyState } from "@/components/trips-screen";
import { buildCalendarPreset } from "@/lib/calendar-data";
import { createTripService } from "@/lib/trips";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const service = createTripService();
  const tripId = await getCurrentTripId();
  const [trip, events] = await Promise.all([
    service.getTrip(tripId),
    service.getTimeline(tripId)
  ]);
  if (!trip) return <TripsEmptyState />;
  return <CalendarScreen preset={buildCalendarPreset(trip, events)} />;
}
