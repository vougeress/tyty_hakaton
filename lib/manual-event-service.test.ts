import { describe, expect, it } from "vitest";

import type { ManualEventDraft } from "./manual-event-repository";
import {
  buildManualEventContext,
  parseLocalDateTimeInTimeZone,
  validateManualEventDraft
} from "./manual-event-service";
import type { CalendarEvent, TripDetails } from "./trips/contracts";

const trip: TripDetails = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Казань",
  timezone: "Europe/Moscow",
  startsAt: new Date("2026-09-10T00:00:00+03:00"),
  endsAt: new Date("2026-09-13T23:59:59+03:00"),
  ownerId: "00000000-0000-4000-8000-000000000101",
  inviteCode: "KAZAN2026",
  status: "active",
  participants: [
    {
      id: "00000000-0000-4000-8000-000000000101",
      displayName: "Никита",
      avatarUrl: null,
      role: "owner"
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      displayName: "Анна",
      avatarUrl: null,
      role: "member"
    }
  ]
};

const timeline: CalendarEvent[] = [
  {
    id: "00000000-0000-4000-8000-000000001001",
    tripId: trip.id,
    type: "transfer",
    status: "confirmed",
    title: "Переезд в центр",
    startsAt: new Date("2026-09-12T10:00:00+03:00"),
    endsAt: new Date("2026-09-12T11:55:00+03:00"),
    location: { name: "Центр" },
    participantIds: trip.participants.map(({ id }) => id),
    source: "manual",
    externalRef: null
  },
  {
    id: "00000000-0000-4000-8000-000000001003",
    tripId: trip.id,
    type: "poll",
    status: "conflicted",
    title: "Голосование: свободное окно",
    startsAt: new Date("2026-09-12T12:20:00+03:00"),
    endsAt: new Date("2026-09-12T18:10:00+03:00"),
    location: { name: "Казань" },
    participantIds: trip.participants.map(({ id }) => id),
    source: "demo_catalog",
    externalRef: "00000000-0000-4000-8000-000000002001"
  },
  {
    id: "00000000-0000-4000-8000-000000001002",
    tripId: trip.id,
    type: "event",
    status: "confirmed",
    title: "Обязательный ужин",
    startsAt: new Date("2026-09-12T19:30:00+03:00"),
    endsAt: new Date("2026-09-12T20:30:00+03:00"),
    location: { name: "Баумана" },
    participantIds: trip.participants.map(({ id }) => id),
    source: "manual",
    externalRef: null
  }
];

const GAP_ID = "gap-00000000-0000-4000-8000-000000001001-00000000-0000-4000-8000-000000001002";

function draft(gapId: string, overrides: Partial<ManualEventDraft> = {}): ManualEventDraft {
  return {
    gapId,
    title: "Речная прогулка",
    startsAt: "2026-09-12T15:00",
    endsAt: "2026-09-12T16:30",
    locationName: "Кремлёвская набережная",
    participantIds: trip.participants.map(({ id }) => id),
    publicationMode: "direct",
    ...overrides
  };
}

describe("manual event context and validation", () => {
  it("builds the form from the real trip timeline and members", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID);

    expect(context?.gap.tripId).toBe(trip.id);
    expect(context?.gap.id).toBe(
      GAP_ID
    );
    expect(context?.gap.nextEventTitle).toBe("Обязательный ужин");
    expect(context?.participants.map(({ displayName }) => displayName)).toEqual(["Никита", "Анна"]);
    expect(context?.utcOffset).toBe("+03:00");
  });

  it("accepts a direct event inside the trusted gap", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    const result = validateManualEventDraft(context, draft(context.gap.id), trip.ownerId);

    expect(result.ok).toBe(true);
    expect(result.logistics?.returnBufferMinutes).toBe(180);
  });

  it("rejects participants outside the trip", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    const result = validateManualEventDraft(
      context,
      draft(context.gap.id, { participantIds: ["00000000-0000-4000-8000-000000009999"] }),
      trip.ownerId
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/участников/i);
  });

  it("rejects an event outside the server-derived gap", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    const result = validateManualEventDraft(
      context,
      draft(context.gap.id, { endsAt: "2026-09-12T18:30" }),
      trip.ownerId
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/окно/i);
  });

  it("rejects a spoofed current participant", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    const result = validateManualEventDraft(
      context,
      draft(context.gap.id),
      "00000000-0000-4000-8000-000000009999"
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/не состоит/i);
  });

  it("rejects a trip member who is not available in this gap", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    context.gap.participantIds = [trip.ownerId];
    const result = validateManualEventDraft(
      context,
      draft(context.gap.id, { participantIds: [trip.participants[1].id] }),
      trip.ownerId
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/участников/i);
  });

  it("blocks a per-participant overlap", () => {
    const context = buildManualEventContext(trip, timeline, GAP_ID)!;
    context.busyIntervals.push({
      eventId: "overlap",
      title: "Личная встреча Анны",
      startsAt: "2026-09-12T12:30:00.000Z",
      endsAt: "2026-09-12T13:30:00.000Z",
      participantIds: [trip.participants[1].id]
    });
    const result = validateManualEventDraft(
      context,
      draft(context.gap.id),
      trip.ownerId
    );

    expect(result.ok).toBe(false);
    expect(result.logistics?.status).toBe("blocking");
    expect(result.message).toMatch(/Личная встреча Анны/);
  });

  it("parses IANA local time and rejects DST gaps and ambiguity", () => {
    expect(parseLocalDateTimeInTimeZone("2026-09-12T15:00", "Europe/Moscow")?.toISOString())
      .toBe("2026-09-12T12:00:00.000Z");
    expect(parseLocalDateTimeInTimeZone("2026-03-29T02:30", "Europe/Berlin")).toBeNull();
    expect(parseLocalDateTimeInTimeZone("2026-10-25T02:30", "Europe/Berlin")).toBeNull();
  });

  it("uses the maximum end of overlapping anchors for a stable gap", () => {
    const longOverlap: CalendarEvent = {
      ...timeline[0],
      id: "00000000-0000-4000-8000-000000001009",
      title: "Длинный переезд",
      startsAt: new Date("2026-09-12T11:00:00+03:00"),
      endsAt: new Date("2026-09-12T13:00:00+03:00")
    };
    const context = buildManualEventContext(
      trip,
      [...timeline, longOverlap],
      `gap-${longOverlap.id}-${timeline[2].id}`
    )!;

    expect(context.gap.startsAt).toBe("2026-09-12T10:25:00.000Z");
    expect(context.gap.id).toContain(longOverlap.id);
  });
});
