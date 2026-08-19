import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { LiveTravelSearchAdapter } from "./adapters";

it.runIf(process.env.TUTU_LIVE_TEST === "1")(
  "normalizes a real public Tutu MCP response",
  async () => {
    const options = await new LiveTravelSearchAdapter().search({
      origin: "Москва",
      destination: "Тула",
      timezone: "Europe/Moscow",
      startsAt: new Date("2026-09-12T00:00:00+03:00"),
      endsAt: new Date("2026-09-13T23:59:00+03:00"),
      travelers: 2,
      types: ["train"],
      mode: "live"
    });

    expect(options.length).toBeGreaterThan(0);
    expect(options[0]?.source).toBe("tutu");
    expect(options[0]?.bookingUrl).toMatch(/^https:\/\/www\.tutu\.ru\//);
  },
  15_000
);
