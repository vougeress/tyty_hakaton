import { notFound } from "next/navigation";
import { ConflictScreen } from "@/components/conflict-screen";
import { conflictFixtureIds, mockConflictRepository } from "@/lib/conflict-repository";

export function generateStaticParams() {
  return conflictFixtureIds.map((conflictId) => ({ conflictId }));
}

export default async function ConflictPage({ params }: { params: Promise<{ conflictId: string }> }) {
  const { conflictId } = await params;
  const conflict = await mockConflictRepository.getConflict(conflictId);

  if (!conflict) notFound();

  return <ConflictScreen conflict={conflict} />;
}
