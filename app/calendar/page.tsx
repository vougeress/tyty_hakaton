import { CalendarScreen } from "@/components/calendar-screen";
import { TripsEmptyState } from "@/components/trips-screen";
import { mockCalendarRepository } from "@/lib/calendar-repository";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  if (process.env.E2E_MOCK_MODE === "1") {
    return <CalendarScreen preset={await mockCalendarRepository.getCalendarPreset()} mockMode />;
  }

  const tripId = await getCurrentTripId();
  const preset = await createPostgresCalendarRepository().getWeek(tripId);
  if (!preset) return <TripsEmptyState />;
  return <CalendarScreen preset={preset} />;
}
