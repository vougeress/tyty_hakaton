import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { LiveTravelSearchAdapter } from "./adapters";
import type { TutuMcpClient } from "./mcp-client";

describe("LiveTravelSearchAdapter trip timezone", () => {
  let calls: Array<Record<string, unknown>>;
  let client: TutuMcpClient;

  beforeEach(() => {
    calls = [];
    client = {
      async listTools() { return [{ name: "search_bus" }]; },
      async callTool(_name, args) { calls.push(args); return { options: [] }; }
    };
  });

  it("sends the local trip date instead of the UTC date", async () => {
    await new LiveTravelSearchAdapter(client).search({
      origin: "Казань",
      destination: "Иннополис",
      timezone: "Europe/Moscow",
      startsAt: new Date("2026-09-11T22:20:00Z"),
      endsAt: new Date("2026-09-12T15:10:00Z"),
      travelers: 4,
      types: ["bus"],
      mode: "live"
    });
    expect(calls[0].departure_date).toBe("2026-09-12");
  });
});
