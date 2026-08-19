import "server-only";

import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  events,
  candidates,
  participants,
  polls,
  tripMembers,
  trips,
  voteResponses
} from "@/db/schema";
import {
  addCandidateInputSchema,
  closePollInputSchema,
  createPollInputSchema,
  submitVoteInputSchema,
  type AddCandidateInput,
  type CandidateTally,
  type ClosePollInput,
  type CreatePollInput,
  type PollSnapshot,
  type SubmitVoteInput,
  type VoteValue
} from "@/lib/polls/contracts";

const emptyTally: CandidateTally = { yes: 0, no: 0, maybe: 0 };

export class PollRepository {
  async createPoll(input: CreatePollInput): Promise<PollSnapshot> {
    const validated = createPollInputSchema.parse(input);
    if (validated.closesAt <= new Date()) throw new Error("Poll close time must be in the future");

    const existing = validated.idempotencyKey
      ? await this.findByIdempotencyKey(validated.idempotencyKey)
      : null;
    if (existing) return existing;

    return getDatabase().transaction(async (tx) => {
      await assertTripMember(validated.tripId, validated.createdByParticipantId, tx);

      const [poll] = await tx
        .insert(polls)
        .values({
          tripId: validated.tripId,
          title: validated.title,
          closesAt: validated.closesAt,
          createdByParticipantId: validated.createdByParticipantId,
          idempotencyKey: validated.idempotencyKey
        })
        .returning();

      await tx.insert(candidates).values(validated.candidates.map((candidate, index) => ({
        pollId: poll.id,
        title: candidate.title,
        description: candidate.description,
        travelOptionId: candidate.travelOptionId,
        travelOption: candidate.travelOption ?? null,
        pricePerPerson: candidate.pricePerPerson,
        source: candidate.source,
        sortOrder: index,
        createdByParticipantId: validated.createdByParticipantId
      })));

      return this.getPoll(poll.id, tx);
    });
  }

  async addCandidate(input: AddCandidateInput): Promise<PollSnapshot> {
    const validated = addCandidateInputSchema.parse(input);
    return getDatabase().transaction(async (tx) => {
      const poll = await getPollRow(validated.pollId, tx);
      assertPollActive(poll);
      await assertTripMember(poll.tripId, validated.participantId, tx);

      const lastOrder = await tx
        .select({ value: sql<number>`coalesce(max(${candidates.sortOrder}), -1)::int` })
        .from(candidates)
        .where(eq(candidates.pollId, poll.id));

      await tx
        .insert(candidates)
        .values({
          pollId: poll.id,
          title: validated.candidate.title,
          description: validated.candidate.description,
          travelOptionId: validated.candidate.travelOptionId ?? validated.idempotencyKey,
          travelOption: validated.candidate.travelOption ?? null,
          pricePerPerson: validated.candidate.pricePerPerson,
          source: validated.candidate.source,
          sortOrder: (lastOrder[0]?.value ?? -1) + 1,
          createdByParticipantId: validated.participantId
        })
        .onConflictDoNothing({ target: [candidates.pollId, candidates.travelOptionId] });

      await touchPoll(poll.id, tx);
      return this.getPoll(poll.id, tx);
    });
  }

  async submitVote(input: SubmitVoteInput): Promise<PollSnapshot> {
    const validated = submitVoteInputSchema.parse(input);

    return getDatabase().transaction(async (tx) => {
      if (validated.idempotencyKey) {
        const [existingResponse] = await tx
          .select({ pollId: voteResponses.pollId })
          .from(voteResponses)
          .where(eq(voteResponses.idempotencyKey, validated.idempotencyKey))
          .limit(1);
        if (existingResponse) return this.getPoll(existingResponse.pollId, tx);
      }

      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, validated.candidateId))
        .limit(1);
      if (!candidate || candidate.pollId !== validated.pollId) throw new Error("Candidate not found");

      const poll = await getPollRow(validated.pollId, tx);
      assertPollActive(poll);
      await assertTripMember(poll.tripId, validated.participantId, tx);

      await tx
        .insert(voteResponses)
        .values({
          pollId: validated.pollId,
          candidateId: validated.candidateId,
          participantId: validated.participantId,
          value: validated.value,
          idempotencyKey: validated.idempotencyKey
        })
        .onConflictDoUpdate({
          target: [voteResponses.pollId, voteResponses.candidateId, voteResponses.participantId],
          set: {
            value: validated.value,
            idempotencyKey: validated.idempotencyKey,
            updatedAt: new Date()
          }
        });

      await touchPoll(poll.id, tx);
      return this.getPoll(poll.id, tx);
    });
  }

  async closePoll(input: ClosePollInput): Promise<PollSnapshot> {
    const validated = closePollInputSchema.parse(input);

    return getDatabase().transaction(async (tx) => {
      const poll = await getPollRow(validated.pollId, tx);
      await assertTripMember(poll.tripId, validated.participantId, tx);
      if (poll.status === "closed") return this.getPoll(poll.id, tx);

      const snapshot = await this.getPoll(poll.id, tx);
      const decision = chooseWinner(snapshot);

      await tx
        .update(polls)
        .set({
          status: "closed",
          closedAt: new Date(),
          winnerCandidateId: decision.winnerCandidateId,
          finalistCandidateIds: decision.finalistCandidateIds,
          version: sql`${polls.version} + 1`,
          updatedAt: new Date()
        })
        .where(eq(polls.id, poll.id));

      await syncPollCalendarEvent(poll.id, decision.winnerTitle, tx);

      return this.getPoll(poll.id, tx);
    });
  }

  async getPoll(id: string, db = getDatabase()): Promise<PollSnapshot> {
    const poll = await getPollRow(id, db);
    return buildPollSnapshot(poll, db);
  }

  async listTripPolls(tripId: string, updatedSince?: Date): Promise<PollSnapshot[]> {
    const filters = updatedSince
      ? and(eq(polls.tripId, tripId), gt(polls.updatedAt, updatedSince))
      : eq(polls.tripId, tripId);
    const rows = await getDatabase()
      .select({ id: polls.id })
      .from(polls)
      .where(filters)
      .orderBy(asc(polls.updatedAt));

    return Promise.all(rows.map(({ id }) => this.getPoll(id)));
  }

  private async findByIdempotencyKey(idempotencyKey: string) {
    const [poll] = await getDatabase()
      .select({ id: polls.id })
      .from(polls)
      .where(eq(polls.idempotencyKey, idempotencyKey))
      .limit(1);
    return poll ? this.getPoll(poll.id) : null;
  }
}

