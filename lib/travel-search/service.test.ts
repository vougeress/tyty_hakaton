import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TravelSearchService } from "./service";
import type { TravelSearchAdapter } from "./adapters";

describe("TravelSearchService cache bypass", () => {
  it("forces a fresh adapter call for final revalidation", async () => {
    const search = vi.fn(async () => []);
    const adapter: TravelSearchAdapter = { search };
    const service = new TravelSearchService(adapter, adapter);
    const input = {
      origin: "Cache bypass origin",
      destination: "Cache bypass destination",
      timezone: "Europe/Moscow",
      startsAt: "2026-09-12T12:20:00+03:00",
      endsAt: "2026-09-12T18:10:00+03:00",
      travelers: 4,
      types: ["bus"],
      mode: "mock"
    };
    await service.search(input);
    expect((await service.search(input)).cache).toBe("hit");
    expect((await service.search(input, { bypassCache: true })).cache).toBe("miss");
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("falls back when auto live search returns no fitting options", async () => {
    const live: TravelSearchAdapter = { search: vi.fn(async () => []) };
    const mock: TravelSearchAdapter = { search: vi.fn(async () => [{
      id: "fallback",
      type: "bus" as const,
      origin: "Казань",
      destination: "Иннополис",
      departureAt: "2026-09-12T09:00:00.000Z",
      arrivalAt: "2026-09-12T10:00:00.000Z",
      pricePerPerson: 900,
      source: "demo_catalog" as const,
      checkedAt: "2026-08-19T12:00:00.000Z"
    }]) };
    const result = await new TravelSearchService(live, mock).search({
      origin: "Казань",
      destination: "Иннополис",
      timezone: "Europe/Moscow",
      startsAt: "2026-09-12T08:00:00+03:00",
      endsAt: "2026-09-12T18:00:00+03:00",
      travelers: 2,
      types: ["bus"],
      mode: "auto"
    }, { bypassCache: true });

    expect(result.mode).toBe("mock");
    expect(result.options[0]?.id).toBe("fallback");
    expect(result.warnings.join(" ")).toMatch(/резервный каталог/i);
  });
});
