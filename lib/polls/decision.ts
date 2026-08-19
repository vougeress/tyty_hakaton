import type { PollSnapshot } from "./contracts";

export function chooseWinner(snapshot: PollSnapshot) {
  const eligible = snapshot.candidates.filter((candidate) => candidate.tally.veto === 0);
  if (eligible.length === 0) {
    return { winnerCandidateId: null, winnerTitle: null, finalistCandidateIds: [] };
  }

  const ranked = [...eligible].sort((left, right) =>
    right.tally.yes - left.tally.yes
    || right.tally.maybe - left.tally.maybe
    || ((left.pricePerPerson ?? 0) - (right.pricePerPerson ?? 0))
  );
  const best = ranked[0];
  const tied = ranked.filter((candidate) =>
    candidate.tally.yes === best.tally.yes && candidate.tally.maybe === best.tally.maybe
  );

  if (tied.length === 1) {
    return { winnerCandidateId: best.id, winnerTitle: best.title, finalistCandidateIds: [] };
  }

  return {
    winnerCandidateId: null,
    winnerTitle: null,
    finalistCandidateIds: tied.slice(0, 2).map(({ id }) => id)
  };
}
