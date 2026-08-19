import { describe, expect, it } from "vitest";
import { ideaCandidateToPollCandidate, isFreshSelectableCandidate } from "./poll-payload";

describe("ideaCandidateToPollCandidate", () => {
  it("preserves the checked travel snapshot for the poll backend", () => {
    const payload = ideaCandidateToPollCandidate({
      id: "travel-1",
      gapId: "gap-1",
      title: "Иннополис на автобусе",
      source: "tutu",
      startsAt: "2026-09-12T14:00:00+03:00",
      endsAt: "2026-09-12T16:00:00+03:00",
      travelMode: "bus",
      travelMinutes: 120,
      usefulMinutes: 120,
      pricePerPerson: 790,
      capacity: 4,
      returnBufferMinutes: 150,
      recommendationReason: "Подходит группе",
      check: { status: "valid", reasons: [], checkedAt: "2026-09-12T12:00:00+03:00" }
    });
    expect(payload).toMatchObject({
      travelOptionId: "travel-1",
      pricePerPerson: 790,
      source: "tutu",
      travelOption: { feasibilityStatus: "valid", travelMinutes: 120 }
    });
  });
});

describe("isFreshSelectableCandidate", () => {
  const now = Date.parse("2026-09-12T12:04:00+03:00");
  const candidate = {
    id: "travel-1", gapId: "gap-1", title: "Вариант", source: "tutu" as const,
    startsAt: "2026-09-12T14:00:00+03:00", endsAt: "2026-09-12T16:00:00+03:00",
    travelMode: "bus" as const, travelMinutes: 60, usefulMinutes: 120, capacity: 4 as const,
    returnBufferMinutes: 60, recommendationReason: "ok",
    check: { status: "valid" as const, reasons: [], checkedAt: "2026-09-12T12:00:00+03:00" }
  };

  it("allows only fresh valid or warning checks", () => {
    expect(isFreshSelectableCandidate(candidate, now)).toBe(true);
    expect(isFreshSelectableCandidate({ ...candidate, check: { ...candidate.check, status: "blocking" } }, now)).toBe(false);
    expect(isFreshSelectableCandidate({ ...candidate, check: { ...candidate.check, checkedAt: "2026-09-12T11:00:00+03:00" } }, now)).toBe(false);
  });
});
