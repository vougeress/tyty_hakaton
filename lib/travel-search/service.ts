import "server-only";

import { createHash } from "node:crypto";

import { getCached, setCached } from "@/lib/travel-search/cache";
import {
  travelSearchInputSchema,
  type TravelSearchInput,
  type TravelSearchResult
} from "@/lib/travel-search/contracts";
import {
  LiveTravelSearchAdapter,
  MockTravelSearchAdapter,
  type TravelSearchAdapter
} from "@/lib/travel-search/adapters";

const CACHE_TTL_MS = 5 * 60 * 1000;

export class TravelSearchService {
  constructor(
    private readonly liveAdapter: TravelSearchAdapter = new LiveTravelSearchAdapter(),
    private readonly mockAdapter: TravelSearchAdapter = new MockTravelSearchAdapter()
  ) {}

  async search(input: unknown): Promise<TravelSearchResult> {
    const validated = travelSearchInputSchema.parse(input);
    const cacheKey = createCacheKey(validated);
    const cached = getCached<TravelSearchResult>(cacheKey);
    if (cached) return { ...cached, cache: "hit" };

    const warnings: string[] = [];
    const mode = resolveMode(validated);
    try {
      const adapter = mode === "live" ? this.liveAdapter : this.mockAdapter;
      const options = await adapter.search(validated);
      const result: TravelSearchResult = {
        options,
        checkedAt: new Date().toISOString(),
        mode,
        cache: "miss",
        warnings
      };
      setCached(cacheKey, result, CACHE_TTL_MS);
      return result;
    } catch (error) {
      if (validated.mode === "live") throw error;
      warnings.push("Live MCP недоступен, показаны mock-варианты");
      const options = await this.mockAdapter.search(validated);
      const result: TravelSearchResult = {
        options,
        checkedAt: new Date().toISOString(),
        mode: "mock",
        cache: "miss",
        warnings
      };
      setCached(cacheKey, result, CACHE_TTL_MS);
      return result;
    }
  }
}

export function createTravelSearchService() {
  return new TravelSearchService();
}

function resolveMode(input: TravelSearchInput): "mock" | "live" {
  if (input.mode === "mock") return "mock";
  if (input.mode === "live") return "live";
  return process.env.TUTU_MCP_URL ? "live" : "mock";
}

function createCacheKey(input: TravelSearchInput) {
  return createHash("sha1")
    .update(JSON.stringify({
      origin: input.origin,
      destination: input.destination,
      startsAt: input.startsAt.toISOString(),
      endsAt: input.endsAt.toISOString(),
      travelers: input.travelers,
      types: [...input.types].sort(),
      mode: resolveMode(input)
    }))
    .digest("hex");
}
