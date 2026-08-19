import { describe, expect, it } from "vitest";
import type { TravelOption } from "../travel-search/contracts";
import { adaptTravelOptions, travelOptionToIdeaCandidate, type IdeasFeasibilityContext } from "./travel-option-adapter";

const context: IdeasFeasibilityContext = {
  gapId: "gap-1",
  startsAt: "2026-09-12T12:20:00+03:00",
  endsAt: "2026-09-12T18:10:00+03:00",
  nextRequiredAt: "2026-09-12T19:30:00+03:00",
  participantIds: ["one", "two", "three", "four"],
  budgetPerPerson: 2_500,
  minimumReturnBufferMinutes: 45,
  minimumUsefulMinutes: 60
};

function option(overrides: Partial<TravelOption> = {}): TravelOption {
  return {
    id: "bus-1",
    type: "bus",
    origin: "Казань",
    destination: "Иннополис",
    departureAt: "2026-09-12T13:00:00+03:00",
    arrivalAt: "2026-09-12T14:00:00+03:00",
    returnDepartureAt: "2026-09-12T16:00:00+03:00",
    returnArrivalAt: "2026-09-12T17:00:00+03:00",
    pricePerPerson: 790,
    availableSeats: 4,
    bookingUrl: "https://www.tutu.ru/",
    source: "tutu",
    checkedAt: "2026-09-12T12:01:00+03:00",
    ...overrides
  };
}

describe("travelOptionToIdeaCandidate", () => {
  it("maps a round trip and runs the feasibility engine", () => {
    const candidate = travelOptionToIdeaCandidate(option(), context);
    expect(candidate).toMatchObject({
      id: "bus-1",
      gapId: "gap-1",
      title: "Иннополис на автобусе",
      source: "tutu",
      travelMinutes: 120,
      usefulMinutes: 120,
      returnBufferMinutes: 150,
      check: { status: "valid" }
    });
  });

  it("blocks a one-way result instead of inventing a return route", () => {
    const candidate = travelOptionToIdeaCandidate(option({ returnDepartureAt: undefined, returnArrivalAt: undefined }), context);
    expect(candidate.check.status).toBe("blocking");
    expect(candidate.check.reasons.map(({ code }) => code)).toContain("RETURN_ROUTE_MISSING");
  });

  it("sorts selectable options before blocked ones and limits output", () => {
    const blocked = option({ id: "blocked", pricePerPerson: 100, returnDepartureAt: undefined, returnArrivalAt: undefined });
    const valid = option({ id: "valid", pricePerPerson: 900 });
    expect(adaptTravelOptions([blocked, valid], context, 1).map(({ id }) => id)).toEqual(["valid"]);
  });
});
