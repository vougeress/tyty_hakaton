import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eventParticipants, events, participants, tripMembers, trips } from "@/db/schema";
import type {
  CalendarEvent,
  CreateEventInput,
  CreateTripInput,
  JoinTripInput,
  TripDetails
} from "@/lib/trips/contracts";
import type { TripRepository } from "@/lib/trips/repository";

export class DrizzleTripRepository implements TripRepository {
  async create(input: CreateTripInput & { inviteCode: string }): Promise<TripDetails> {
    return getDatabase().transaction(async (tx) => {
      const [owner] = await tx
        .insert(participants)
        .values(input.owner)
        .returning();
      const [trip] = await tx
        .insert(trips)
        .values({
          title: input.title,
          timezone: input.timezone,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          ownerId: owner.id,
          inviteCode: input.inviteCode
        })
        .returning();

      await tx.insert(tripMembers).values({
        tripId: trip.id,
        participantId: owner.id,
        role: "owner"
      });

      return { ...trip, participants: [{ ...owner, role: "owner" }] };
    });
  }

  async findById(id: string): Promise<TripDetails | null> {
    const [trip] = await getDatabase().select().from(trips).where(eq(trips.id, id)).limit(1);
    return trip ? this.withParticipants(trip) : null;
  }

  async findByInviteCode(inviteCode: string): Promise<TripDetails | null> {
    const [trip] = await getDatabase()
      .select()
      .from(trips)
      .where(eq(trips.inviteCode, inviteCode))
      .limit(1);
    return trip ? this.withParticipants(trip) : null;
  }

  async listArchived(limit = 10): Promise<TripDetails[]> {
    const rows = await getDatabase()
      .select()
      .from(trips)
      .where(eq(trips.status, "archived"))
      .orderBy(desc(trips.startsAt))
      .limit(limit);
    return Promise.all(rows.map((trip) => this.withParticipants(trip)));
  }

  async join(input: JoinTripInput): Promise<TripDetails> {
    return getDatabase().transaction(async (tx) => {
      const [trip] = await tx
        .select()
        .from(trips)
        .where(and(eq(trips.inviteCode, input.inviteCode), eq(trips.status, "active")))
        .limit(1);

      if (!trip) throw new Error("Trip not found");

      const [participant] = await tx
        .insert(participants)
        .values(input.participant)
        .returning();
      await tx.insert(tripMembers).values({
        tripId: trip.id,
        participantId: participant.id,
        role: "member"
      });

      const memberRows = await tx
        .select({ participant: participants, role: tripMembers.role })
        .from(tripMembers)
        .innerJoin(participants, eq(participants.id, tripMembers.participantId))
        .where(eq(tripMembers.tripId, trip.id));

      return {
        ...trip,
        participants: memberRows.map(({ participant: member, role }) => ({ ...member, role }))
      };
    });
  }

  async listEvents(tripId: string): Promise<CalendarEvent[]> {
    await promoteClosedPollEventsForTrip(tripId);
    const eventRows = await getDatabase()
      .select()
      .from(events)
      .where(eq(events.tripId, tripId))
      .orderBy(asc(events.startsAt));

    if (eventRows.length === 0) return [];

    const attendeeRows = await getDatabase()
      .select()
      .from(eventParticipants)
      .where(inArray(eventParticipants.eventId, eventRows.map((event) => event.id)));
    const attendeesByEvent = new Map<string, string[]>();
    for (const attendee of attendeeRows) {
      const ids = attendeesByEvent.get(attendee.eventId) ?? [];
      ids.push(attendee.participantId);
      attendeesByEvent.set(attendee.eventId, ids);
    }

    return eventRows.map((event) => this.toCalendarEvent(event, attendeesByEvent.get(event.id) ?? []));
  }

  async findEventById(id: string): Promise<CalendarEvent | null> {
    await promoteClosedPollEvent(id);
    const [event] = await getDatabase().select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) return null;

    const attendeeRows = await getDatabase()
      .select({ participantId: eventParticipants.participantId })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, id));

    return this.toCalendarEvent(event, attendeeRows.map(({ participantId }) => participantId));
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return getDatabase().transaction(async (tx) => {
      const [event] = await tx
        .insert(events)
        .values({
          tripId: input.tripId,
          type: input.type,
          status: input.status,
          title: input.title,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          locationName: input.location?.name,
          locationLat: input.location?.lat,
          locationLon: input.location?.lon,
          locationMapUrl: input.location?.mapUrl,
          source: input.source,
          externalRef: input.externalRef
        })
        .returning();

      if (input.participantIds.length > 0) {
        await tx.insert(eventParticipants).values(
          input.participantIds.map((participantId) => ({ eventId: event.id, participantId }))
        );
      }

      return this.toCalendarEvent(event, input.participantIds);
    });
  }

  private async withParticipants(trip: typeof trips.$inferSelect): Promise<TripDetails> {
    const rows = await getDatabase()
      .select({ participant: participants, role: tripMembers.role })
      .from(tripMembers)
      .innerJoin(participants, eq(participants.id, tripMembers.participantId))
      .where(eq(tripMembers.tripId, trip.id));

    return {
      ...trip,
      participants: rows.map(({ participant, role }) => ({ ...participant, role }))
    };
  }

  private toCalendarEvent(
    event: typeof events.$inferSelect,
    participantIds: string[]
  ): CalendarEvent {
    return {
      id: event.id,
      tripId: event.tripId,
      type: event.type,
      status: event.status,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.locationName
        ? {
            name: event.locationName,
            ...(event.locationLat === null ? {} : { lat: event.locationLat }),
            ...(event.locationLon === null ? {} : { lon: event.locationLon }),
            ...(event.locationMapUrl === null ? {} : { mapUrl: event.locationMapUrl })
          }
        : null,
      participantIds,
      source: event.source,
      externalRef: event.externalRef
    };
  }
}

async function promoteClosedPollEventsForTrip(tripId: string) {
  await getDatabase().execute(sql`
    update events as calendar_event
    set
      type = 'event'::event_type,
      status = 'confirmed'::event_status,
      title = winner.title,
      updated_at = now()
    from polls as poll
    inner join candidates as winner on winner.id = poll.winner_candidate_id
    where calendar_event.trip_id = ${tripId}
      and calendar_event.type = 'poll'::event_type
      and calendar_event.external_ref = poll.id::text
      and poll.status = 'closed'::poll_status
  `);
}

async function promoteClosedPollEvent(eventId: string) {
  await getDatabase().execute(sql`
    update events as calendar_event
    set
      type = 'event'::event_type,
      status = 'confirmed'::event_status,
      title = winner.title,
      updated_at = now()
    from polls as poll
    inner join candidates as winner on winner.id = poll.winner_candidate_id
    where calendar_event.id = ${eventId}
      and calendar_event.type = 'poll'::event_type
      and calendar_event.external_ref = poll.id::text
      and poll.status = 'closed'::poll_status
  `);
}
