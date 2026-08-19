import type { FeasibilityInputs } from "./types";

export const DEFAULT_CHECKED_AT = "2026-09-12T10:00:00+03:00";

export function createValidFeasibilityFixture(): FeasibilityInputs {
  return {
    candidate: {
      id: "innopolis_bus",
      startsAt: "2026-09-12T14:05:00+03:00",
      endsAt: "2026-09-12T16:05:00+03:00",
      pricePerPerson: 790,
      capacity: 8,
      outboundRoute: {
        startsAt: "2026-09-12T13:13:00+03:00",
        endsAt: "2026-09-12T14:05:00+03:00",
      },
      returnRoute: {
        startsAt: "2026-09-12T16:05:00+03:00",
        endsAt: "2026-09-12T18:32:00+03:00",
      },
    },
    window: {
      startsAt: "2026-09-12T12:20:00+03:00",
      endsAt: "2026-09-12T18:10:00+03:00",
      nextRequiredAt: "2026-09-12T19:30:00+03:00",
    },
    participantConstraints: [
      { participantId: "nikita", maxBudgetPerPerson: 2_500, returnBufferMinutes: 45 },
      { participantId: "anna", maxBudgetPerPerson: 1_500, returnBufferMinutes: 30 },
      { participantId: "maria", maxBudgetPerPerson: 1_000, returnBufferMinutes: 30 },
      { participantId: "ilya", maxBudgetPerPerson: 2_000, returnBufferMinutes: 45 },
    ],
    policy: {
      minimumReturnBufferMinutes: 45,
      minimumUsefulMinutes: 60,
      warningTravelToUsefulRatio: 2,
    },
  };
}
