import "dotenv/config";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eventParticipants, events, participants, tripMembers, trips } from "@/db/schema";

const ids = {
  trip: "00000000-0000-4000-8000-000000000001",
  nikita: "00000000-0000-4000-8000-000000000101",
  anna: "00000000-0000-4000-8000-000000000102",
  maria: "00000000-0000-4000-8000-000000000103",
  ilya: "00000000-0000-4000-8000-000000000104",
  kremlin: "00000000-0000-4000-8000-000000001001",
  checkout: "00000000-0000-4000-8000-000000001002",
  dinner: "00000000-0000-4000-8000-000000001003",
  train: "00000000-0000-4000-8000-000000001004"
} as const;

const participantIds = [ids.nikita, ids.anna, ids.maria, ids.ilya];

async function seed() {
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .insert(participants)
      .values([
        { id: ids.nikita, displayName: "Никита" },
        { id: ids.anna, displayName: "Анна" },
        { id: ids.maria, displayName: "Мария" },
        { id: ids.ilya, displayName: "Илья" }
      ])
      .onConflictDoNothing();

    await tx
      .insert(trips)
      .values({
        id: ids.trip,
        title: "Казань",
        timezone: "Europe/Moscow",
        startsAt: new Date("2026-09-10T00:00:00+03:00"),
        endsAt: new Date("2026-09-13T23:59:59+03:00"),
        ownerId: ids.nikita,
        inviteCode: "KAZAN2026",
        status: "active"
      })
      .onConflictDoNothing();

    await tx
      .insert(tripMembers)
      .values(participantIds.map((participantId, index) => ({
        tripId: ids.trip,
        participantId,
        role: index === 0 ? "owner" as const : "member" as const
      })))
      .onConflictDoNothing();

    await tx
      .insert(events)
      .values([
        {
          id: ids.kremlin,
          tripId: ids.trip,
          type: "event",
          status: "confirmed",
          title: "Казанский Кремль",
          startsAt: new Date("2026-09-11T11:00:00+03:00"),
          endsAt: new Date("2026-09-11T13:00:00+03:00"),
          locationName: "Казанский Кремль",
          source: "manual"
        },
        {
          id: ids.checkout,
          tripId: ids.trip,
          type: "booking",
          status: "confirmed",
          title: "Выезд из отеля",
          startsAt: new Date("2026-09-12T11:50:00+03:00"),
          endsAt: new Date("2026-09-12T12:20:00+03:00"),
          locationName: "Отель в центре Казани",
          source: "manual"
        },
        {
          id: ids.dinner,
          tripId: ids.trip,
          type: "event",
          status: "confirmed",
          title: "Обязательный ужин",
          startsAt: new Date("2026-09-12T19:30:00+03:00"),
          endsAt: new Date("2026-09-12T20:30:00+03:00"),
          locationName: "Центр Казани",
          source: "manual"
        },
        {
          id: ids.train,
          tripId: ids.trip,
          type: "booking",
          status: "confirmed",
          title: "Поезд в Москву",
          startsAt: new Date("2026-09-12T21:10:00+03:00"),
          endsAt: new Date("2026-09-13T08:00:00+03:00"),
          locationName: "Казань-Пассажирская",
          source: "tutu",
          externalRef: "demo:tutu:train-kazan-moscow"
        }
      ])
      .onConflictDoNothing();

    await tx
      .insert(eventParticipants)
      .values(
        [ids.kremlin, ids.checkout, ids.dinner, ids.train].flatMap((eventId) =>
          participantIds.map((participantId) => ({ eventId, participantId }))
        )
      )
      .onConflictDoNothing();
  });

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(trips);
  console.log(`Seed complete. Trips in database: ${count}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    process.exit();
  });
