import { TripsEmptyState, TripsScreen, type TripsViewModel } from "@/components/trips-screen";
import { createTripService } from "@/lib/trips";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const service = createTripService();
  const [trip, archivedTrips] = await Promise.all([
    service.getTrip(await getCurrentTripId()),
    service.getArchivedTrips(10)
  ]);
  if (!trip) return <TripsEmptyState />;

  const startDay = new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone: trip.timezone }).format(trip.startsAt);
  const endLabel = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: trip.timezone }).format(trip.endsAt);
  const viewModel: TripsViewModel = {
    id: trip.id,
    title: trip.title,
    dateLabel: `${startDay}–${endLabel}`,
    inviteCode: trip.inviteCode,
    ownerId: trip.ownerId,
    participants: trip.participants.map(({ id, displayName, role }) => ({ id, displayName, role })),
    archivedTrips: archivedTrips.map((archivedTrip) => ({
      id: archivedTrip.id,
      title: archivedTrip.title,
      dateLabel: new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric",
        timeZone: archivedTrip.timezone
      }).format(archivedTrip.startsAt)
    }))
  };

  return <TripsScreen trip={viewModel} />;
}
