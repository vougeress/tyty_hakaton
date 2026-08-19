import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getDatabase } from "@/db/client";
import { participants, trips } from "@/db/schema";
import {
  PostgresCalendarRepository,
  type SaveManualCalendarEventInput
} from "@/lib/repositories/postgres-calendar-repository";
import { createTripService } from "@/lib/trips";

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("guarded manual event persistence", () => {
  const tripService = createTripService();
  const repository = new PostgresCalendarRepository(tripService);
  let tripId = "";
  let ownerId = "";

  beforeAll(async () => {
    const trip = await tripService.createTrip({
      title: `Manual test ${randomUUID()}`,
      timezone: "Europe/Moscow",
      startsAt: new Date("2026-09-12T00:00:00+03:00"),
      endsAt: new Date("2026-09-13T00:00:00+03:00"),
      owner: { displayName: "Test owner" }
    });
    tripId = trip.id;
    ownerId = trip.ownerId;
  });

  afterAll(async () => {
    if (!tripId) return;
    await getDatabase().delete(trips).where(eq(trips.id, tripId));
    await getDatabase().delete(participants).where(eq(participants.id, ownerId));
  });

  function input(idempotencyKey: string): SaveManualCalendarEventInput {
    return {
      tripId,
      title: "Речная прогулка",
      startsAt: new Date("2026-09-12T12:00:00+03:00"),
      endsAt: new Date("2026-09-12T13:00:00+03:00"),
      participantIds: [ownerId],
      location: { name: "Набережная" },
      type: "event" as const,
      status: "active" as const,
      guard: {
        actorParticipantId: ownerId,
        gapParticipantIds: [ownerId],
        gapStartsAt: new Date("2026-09-12T10:00:00+03:00"),
        gapEndsAt: new Date("2026-09-12T18:00:00+03:00"),
        nextRequiredAt: new Date("2026-09-12T19:20:00+03:00"),
        minimumReturnBufferMinutes: 80,
        idempotencyKey,
        routeChecked: false
      }
    };
  }

  it("returns one event for concurrent duplicate requests", async () => {
    const key = randomUUID();
    const [first, second] = await Promise.all([
      repository.saveManualEvent(input(key)),
      repository.saveManualEvent(input(key))
    ]);

    expect(second.event.id).toBe(first.event.id);
    expect(first.event.status).toBe("active");
    expect(first.event.routeLabel).toMatch(/не проверен/i);
  });

  it("rejects a new overlapping event for the same participant", async () => {
    await expect(repository.saveManualEvent(input(randomUUID()))).rejects.toThrow(/overlapping/i);
  });

  it("rejects a selected participant outside the trusted gap", async () => {
    const value = input(randomUUID());
    value.participantIds = [randomUUID()];
    await expect(repository.saveManualEvent(value)).rejects.toThrow(/not available/i);
  });

  it("never confirms an event whose route was not checked", async () => {
    const value = input(randomUUID());
    value.status = "confirmed";
    value.startsAt = new Date("2026-09-12T14:00:00+03:00");
    value.endsAt = new Date("2026-09-12T15:00:00+03:00");
    await expect(repository.saveManualEvent(value)).rejects.toThrow(/unchecked route/i);
  });
});
