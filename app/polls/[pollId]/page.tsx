import { notFound } from "next/navigation";
import { VoteScreen } from "@/components/vote-screen";
import { mockVotingRepository } from "@/lib/voting/repository";

export default async function PollPage({
  params,
  searchParams
}: {
  params: Promise<{ pollId: string }>;
  searchParams: Promise<{ candidates?: string }>;
}) {
  const { pollId } = await params;
  const preset = mockVotingRepository.getPreset(pollId);
  if (!preset) notFound();
  const selectedIds = (await searchParams).candidates?.split(",").filter(Boolean);
  const visiblePreset = selectedIds?.length
    ? { ...preset, candidates: preset.candidates.filter((candidate) => selectedIds.includes(candidate.id)) }
    : preset;

  return <VoteScreen preset={visiblePreset} />;
}
