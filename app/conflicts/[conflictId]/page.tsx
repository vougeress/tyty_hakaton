import { notFound } from "next/navigation";
import { ConflictScreen } from "@/components/conflict-screen";
import { conflictFixtureIds, mockConflictRepository } from "@/lib/conflict-repository";
import { createPostgresConflictRepository } from "@/lib/audit/postgres-conflict-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return process.env.E2E_MOCK_MODE === "1"
    ? conflictFixtureIds.map((conflictId) => ({ conflictId }))
    : [];
}

export default async function ConflictPage({ params }: { params: Promise<{ conflictId: string }> }) {
  const { conflictId } = await params;
  const conflict = process.env.E2E_MOCK_MODE === "1"
    ? await mockConflictRepository.getConflict(conflictId)
    : await createPostgresConflictRepository().getConflict(await getCurrentTripId(), conflictId);

  if (!conflict) notFound();

  return <ConflictScreen conflict={conflict} />;
}
