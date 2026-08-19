import { CalendarScreen } from "@/components/calendar-screen";
import { TripsEmptyState } from "@/components/trips-screen";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const tripId = await getCurrentTripId();
  const preset = await createPostgresCalendarRepository().getWeek(tripId);
  if (!preset) return <TripsEmptyState />;
  return <CalendarScreen preset={preset} />;
}
