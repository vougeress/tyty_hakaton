import { notFound } from "next/navigation";
import { WinnerScreen } from "@/components/winner-screen";
import { mockWinnerRepository, winnerFixtureIds } from "@/lib/winner-repository";

export function generateStaticParams() {
  return winnerFixtureIds.map((candidateId) => ({ candidateId }));
}

export default async function WinnerPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const winner = mockWinnerRepository.getWinner(candidateId);

  if (!winner) notFound();

  return (
    <WinnerScreen
      winner={winner}
      recheckedWinner={mockWinnerRepository.recheckWinner(candidateId)}
    />
  );
}
