import { AuditScreen } from "@/components/audit-screen";
import { mockAuditRepository, parseAuditDemoState } from "@/lib/audit-repository";
import { createPostgresAuditRepository } from "@/lib/audit/postgres-audit-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const query = await searchParams;
  const isMockMode = process.env.E2E_MOCK_MODE === "1";
  const result = isMockMode
    ? await mockAuditRepository.getLatestReport(parseAuditDemoState(query.state))
    : await createPostgresAuditRepository().getLatestReport(await getCurrentTripId());

  return <AuditScreen result={result} persistence={isMockMode ? "mock" : "postgres"} />;
}
