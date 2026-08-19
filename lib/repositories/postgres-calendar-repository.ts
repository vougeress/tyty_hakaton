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
};

export interface AsyncCalendarRepository {
  getWeek(tripId: string): Promise<CalendarPreset | null>;
  getEvent(itemId: string): Promise<CalendarEventResult | null>;
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

  async getEvent(itemId: string): Promise<CalendarEventResult | null> {
    const event = await this.tripService.getEvent(itemId);
    if (!event) return null;

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
}

export function createPostgresCalendarRepository() {
  return new PostgresCalendarRepository(createTripService());
}
