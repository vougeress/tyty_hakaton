import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { getDatabase } from "@/db/client";
import { candidates, participants, polls, tripMembers, trips } from "@/db/schema";
import { PollRepository } from "@/lib/polls/repository";

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;
const createdTripIds: string[] = [];
const createdParticipantIds: string[] = [];

afterEach(async () => {
  if (!process.env.DATABASE_URL) return;
  const db = getDatabase();
  for (const tripId of createdTripIds.splice(0)) await db.delete(trips).where(eq(trips.id, tripId));
  for (const participantId of createdParticipantIds.splice(0)) await db.delete(participants).where(eq(participants.id, participantId));
});

describeDatabase("PollRepository PostgreSQL integration", () => {
  it("clones finalist travel snapshots and returns one revote under concurrency", async () => {
    const db = getDatabase();
    const participantId = randomUUID();
    const tripId = randomUUID();
    createdTripIds.push(tripId);
    createdParticipantIds.push(participantId);
    await db.insert(participants).values({ id: participantId, displayName: "QA owner" });
    await db.insert(trips).values({
      id: tripId,
      title: "QA trip",
      timezone: "Europe/Moscow",
      startsAt: new Date("2026-09-10T00:00:00+03:00"),
      endsAt: new Date("2026-09-13T23:59:59+03:00"),
      ownerId: participantId,
      inviteCode: `QA${randomUUID().slice(0, 10)}`,
      status: "active"
    });
    await db.insert(tripMembers).values({ tripId, participantId, role: "owner" });

    const repository = new PollRepository();
    const source = await repository.createPoll({
      tripId,
      title: "QA tie",
      closesAt: new Date(Date.now() + 60_000),
      createdByParticipantId: participantId,
      candidates: [1, 2].map((index) => ({
        title: `Candidate ${index}`,
        travelOptionId: `travel-${index}`,
        travelOption: { startsAt: "2026-09-12T11:00:00.000Z", capacity: 4 + index },
        source: "test"
      }))
    });
    const finalistIds = source.candidates.map(({ id }) => id);
    await db.update(polls).set({ status: "closed", closedAt: new Date(), finalistCandidateIds: finalistIds }).where(eq(polls.id, source.id));

    const [first, second] = await Promise.all([
      repository.createShortRevote({ pollId: source.id, participantId }),
      repository.createShortRevote({ pollId: source.id, participantId })
    ]);
    expect(second.id).toBe(first.id);

    const cloned = await db.select().from(candidates).where(eq(candidates.pollId, first.id));
    expect(cloned).toHaveLength(2);
    expect(cloned.map(({ travelOption }) => travelOption)).toEqual([
      { startsAt: "2026-09-12T11:00:00.000Z", capacity: 5 },
      { startsAt: "2026-09-12T11:00:00.000Z", capacity: 6 }
    ]);
  });
});
