import type { IdeaCandidate } from "./contracts";

export function isFreshSelectableCandidate(candidate: IdeaCandidate, now: number, maxAgeMinutes = 5) {
  if (candidate.check.status !== "valid" && candidate.check.status !== "warning") return false;
  const checkedAt = candidate.check.checkedAt ? Date.parse(candidate.check.checkedAt) : Number.NaN;
  return Number.isFinite(checkedAt) && Math.abs(now - checkedAt) <= maxAgeMinutes * 60_000;
}

export function ideaCandidateToPollCandidate(candidate: IdeaCandidate) {
  return {
    title: candidate.title,
    description: [candidate.check.reasons[0]?.message, candidate.recommendationReason].filter(Boolean).join(" · ").slice(0, 320),
    travelOptionId: candidate.id,
    travelOption: {
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      travelMode: candidate.travelMode,
      travelMinutes: candidate.travelMinutes,
      usefulMinutes: candidate.usefulMinutes,
      capacity: candidate.capacity,
      returnBufferMinutes: candidate.returnBufferMinutes,
      deeplink: candidate.deeplink,
      feasibilityStatus: candidate.check.status,
      checkedAt: candidate.check.checkedAt
    },
    pricePerPerson: candidate.pricePerPerson,
    source: candidate.source
  };
}
