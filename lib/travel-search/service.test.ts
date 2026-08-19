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
});
