import { notFound, redirect } from "next/navigation";

import { VoteScreen } from "@/components/vote-screen";
import { createPollRepository } from "@/lib/polls";
import { createTripService } from "@/lib/trips";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function PollPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  const repository = createPollRepository();
  const currentTripId = await getCurrentTripId();
  const poll = process.env.E2E_MOCK_MODE === "1" && pollId === "demo-poll"
    ? (await repository.listTripPolls(currentTripId))[0]
    : await repository.getPoll(pollId).catch(() => null);

  if (!poll || poll.tripId !== currentTripId) notFound();
  if (poll.status === "closed" && poll.winnerCandidateId) redirect("/calendar");
  const trip = await createTripService().getTrip(poll.tripId);
  if (!trip) notFound();

  return <VoteScreen initialPoll={poll} participantIds={trip.participants.map(({ id }) => id)} ownerId={trip.ownerId} timezone={trip.timezone} />;
}
