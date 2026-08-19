import { notFound } from "next/navigation";
import { IdeasScreen } from "@/components/ideas-screen";
import { mockIdeasRepository, type IdeasSearchState } from "@/lib/ideas";
import { loadIdeasContext } from "@/lib/ideas/server-context";
import { searchIdeasAction } from "@/app/calendar/gaps/[gapId]/ideas/actions";

export const dynamic = "force-dynamic";

export default async function IdeasPage({
  params,
  searchParams
}: {
  params: Promise<{ gapId: string }>;
  searchParams: Promise<{ destination?: string }>;
}) {
  const { gapId } = await params;
  const requestedDestination = (await searchParams).destination?.trim() ?? "";

  if (process.env.E2E_MOCK_MODE === "1") {
    const destination = requestedDestination || "Иннополис";
    const preset = mockIdeasRepository.getPreset(gapId);
    if (!preset) notFound();
    const initialSearch: IdeasSearchState = {
      status: "success",
      destination,
      candidates: preset.candidates,
      mode: "mock",
      cache: "miss",
      checkedAt: preset.candidates[0]?.check.checkedAt,
      warnings: ["Тестовый режим: показаны демонстрационные варианты"]
    };
    return <IdeasScreen preset={preset} initialSearch={initialSearch} mockMode />;
  }

  const context = await loadIdeasContext(gapId);
  if (!context) notFound();
  if (!requestedDestination) {
    return <IdeasScreen preset={context.preset} initialSearch={{
      status: "idle",
      destination: "",
      candidates: [],
      warnings: []
    }} />;
  }
  const formData = new FormData();
  formData.set("gapId", gapId);
  formData.set("destination", requestedDestination);
  const initialSearch = await searchIdeasAction({
    status: "idle",
    destination: requestedDestination,
    candidates: [],
    warnings: []
  }, formData);

  return <IdeasScreen preset={context.preset} initialSearch={initialSearch} />;
}