export function createPollRepository() {
  return new PollRepository();
}

async function buildPollSnapshot(
  poll: typeof polls.$inferSelect,
  db: ReturnType<typeof getDatabase>
): Promise<PollSnapshot> {
  const [candidateRows, responseRows, memberRows] = await Promise.all([
    db.select().from(candidates).where(eq(candidates.pollId, poll.id)).orderBy(asc(candidates.sortOrder)),
    db.select().from(voteResponses).where(eq(voteResponses.pollId, poll.id)),
    db.select({ participantId: tripMembers.participantId }).from(tripMembers).where(eq(tripMembers.tripId, poll.tripId))
  ]);

  const responsesByCandidate = new Map<string, typeof responseRows>();
  const respondedParticipantIds = new Set<string>();
  for (const response of responseRows) {
    responsesByCandidate.set(response.candidateId, [
      ...(responsesByCandidate.get(response.candidateId) ?? []),
      response
    ]);
    respondedParticipantIds.add(response.participantId);
  }

  return {
    id: poll.id,
    tripId: poll.tripId,
    title: poll.title,
    status: poll.status,
    closesAt: poll.closesAt.toISOString(),
    closedAt: poll.closedAt?.toISOString() ?? null,
    winnerCandidateId: poll.winnerCandidateId,
    finalistCandidateIds: poll.finalistCandidateIds,
    version: poll.version,
    updatedAt: poll.updatedAt.toISOString(),
    participantCount: memberRows.length,
    respondedParticipantCount: respondedParticipantIds.size,
    candidates: candidateRows.map((candidate) => {
      const responses = responsesByCandidate.get(candidate.id) ?? [];
      const tally = responses.reduce<CandidateTally>((acc, response) => {
        acc[response.value] += 1;
        return acc;
      }, { ...emptyTally });

      return {
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        travelOptionId: candidate.travelOptionId,
        pricePerPerson: candidate.pricePerPerson,
        source: candidate.source,
        createdByParticipantId: candidate.createdByParticipantId,
        tally,
        responses: responses.map((response) => ({
          participantId: response.participantId,
          value: response.value,
          updatedAt: response.updatedAt.toISOString()
        }))
      };
    })
  };
}

function chooseWinner(snapshot: PollSnapshot) {
  const eligible = snapshot.candidates.filter((candidate) => candidate.tally.no === 0);
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

async function syncPollCalendarEvent(
  pollId: string,
  winnerTitle: string | null,
  db: ReturnType<typeof getDatabase>
) {
  await db
    .update(events)
    .set({
      status: winnerTitle ? "confirmed" : "conflicted",
      title: winnerTitle ?? "Голосование: нужен финальный выбор",
      updatedAt: new Date()
    })
    .where(and(eq(events.type, "poll"), eq(events.externalRef, pollId)));
}

async function assertTripMember(
  tripId: string,
  participantId: string,
  db: ReturnType<typeof getDatabase>
) {
  const [member] = await db
    .select({ participantId: tripMembers.participantId })
    .from(tripMembers)
    .innerJoin(participants, eq(participants.id, tripMembers.participantId))
    .innerJoin(trips, eq(trips.id, tripMembers.tripId))
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.participantId, participantId)))
    .limit(1);
  if (!member) throw new Error("Participant is not a trip member");
}

async function getPollRow(id: string, db: ReturnType<typeof getDatabase>) {
  const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
  if (!poll) throw new Error("Poll not found");
  return poll;
}

function assertPollActive(poll: typeof polls.$inferSelect) {
  if (poll.status !== "active" || poll.closesAt <= new Date()) {
    throw new Error("Poll is closed");
  }
}

async function touchPoll(pollId: string, db: ReturnType<typeof getDatabase>) {
  await db
    .update(polls)
    .set({ version: sql`${polls.version} + 1`, updatedAt: new Date() })
    .where(eq(polls.id, pollId));
}
