import { notFound } from "next/navigation";

import { WinnerBookingScreen } from "@/components/winner-booking-screen";
import { createPollRepository } from "@/lib/polls";
import { createTripService } from "@/lib/trips";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function WinnerPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const repository = createPollRepository();
  const currentTripId = await getCurrentTripId();
  const poll = process.env.E2E_MOCK_MODE === "1" && !/^[0-9a-f-]{36}$/i.test(candidateId)
    ? (await repository.listTripPolls(currentTripId)).find((item) => item.winnerCandidateId)
    : await repository.findByCandidateId(candidateId).catch(() => null);

  if (!poll || poll.tripId !== currentTripId) notFound();
  const trip = await createTripService().getTrip(currentTripId);
  if (!trip) notFound();

  return <WinnerBookingScreen initialPoll={poll} participantIds={trip.participants.map(({ id }) => id)} />;
}
