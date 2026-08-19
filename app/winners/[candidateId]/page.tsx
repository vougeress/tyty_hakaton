import { notFound } from "next/navigation";

import { WinnerBookingScreen } from "@/components/winner-booking-screen";
import { createPollRepository } from "@/lib/polls";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function WinnerPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const repository = createPollRepository();
  const poll = /^[0-9a-f-]{36}$/i.test(candidateId)
    ? await repository.findByCandidateId(candidateId)
    : (await repository.listTripPolls(await getCurrentTripId()))
        .find((item) => item.winnerCandidateId);

  if (!poll) notFound();

  return <WinnerBookingScreen initialPoll={poll} />;
}
