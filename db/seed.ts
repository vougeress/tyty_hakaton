import "dotenv/config";

import { eq, sql } from "drizzle-orm";

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

const ids = {
  trip: "00000000-0000-4000-8000-000000000001",
  saintPetersburg: "00000000-0000-4000-8000-000000000002",
  nizhnyNovgorod: "00000000-0000-4000-8000-000000000003",
  sochi: "00000000-0000-4000-8000-000000000004",
  nikita: "00000000-0000-4000-8000-000000000101",
  anna: "00000000-0000-4000-8000-000000000102",
  maria: "00000000-0000-4000-8000-000000000103",
  ilya: "00000000-0000-4000-8000-000000000104",
  kremlin: "00000000-0000-4000-8000-000000001001",
  centerTransfer: "00000000-0000-4000-8000-000000001002",
  dinner: "00000000-0000-4000-8000-000000001003",
  train: "00000000-0000-4000-8000-000000001004",
  poll: "00000000-0000-4000-8000-000000002001",
  pollEvent: "00000000-0000-4000-8000-000000001005",
  candidateInnopolis: "00000000-0000-4000-8000-000000002101",
  candidateChakChak: "00000000-0000-4000-8000-000000002102",
  candidateSviyazhsk: "00000000-0000-4000-8000-000000002103",
  voteNikitaInnopolis: "00000000-0000-4000-8000-000000003101",
  voteAnnaInnopolis: "00000000-0000-4000-8000-000000003102",
  voteMariaChakChak: "00000000-0000-4000-8000-000000003103",
  voteIlyaSviyazhsk: "00000000-0000-4000-8000-000000003104"
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
      .insert(trips)
      .values([
        {
          id: ids.saintPetersburg,
          title: "Санкт-Петербург",
          timezone: "Europe/Moscow",
          startsAt: new Date("2026-06-12T00:00:00+03:00"),
          endsAt: new Date("2026-06-15T23:59:59+03:00"),
          ownerId: ids.nikita,
          inviteCode: "SPB2026",
          status: "archived"
        },
        {
          id: ids.nizhnyNovgorod,
          title: "Нижний Новгород",
          timezone: "Europe/Moscow",
          startsAt: new Date("2026-05-02T00:00:00+03:00"),
          endsAt: new Date("2026-05-05T23:59:59+03:00"),
          ownerId: ids.nikita,
          inviteCode: "NN2026",
          status: "archived"
        },
        {
          id: ids.sochi,
          title: "Сочи",
          timezone: "Europe/Moscow",
          startsAt: new Date("2026-01-03T00:00:00+03:00"),
          endsAt: new Date("2026-01-10T23:59:59+03:00"),
          ownerId: ids.nikita,
          inviteCode: "SOCHI2026",
          status: "archived"
        }
      ])
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
      .insert(tripMembers)
      .values([ids.saintPetersburg, ids.nizhnyNovgorod, ids.sochi].map((tripId) => ({
        tripId,
        participantId: ids.nikita,
        role: "owner" as const
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
          id: ids.centerTransfer,
          tripId: ids.trip,
          type: "transfer",
          status: "confirmed",
          title: "Переезд в центр",
          startsAt: new Date("2026-09-12T10:00:00+03:00"),
          endsAt: new Date("2026-09-12T11:55:00+03:00"),
          locationName: "Центр Казани",
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
        },
        {
          id: ids.pollEvent,
          tripId: ids.trip,
          type: "poll",
          status: "conflicted",
          title: "Голосование: свободное окно",
          startsAt: new Date("2026-09-12T12:20:00+03:00"),
          endsAt: new Date("2026-09-12T18:10:00+03:00"),
          locationName: "Казань",
          source: "demo_catalog",
          externalRef: ids.poll
        }
      ])
      .onConflictDoUpdate({
        target: events.id,
        set: {
          type: sql`excluded.type`,
          status: sql`excluded.status`,
          title: sql`excluded.title`,
          startsAt: sql`excluded.starts_at`,
          endsAt: sql`excluded.ends_at`,
          locationName: sql`excluded.location_name`,
          source: sql`excluded.source`,
          externalRef: sql`excluded.external_ref`,
          updatedAt: new Date()
        }
      });

    await tx
      .insert(eventParticipants)
      .values(
        [ids.kremlin, ids.centerTransfer, ids.dinner, ids.train, ids.pollEvent].flatMap((eventId) =>
          participantIds.map((participantId) => ({ eventId, participantId }))
        )
      )
      .onConflictDoNothing();

    await tx.delete(polls).where(eq(polls.id, ids.poll));

    await tx
      .insert(polls)
      .values({
        id: ids.poll,
        tripId: ids.trip,
        title: "Куда поедем в свободное окно?",
        status: "active",
        closesAt: new Date("2026-09-12T18:30:00+03:00"),
        createdByParticipantId: ids.nikita
      })
      .onConflictDoUpdate({
        target: polls.id,
        set: {
          title: sql`excluded.title`,
          status: sql`excluded.status`,
          closesAt: sql`excluded.closes_at`,
          closedAt: null,
          winnerCandidateId: null,
          finalistCandidateIds: [],
          version: 1,
          updatedAt: new Date()
        }
      });

    await tx
      .insert(candidates)
      .values([
        {
          id: ids.candidateInnopolis,
          pollId: ids.poll,
          title: "Иннополис",
          description: "Автобус туда-обратно, запас до ужина 58 минут",
          pricePerPerson: 790,
          source: "demo_catalog",
          sortOrder: 0,
          createdByParticipantId: ids.nikita
        },
        {
          id: ids.candidateChakChak,
          pollId: ids.poll,
          title: "Музей чак-чака",
          description: "Пешком по центру, без риска по расписанию",
          pricePerPerson: 800,
          source: "demo_catalog",
          sortOrder: 1,
          createdByParticipantId: ids.anna
        },
        {
          id: ids.candidateSviyazhsk,
          pollId: ids.poll,
          title: "Свияжск",
          description: "Электричка и прогулка, буфер минимальный",
          pricePerPerson: 2300,
          source: "demo_catalog",
          sortOrder: 2,
          createdByParticipantId: ids.maria
        }
      ])
      .onConflictDoUpdate({
        target: candidates.id,
        set: {
          title: sql`excluded.title`,
          description: sql`excluded.description`,
          pricePerPerson: sql`excluded.price_per_person`,
          source: sql`excluded.source`,
          sortOrder: sql`excluded.sort_order`,
          updatedAt: new Date()
        }
      });

    await tx
      .insert(voteResponses)
      .values([
        {
          id: ids.voteNikitaInnopolis,
          pollId: ids.poll,
          candidateId: ids.candidateInnopolis,
          participantId: ids.nikita,
          value: "yes"
        },
        {
          id: ids.voteAnnaInnopolis,
          pollId: ids.poll,
          candidateId: ids.candidateInnopolis,
          participantId: ids.anna,
          value: "yes"
        },
        {
          id: ids.voteMariaChakChak,
          pollId: ids.poll,
          candidateId: ids.candidateChakChak,
          participantId: ids.maria,
          value: "yes"
        },
        {
          id: ids.voteIlyaSviyazhsk,
          pollId: ids.poll,
          candidateId: ids.candidateSviyazhsk,
          participantId: ids.ilya,
          value: "veto"
        }
      ])
      .onConflictDoUpdate({
        target: voteResponses.id,
        set: {
          value: sql`excluded.value`,
          updatedAt: new Date()
        }
      });
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
