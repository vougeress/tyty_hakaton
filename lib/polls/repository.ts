import "server-only";

import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  candidates,
  eventParticipants,
  events,
  participants,
  polls,
  tripMembers,
  trips,
  voteResponses
} from "@/db/schema";
import {
  addCandidateInputSchema,
  closePollInputSchema,
  confirmWinnerBookingInputSchema,
  createPollInputSchema,
  shortRevoteInputSchema,
  recheckWinnerInputSchema,
  submitVoteInputSchema,
  type AddCandidateInput,
  type BookingStatus,
  type CandidateTally,
  type ClosePollInput,
  type ConfirmWinnerBookingInput,
  type CreatePollInput,
  type PollSnapshot,
  type RecheckWinnerInput,
  type ShortRevoteInput,
  type SubmitVoteInput,
  type VoteValue
} from "@/lib/polls/contracts";
import { chooseWinner } from "@/lib/polls/decision";
import { createTravelSearchService, travelOptionSchema, type TravelOption } from "@/lib/travel-search";

const emptyTally: CandidateTally = { yes: 0, maybe: 0, veto: 0 };

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
        .onConflictDoNothing({ target: polls.idempotencyKey })
        .returning();

      if (!poll) {
        const [concurrent] = await tx
          .select({ id: polls.id })
          .from(polls)
          .where(eq(polls.idempotencyKey, validated.idempotencyKey!))
          .limit(1);
        if (!concurrent) throw new Error("Poll idempotency conflict");
        return this.getPoll(concurrent.id, tx);
      }

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
      await assertTripOwner(poll.tripId, validated.participantId, tx);
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

  async createShortRevote(input: ShortRevoteInput): Promise<PollSnapshot> {
    const validated = shortRevoteInputSchema.parse(input);
    const idempotencyKey = `revote:${validated.pollId}`;

    return getDatabase().transaction(async (tx) => {
      const sourcePoll = await getPollRow(validated.pollId, tx);
      await assertTripOwner(sourcePoll.tripId, validated.participantId, tx);
      if (sourcePoll.status !== "closed" || sourcePoll.finalistCandidateIds.length === 0) {
        throw new Error("Poll has no tied finalists");
      }

      const [created] = await tx
        .insert(polls)
        .values({
          tripId: sourcePoll.tripId,
          title: `${sourcePoll.title}: финальный выбор`,
          closesAt: new Date(Date.now() + 5 * 60_000),
          createdByParticipantId: validated.participantId,
          idempotencyKey
        })
        .onConflictDoNothing({ target: polls.idempotencyKey })
        .returning();

      if (!created) {
        const [existing] = await tx.select({ id: polls.id }).from(polls).where(eq(polls.idempotencyKey, idempotencyKey)).limit(1);
        if (!existing) throw new Error("Revote idempotency conflict");
        return this.getPoll(existing.id, tx);
      }

      const finalistRows = await tx
        .select()
        .from(candidates)
        .where(inArray(candidates.id, sourcePoll.finalistCandidateIds))
        .orderBy(asc(candidates.sortOrder));
      if (finalistRows.length !== sourcePoll.finalistCandidateIds.length) throw new Error("Finalist not found");

      await tx.insert(candidates).values(finalistRows.map((candidate, index) => ({
        pollId: created.id,
        title: candidate.title,
        description: candidate.description,
        travelOptionId: candidate.travelOptionId,
        travelOption: candidate.travelOption,
        pricePerPerson: candidate.pricePerPerson,
        source: candidate.source,
        sortOrder: index,
        createdByParticipantId: candidate.createdByParticipantId
      })));

      return this.getPoll(created.id, tx);
    });
  }

  async recheckWinner(input: RecheckWinnerInput): Promise<PollSnapshot> {
    const validated = recheckWinnerInputSchema.parse(input);

    const poll = await this.getPoll(validated.pollId);
    await assertTripMember(poll.tripId, validated.participantId, getDatabase());
    if (poll.status !== "closed" || !poll.winnerCandidateId) throw new Error("Poll has no winner");

    const [candidate] = await getDatabase()
      .select()
      .from(candidates)
      .where(eq(candidates.id, poll.winnerCandidateId))
      .limit(1);
    if (!candidate) throw new Error("Winner candidate not found");
    if (candidate.bookingStatus === "confirmed") return poll;

    const checkedAt = new Date();
    const result = await recheckCandidate(candidate, poll.participantCount, validated.mode);

    await getDatabase().transaction(async (tx) => {
      await tx
        .update(candidates)
        .set({
          bookingStatus: result.status,
          bookingFailureReason: result.failureReason,
          recheckedPricePerPerson: result.pricePerPerson,
          availableSeats: result.availableSeats,
          bookingUrl: result.bookingUrl,
          bookingConfirmedAt: null,
          bookingConfirmedByParticipantId: null,
          lastCheckedAt: checkedAt,
          updatedAt: checkedAt
        })
        .where(eq(candidates.id, candidate.id));
      await touchPoll(poll.id, tx);
    });

    return this.getPoll(poll.id);
  }

  async confirmWinnerBooking(input: ConfirmWinnerBookingInput): Promise<PollSnapshot> {
    const validated = confirmWinnerBookingInputSchema.parse(input);

    return getDatabase().transaction(async (tx) => {
      const poll = await getPollRow(validated.pollId, tx);
      await assertTripMember(poll.tripId, validated.participantId, tx);
      if (poll.status !== "closed" || !poll.winnerCandidateId) throw new Error("Poll has no winner");

      const [candidate] = await tx
        .select()
        .from(candidates)
        .where(eq(candidates.id, poll.winnerCandidateId))
        .limit(1);
      if (!candidate) throw new Error("Winner candidate not found");
      if (candidate.bookingStatus !== "available" && candidate.bookingStatus !== "price_changed") {
        throw new Error("Winner must be rechecked before booking confirmation");
      }
      if (!candidate.lastCheckedAt || Date.now() - candidate.lastCheckedAt.getTime() > 5 * 60_000) {
        throw new Error("Winner recheck is stale");
      }
      const bookingUrl = safeHttpsUrl(candidate.bookingUrl);
      if (!bookingUrl) throw new Error("Booking deeplink is missing");

      await tx
        .update(candidates)
        .set({
          bookingStatus: "confirmed",
          bookingUrl,
          bookingFailureReason: null,
          bookingConfirmedAt: new Date(),
          bookingConfirmedByParticipantId: validated.participantId,
          updatedAt: new Date()
        })
        .where(eq(candidates.id, candidate.id));

      await touchPoll(poll.id, tx);
      await syncPollCalendarEvent(poll.id, candidate.title, tx);
      await syncConfirmedBookingCalendarEvent(poll, candidate, tx);

      return this.getPoll(poll.id, tx);
    });
  }

  async getPoll(id: string, db = getDatabase()): Promise<PollSnapshot> {
    const poll = await getPollRow(id, db);
    return buildPollSnapshot(poll, db);
  }

  async findByCandidateId(candidateId: string): Promise<PollSnapshot | null> {
    const [candidate] = await getDatabase()
      .select({ pollId: candidates.pollId })
      .from(candidates)
      .where(eq(candidates.id, candidateId))
      .limit(1);
    return candidate ? this.getPoll(candidate.pollId) : null;
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
        recheckedPricePerPerson: candidate.recheckedPricePerPerson,
        availableSeats: candidate.availableSeats,
        bookingUrl: candidate.bookingUrl,
        bookingStatus: candidate.bookingStatus,
        bookingFailureReason: candidate.bookingFailureReason,
        lastCheckedAt: candidate.lastCheckedAt?.toISOString() ?? null,
        bookingConfirmedAt: candidate.bookingConfirmedAt?.toISOString() ?? null,
        bookingConfirmedByParticipantId: candidate.bookingConfirmedByParticipantId,
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

async function syncConfirmedBookingCalendarEvent(
  poll: typeof polls.$inferSelect,
  candidate: typeof candidates.$inferSelect,
  db: ReturnType<typeof getDatabase>
) {
  const option = travelOptionSchema.safeParse(candidate.travelOption);
  if (!option.success) throw new Error("Winner travel option is missing");
  const [existing] = await db.select({ id: events.id }).from(events).where(eq(events.externalRef, poll.id)).limit(1);
  const values = {
    tripId: poll.tripId,
    type: "booking" as const,
    status: "confirmed" as const,
    title: candidate.title,
    startsAt: new Date(option.data.departureAt),
    endsAt: new Date(option.data.returnArrivalAt ?? option.data.arrivalAt),
    locationName: option.data.destination,
    source: eventSource(candidate.source),
    externalRef: poll.id,
    updatedAt: new Date()
  };
  const eventId = existing
    ? (await db.update(events).set(values).where(eq(events.id, existing.id)).returning({ id: events.id }))[0]!.id
    : (await db.insert(events).values(values).returning({ id: events.id }))[0]!.id;
  const members = await db.select({ participantId: tripMembers.participantId }).from(tripMembers).where(eq(tripMembers.tripId, poll.tripId));
  if (members.length > 0) {
    await db.insert(eventParticipants).values(members.map(({ participantId }) => ({ eventId, participantId }))).onConflictDoNothing();
  }
}

function safeHttpsUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function eventSource(source: string): "manual" | "tutu" | "demo_catalog" | "external" {
  if (source === "tutu" || source === "demo_catalog") return source;
  if (source === "user_link") return "external";
  return "manual";
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

async function assertTripOwner(
  tripId: string,
  participantId: string,
  db: ReturnType<typeof getDatabase>
) {
  const [trip] = await db
    .select({ ownerId: trips.ownerId })
    .from(trips)
    .where(eq(trips.id, tripId))
    .limit(1);
  if (!trip || trip.ownerId !== participantId) throw new Error("Only the trip owner can close a poll");
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

async function recheckCandidate(
  candidate: typeof candidates.$inferSelect,
  travelers: number,
  mode: "auto" | "mock" | "live"
): Promise<{
  status: BookingStatus;
  failureReason: string | null;
  pricePerPerson: number | null;
  availableSeats: number | null;
  bookingUrl: string | null;
}> {
  const original = travelOptionSchema.safeParse(candidate.travelOption);
  if (!original.success) {
    return {
      status: candidate.bookingUrl ? "available" : "booking_failed",
      failureReason: candidate.bookingUrl ? null : "Нет исходного TravelOption для повторной проверки",
      pricePerPerson: candidate.pricePerPerson,
      availableSeats: candidate.availableSeats,
      bookingUrl: candidate.bookingUrl
    };
  }

  try {
    const option = original.data;
    const result = await createTravelSearchService().search({
      origin: option.origin,
      destination: option.destination,
      startsAt: option.departureAt,
      endsAt: option.returnArrivalAt ?? option.arrivalAt,
      travelers,
      types: [option.type],
      mode
    });
    const refreshed = findMatchingOption(option, result.options);
    if (!refreshed) {
      return {
        status: "sold_out",
        failureReason: "Tutu не вернул победивший вариант при повторной проверке",
        pricePerPerson: candidate.pricePerPerson,
        availableSeats: 0,
        bookingUrl: option.bookingUrl ?? candidate.bookingUrl
      };
    }

    if (refreshed.availableSeats !== undefined && refreshed.availableSeats < travelers) {
      return {
        status: "sold_out",
        failureReason: `Доступно мест: ${refreshed.availableSeats}`,
        pricePerPerson: refreshed.pricePerPerson,
        availableSeats: refreshed.availableSeats,
        bookingUrl: refreshed.bookingUrl ?? option.bookingUrl ?? candidate.bookingUrl
      };
    }

    const oldPrice = candidate.pricePerPerson ?? option.pricePerPerson;
    const status: BookingStatus = Math.abs(refreshed.pricePerPerson - oldPrice) > 0.01
      ? "price_changed"
      : "available";
    return {
      status,
      failureReason: null,
      pricePerPerson: refreshed.pricePerPerson,
      availableSeats: refreshed.availableSeats ?? null,
      bookingUrl: refreshed.bookingUrl ?? option.bookingUrl ?? candidate.bookingUrl
    };
  } catch (error) {
    return {
      status: "booking_failed",
      failureReason: error instanceof Error ? error.message : "Повторная проверка не удалась",
      pricePerPerson: candidate.pricePerPerson,
      availableSeats: candidate.availableSeats,
      bookingUrl: candidate.bookingUrl
    };
  }
}

function findMatchingOption(original: TravelOption, options: TravelOption[]) {
  return options.find((option) => option.id === original.id)
    ?? options.find((option) => option.bookingUrl && option.bookingUrl === original.bookingUrl)
    ?? options.find((option) =>
      option.type === original.type
      && option.origin === original.origin
      && option.destination === original.destination
    );
}
