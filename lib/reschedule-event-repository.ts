import "server-only";

import { and, asc, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eventParticipants, events, participants, tripMembers, trips } from "@/db/schema";
import { parseLocalDateTimeInTimeZone } from "@/lib/manual-event-service";
import type { CalendarEvent } from "@/lib/trips/contracts";

const REQUIRED_BUFFER_MINUTES = 15;
const FALLBACK_ROUTE_MINUTES = 30;

export type RescheduleEventInput = {
  tripId: string;
  conflictId: string;
  eventId: string;
  actorParticipantId: string;
  title: string;
  locationName: string;
  startsAtLocal: string;
  endsAtLocal: string;
};

export type RescheduleEventResult =
  | { status: "success"; eventId: string }
  | { status: "error"; message: string };

export class PostgresRescheduleEventRepository {
  async reschedule(input: RescheduleEventInput): Promise<RescheduleEventResult> {
    try {
      return await getDatabase().transaction(async (tx) => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.tripId}))`);

        const [trip] = await tx.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
        if (!trip || trip.status !== "active") return error("Поездка больше не активна.");

        const memberRows = await tx
          .select({ participantId: tripMembers.participantId })
          .from(tripMembers)
          .where(eq(tripMembers.tripId, input.tripId));
        const memberIds = new Set(memberRows.map(({ participantId }) => participantId));
        if (!memberIds.has(input.actorParticipantId)) return error("Выбранный участник не состоит в поездке.");

        const eventRows = await tx.select().from(events)
          .where(eq(events.tripId, input.tripId)).orderBy(asc(events.startsAt));
        const attendeeRows = eventRows.length
          ? await tx.select().from(eventParticipants)
              .where(inArray(eventParticipants.eventId, eventRows.map(({ id }) => id)))
          : [];
        const attendeeIds = new Map<string, string[]>();
        for (const row of attendeeRows) {
          const ids = attendeeIds.get(row.eventId) ?? [];
          ids.push(row.participantId);
          attendeeIds.set(row.eventId, ids);
        }
        const timeline = eventRows.map((row) => toCalendarEvent(row, attendeeIds.get(row.id) ?? []));
        const current = timeline.find(({ id }) => id === input.eventId);
        if (!current || current.status === "cancelled" || current.type === "poll" || current.type === "draft") {
          return error("Событие нельзя перенести.");
        }
        if (!isLinkedCurrentConflict(timeline, input.conflictId, input.eventId)) {
          return error("Конфликт уже изменился. Вернитесь к актуальной проверке поездки.");
        }

        const startsAt = parseLocalDateTimeInTimeZone(input.startsAtLocal, trip.timezone);
        const endsAt = parseLocalDateTimeInTimeZone(input.endsAtLocal, trip.timezone);
        if (!startsAt || !endsAt || endsAt <= startsAt) return error("Проверьте дату и местное время события.");
        if (startsAt < trip.startsAt || endsAt > trip.endsAt) return error("Событие должно оставаться в границах поездки.");

        const title = input.title.trim();
        const locationName = input.locationName.trim();
        if (!title || !locationName) return error("Заполните название и место события.");
        if (!current.participantIds.length || current.participantIds.some((id) => !memberIds.has(id))) {
          return error("У события некорректный список участников.");
        }

        const overlaps = await tx.select({ id: events.id }).from(events)
          .innerJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
          .where(and(
            eq(events.tripId, input.tripId),
            ne(events.id, input.eventId),
            inArray(eventParticipants.participantId, current.participantIds),
            ne(events.status, "cancelled"),
            ne(events.type, "poll"),
            ne(events.type, "draft"),
            lt(events.startsAt, endsAt),
            gt(events.endsAt, startsAt)
          )).limit(1);
        if (overlaps.length) return error("У одного из участников в это время уже есть событие.");

        const proposed: CalendarEvent = {
          ...current,
          title,
          startsAt,
          endsAt,
          location: { ...(current.location ?? {}), name: locationName }
        };
        const selected = new Set(current.participantIds);
        const neighbours = timeline.filter((event) =>
          event.id !== input.eventId && event.status !== "cancelled" && event.status !== "draft" &&
          event.type !== "draft" && event.type !== "poll" &&
          event.participantIds.some((id) => selected.has(id))
        );
        const previous = neighbours.filter((event) => event.endsAt <= startsAt)
          .sort((left, right) => right.endsAt.getTime() - left.endsAt.getTime())[0];
        const next = neighbours.filter((event) => event.startsAt >= endsAt)
          .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())[0];

        const beforeProblem = previous && routeProblem(previous, proposed, startsAt.getTime() - previous.endsAt.getTime());
        if (beforeProblem) return error(beforeProblem);
        const afterProblem = next && routeProblem(proposed, next, next.startsAt.getTime() - endsAt.getTime());
        if (afterProblem) return error(afterProblem);

        await tx.update(events).set({ title, startsAt, endsAt, locationName, updatedAt: new Date() })
          .where(and(eq(events.id, input.eventId), eq(events.tripId, input.tripId)));
        return { status: "success", eventId: input.eventId };
      });
    } catch {
      return error("Не удалось перенести событие. Обновите расписание и попробуйте снова.");
    }
  }
}

function isLinkedCurrentConflict(timeline: CalendarEvent[], conflictId: string, eventId: string) {
  const anchors = timeline.filter((event) =>
    event.status !== "cancelled" && event.status !== "draft" && event.type !== "draft" && event.type !== "poll"
  ).sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  return anchors.slice(0, -1).some((previous, index) => {
    const next = anchors[index + 1];
    const shared = previous.participantIds.some((id) => next.participantIds.includes(id));
    if (!shared || (previous.id !== eventId && next.id !== eventId)) return false;
    const kind = next.startsAt < previous.endsAt ? "overlap" : "route";
    return conflictId === `${kind}-${previous.id}-${next.id}`;
  });
}

function routeProblem(from: CalendarEvent, to: CalendarEvent, availableMs: number) {
  const fromName = from.location?.name.trim().toLocaleLowerCase("ru-RU");
  const toName = to.location?.name.trim().toLocaleLowerCase("ru-RU");
  if (!fromName || !toName || fromName === toName || from.type === "transfer" || to.type === "transfer") return null;
  const required = routeMinutes(from, to) + REQUIRED_BUFFER_MINUTES;
  const available = Math.floor(availableMs / 60_000);
  return available < required
    ? `Между «${from.title}» и «${to.title}» нужно минимум ${required} мин. с обязательным буфером ${REQUIRED_BUFFER_MINUTES} мин.`
    : null;
}

function routeMinutes(fromEvent: CalendarEvent, toEvent: CalendarEvent) {
  const from = fromEvent.location;
  const to = toEvent.location;
  if (from?.lat === undefined || from.lon === undefined || to?.lat === undefined || to.lon === undefined) {
    return FALLBACK_ROUTE_MINUTES;
  }
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lon - from.lon);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(10, Math.ceil((distanceKm / 25) * 60 / 5) * 5);
}

function toCalendarEvent(row: typeof events.$inferSelect, participantIds: string[]): CalendarEvent {
  return {
    id: row.id, tripId: row.tripId, type: row.type, status: row.status, title: row.title,
    startsAt: row.startsAt, endsAt: row.endsAt,
    location: row.locationName ? {
      name: row.locationName,
      ...(row.locationLat === null ? {} : { lat: row.locationLat }),
      ...(row.locationLon === null ? {} : { lon: row.locationLon }),
      ...(row.locationMapUrl === null ? {} : { mapUrl: row.locationMapUrl })
    } : null,
    participantIds, source: row.source, externalRef: row.externalRef
  };
}

function error(message: string): RescheduleEventResult {
  return { status: "error", message };
}

export function createPostgresRescheduleEventRepository() {
  return new PostgresRescheduleEventRepository();
}
