import { describe, expect, it } from "vitest";

import type { PollSnapshot } from "./contracts";
import { chooseWinner } from "./decision";

function snapshot(tallies: Array<{ yes: number; maybe: number; veto: number }>): PollSnapshot {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    tripId: "00000000-0000-4000-8000-000000000002",
    title: "Выбор",
    status: "active",
    closesAt: new Date(Date.now() + 60_000).toISOString(),
    closedAt: null,
    winnerCandidateId: null,
    finalistCandidateIds: [],
    version: 1,
    updatedAt: new Date().toISOString(),
    participantCount: 4,
    respondedParticipantCount: 4,
    candidates: tallies.map((tally, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      title: `Вариант ${index + 1}`,
      description: null,
      travelOptionId: null,
      pricePerPerson: 100 + index,
      recheckedPricePerPerson: null,
      availableSeats: null,
      bookingUrl: null,
      bookingStatus: "idle",
      bookingFailureReason: null,
      lastCheckedAt: null,
      bookingConfirmedAt: null,
      bookingConfirmedByParticipantId: null,
      source: "test",
      createdByParticipantId: null,
      tally,
      responses: []
    }))
  };
}

describe("poll decision", () => {
  it("excludes any vetoed candidate", () => {
    const result = chooseWinner(snapshot([
      { yes: 4, maybe: 0, veto: 1 },
      { yes: 2, maybe: 1, veto: 0 }
    ]));
    expect(result.winnerCandidateId).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("returns no finalists when every candidate is vetoed", () => {
    const result = chooseWinner(snapshot([
      { yes: 3, maybe: 0, veto: 1 },
      { yes: 2, maybe: 1, veto: 1 }
    ]));
    expect(result).toEqual({ winnerCandidateId: null, winnerTitle: null, finalistCandidateIds: [] });
  });

  it("returns two finalists for a real tie", () => {
    const result = chooseWinner(snapshot([
      { yes: 2, maybe: 1, veto: 0 },
      { yes: 2, maybe: 1, veto: 0 },
      { yes: 1, maybe: 2, veto: 0 }
    ]));
    expect(result.winnerCandidateId).toBeNull();
    expect(result.finalistCandidateIds).toEqual([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002"
    ]);
  });
});
