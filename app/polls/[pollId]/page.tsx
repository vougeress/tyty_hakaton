import { notFound } from "next/navigation";

import { VoteScreen } from "@/components/vote-screen";
import { createPollRepository } from "@/lib/polls";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function PollPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  const repository = createPollRepository();
  const poll = pollId === "demo-poll"
    ? (await repository.listTripPolls(await getCurrentTripId()))[0]
    : await repository.getPoll(pollId).catch(() => null);

  if (!poll) notFound();

  return <VoteScreen initialPoll={poll} />;
}
