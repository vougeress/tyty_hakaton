import { AuditScreen } from "@/components/audit-screen";
import { mockAuditRepository, parseAuditDemoState } from "@/lib/audit-repository";

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const query = await searchParams;
  const result = await mockAuditRepository.getLatestReport(parseAuditDemoState(query.state));

  return <AuditScreen result={result} />;
}
