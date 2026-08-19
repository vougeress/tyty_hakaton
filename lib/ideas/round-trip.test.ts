import { describe, expect, it } from "vitest";
import type { TravelOption } from "../travel-search/contracts";
import { mergeRoundTripOptions } from "./round-trip";

function option(id: string, origin: string, destination: string, departureAt: string, arrivalAt: string): TravelOption {
  return { id, type: "bus", origin, destination, departureAt, arrivalAt, pricePerPerson: 400, availableSeats: 6, source: "tutu", checkedAt: departureAt };
}

describe("mergeRoundTripOptions", () => {
  it("joins a compatible reverse leg and combines price", () => {
    const outbound = option("out", "Казань", "Иннополис", "2026-09-12T13:00:00+03:00", "2026-09-12T14:00:00+03:00");
    const inbound = option("back", "Иннополис", "Казань", "2026-09-12T16:00:00+03:00", "2026-09-12T17:00:00+03:00");
    expect(mergeRoundTripOptions([outbound], [inbound])[0]).toMatchObject({
      returnDepartureAt: inbound.departureAt,
      returnArrivalAt: inbound.arrivalAt,
      pricePerPerson: 800,
      availableSeats: 6
    });
  });

  it("normalizes endpoints, requires the reverse direction and keeps the oldest check", () => {
    const outbound = { ...option("out", " Казань ", "ИННОПОЛИС", "2026-09-12T13:00:00+03:00", "2026-09-12T14:00:00+03:00"), checkedAt: "2026-09-12T12:00:00+03:00" };
    const wrongDirection = option("wrong", "Казань", "Иннополис", "2026-09-12T16:00:00+03:00", "2026-09-12T17:00:00+03:00");
    const inbound = { ...option("back", "иннополис", "казань", "2026-09-12T16:00:00+03:00", "2026-09-12T17:00:00+03:00"), checkedAt: "2026-09-12T12:05:00+03:00" };
    const merged = mergeRoundTripOptions([outbound], [wrongDirection, inbound])[0];
    expect(merged.id).toContain("back");
    expect(merged.checkedAt).toBe(outbound.checkedAt);
  });

  it("never pairs an option with the same external id", () => {
    const outbound = option("same", "Казань", "Иннополис", "2026-09-12T13:00:00+03:00", "2026-09-12T14:00:00+03:00");
    const inbound = option("same", "Иннополис", "Казань", "2026-09-12T16:00:00+03:00", "2026-09-12T17:00:00+03:00");
    expect(mergeRoundTripOptions([outbound], [inbound])[0].returnDepartureAt).toBeUndefined();
  });

  it("rejects an outbound leg whose normalized endpoints do not match the request", () => {
    const outbound = option("out", "Москва", "Иннополис", "2026-09-12T13:00:00+03:00", "2026-09-12T14:00:00+03:00");
    const inbound = option("back", "Иннополис", "Москва", "2026-09-12T16:00:00+03:00", "2026-09-12T17:00:00+03:00");
    expect(mergeRoundTripOptions([outbound], [inbound], { origin: "Казань", destination: "Иннополис" })[0].returnDepartureAt).toBeUndefined();
  });

  it("does not pair a return that departs before arrival", () => {
    const outbound = option("out", "Казань", "Иннополис", "2026-09-12T13:00:00+03:00", "2026-09-12T14:00:00+03:00");
    const inbound = option("back", "Иннополис", "Казань", "2026-09-12T13:30:00+03:00", "2026-09-12T14:30:00+03:00");
    expect(mergeRoundTripOptions([outbound], [inbound])[0].returnDepartureAt).toBeUndefined();
  });
});
