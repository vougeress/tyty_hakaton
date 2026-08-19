import { notFound } from "next/navigation";
import { WinnerScreen } from "@/components/winner-screen";
import { mockWinnerRepository, winnerFixtureIds } from "@/lib/winner-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";
import { getPostgresWinner } from "@/lib/winners/postgres-winner-repository";

export function generateStaticParams() {
  return winnerFixtureIds.map((candidateId) => ({ candidateId }));
}

export default async function WinnerPage({ params }: { params: Promise<{ candidateId: string }> }) {
  const { candidateId } = await params;
  const mockWinner = mockWinnerRepository.getWinner(candidateId);
  if (mockWinner) {
    return <WinnerScreen winner={mockWinner} recheckedWinner={mockWinnerRepository.recheckWinner(candidateId)} />;
  }
  const result = await getPostgresWinner(candidateId);

  if (!result || result.tripId !== await getCurrentTripId()) notFound();

  return <WinnerScreen winner={result.winner} recheckedWinner={null} />;
}
