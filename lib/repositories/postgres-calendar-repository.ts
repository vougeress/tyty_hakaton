import type {
  CalendarParticipant,
  CalendarPreset,
  EventDetails
} from "@/lib/calendar-repository";
import { buildCalendarPreset, buildEventDetails } from "@/lib/calendar-data";
import {
  createTripService,
  type CalendarEventStatus,
  type CalendarEventType,
  type TripService
} from "@/lib/trips";

export type CalendarEventResult = {
  event: EventDetails;
  participants: CalendarParticipant[];
};

export type SaveManualCalendarEventInput = {
  tripId: string;
  title: string;
  type?: CalendarEventType;
  status?: CalendarEventStatus;
  startsAt: Date;
  endsAt: Date;
  participantIds: string[];
  location?: {
    name: string;
    lat?: number;
    lon?: number;
    mapUrl?: string;
  };
  guard?: {
    actorParticipantId: string;
    gapParticipantIds: string[];
    gapStartsAt: Date;
    gapEndsAt: Date;
    nextRequiredAt: Date;
    minimumReturnBufferMinutes: number;
    idempotencyKey: string;
    routeChecked: boolean;
  };
};

export interface AsyncCalendarRepository {
  getWeek(tripId: string): Promise<CalendarPreset | null>;
  getEvent(itemId: string, tripId?: string): Promise<CalendarEventResult | null>;
  saveManualEvent(input: SaveManualCalendarEventInput): Promise<CalendarEventResult>;
}

export class PostgresCalendarRepository implements AsyncCalendarRepository {
  constructor(private readonly tripService: TripService) {}

  async getWeek(tripId: string): Promise<CalendarPreset | null> {
    const [trip, events] = await Promise.all([
      this.tripService.getTrip(tripId),
      this.tripService.getTimeline(tripId)
    ]);
    return trip ? buildCalendarPreset(trip, events) : null;
  }

  async getEvent(itemId: string, tripId?: string): Promise<CalendarEventResult | null> {
    const event = await this.tripService.getEvent(itemId);
    if (!event || (tripId && event.tripId !== tripId)) return null;

    const trip = await this.tripService.getTrip(event.tripId);
    if (!trip) return null;

    const preset = buildCalendarPreset(trip, [event]);
    return {
      event: buildEventDetails(event, trip),
      participants: preset.participants.filter((participant) =>
        event.participantIds.includes(participant.id)
      )
    };
  }

  async saveManualEvent(input: SaveManualCalendarEventInput): Promise<CalendarEventResult> {
    if (input.guard) return this.saveGuardedManualEvent(input);
    const trip = await this.tripService.getTrip(input.tripId);
    if (!trip) throw new Error("Trip not found");

    const title = input.title.trim();
    if (!title) throw new Error("Event title is required");

    const participantIds = [...new Set(input.participantIds)];
    const memberIds = new Set(trip.participants.map(({ id }) => id));
    if (participantIds.length === 0) {
      throw new Error("At least one participant is required");
    }
    if (participantIds.some((participantId) => !memberIds.has(participantId))) {
      throw new Error("Event participant does not belong to the trip");
    }

    const event = await this.tripService.addEvent({
      tripId: input.tripId,
      type: input.type ?? "event",
      status: input.status ?? "confirmed",
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      location: input.location ?? null,
      participantIds,
      source: "manual",
      externalRef: null
    });
    const preset = buildCalendarPreset(trip, [event]);

    return {
      event: buildEventDetails(event, trip),
      participants: preset.participants.filter((participant) =>
        event.participantIds.includes(participant.id)
      )
    };
  }

  private async saveGuardedManualEvent(input: SaveManualCalendarEventInput): Promise<CalendarEventResult> {
    const guard = input.guard!;
    const participantIds = [...new Set(input.participantIds)];
    const externalRef = `manual:${input.tripId}:${guard.idempotencyKey}`;
    const db = getDatabase();

    const eventId = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.tripId}))`);

      const [existing] = await tx
        .select({ id: events.id })
        .from(events)
        .where(and(eq(events.source, "manual"), eq(events.externalRef, externalRef)))
        .limit(1);
      if (existing) return existing.id;

      const memberships = await tx
        .select({ participantId: tripMembers.participantId })
        .from(tripMembers)
        .where(eq(tripMembers.tripId, input.tripId));
      const memberIds = new Set(memberships.map(({ participantId }) => participantId));
      const gapIds = new Set(guard.gapParticipantIds);
      if (!memberIds.has(guard.actorParticipantId)) throw new Error("Actor is not a trip member");
      if (
        participantIds.length === 0 ||
        participantIds.some((id) => !memberIds.has(id) || !gapIds.has(id))
      ) {
        throw new Error("Event participant is not available in the gap");
      }
      if (
        input.startsAt < guard.gapStartsAt ||
        input.endsAt > guard.gapEndsAt ||
        input.endsAt <= input.startsAt
      ) {
        throw new Error("Event is outside the gap");
      }
      const returnBufferMinutes =
        (guard.nextRequiredAt.getTime() - input.endsAt.getTime()) / 60_000;
      if (returnBufferMinutes < guard.minimumReturnBufferMinutes) {
        throw new Error("Return buffer is too small");
      }

      const overlaps = await tx
        .select({ eventId: events.id, participantId: eventParticipants.participantId })
        .from(events)
        .innerJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
        .where(and(
          eq(events.tripId, input.tripId),
          inArray(eventParticipants.participantId, participantIds),
          ne(events.status, "cancelled"),
          ne(events.type, "poll"),
          ne(events.type, "draft"),
          lt(events.startsAt, input.endsAt),
          gt(events.endsAt, input.startsAt)
        ));
      if (overlaps.length > 0) throw new Error("Participant has an overlapping event");

      const title = input.title.trim();
      if (!title) throw new Error("Event title is required");
      if (input.status === "confirmed" && !guard.routeChecked) {
        throw new Error("An unchecked route cannot be confirmed");
      }
      const [event] = await tx
        .insert(events)
        .values({
          tripId: input.tripId,
          type: input.type ?? "event",
          status: guard.routeChecked ? (input.status ?? "confirmed") : "active",
          title,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          locationName: input.location?.name,
          locationLat: input.location?.lat,
          locationLon: input.location?.lon,
          locationMapUrl: input.location?.mapUrl,
          source: "manual",
          externalRef
        })
        .returning({ id: events.id });
      await tx.insert(eventParticipants).values(
        participantIds.map((participantId) => ({ eventId: event.id, participantId }))
      );
      return event.id;
    });

    const result = await this.getEvent(eventId, input.tripId);
    if (!result) throw new Error("Saved event could not be loaded");
    return result;
  }
}

export function createPostgresCalendarRepository() {
  return new PostgresCalendarRepository(createTripService());
}
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eventParticipants, events, tripMembers } from "@/db/schema";
