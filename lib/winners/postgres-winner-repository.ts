import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { candidates, events, polls, tripMembers, trips, voteResponses } from "@/db/schema";
import type { WinnerCandidate } from "@/lib/winner-repository";

type TravelSnapshot = {
  startsAt?: unknown;
  endsAt?: unknown;
  travelMode?: unknown;
  capacity?: unknown;
  returnBufferMinutes?: unknown;
  deeplink?: unknown;
  checkedAt?: unknown;
};

export async function getPostgresWinner(candidateId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({ candidate: candidates, poll: polls, timezone: trips.timezone })
    .from(candidates)
    .innerJoin(polls, eq(polls.id, candidates.pollId))
    .innerJoin(trips, eq(trips.id, polls.tripId))
    .where(and(eq(candidates.id, candidateId), eq(polls.status, "closed")))
    .limit(1);

  if (!row || row.poll.winnerCandidateId !== row.candidate.id) return null;

  const [[{ participantCount }], [{ yesCount }], [pollEvent]] = await Promise.all([
    db.select({ participantCount: sql<number>`count(*)::int` }).from(tripMembers).where(eq(tripMembers.tripId, row.poll.tripId)),
    db.select({ yesCount: sql<number>`count(*)::int` }).from(voteResponses).where(and(eq(voteResponses.candidateId, candidateId), eq(voteResponses.value, "yes"))),
    db.select({ startsAt: events.startsAt, endsAt: events.endsAt }).from(events).where(and(eq(events.tripId, row.poll.tripId), eq(events.externalRef, row.poll.id))).limit(1)
  ]);
  const snapshot = (row.candidate.travelOption ?? {}) as TravelSnapshot;
  const checkedStartsAt = validIso(snapshot.startsAt);
  const checkedEndsAt = validIso(snapshot.endsAt);
  const hasRouteSnapshot = Boolean(checkedStartsAt && checkedEndsAt);
  const startsAt = checkedStartsAt ?? pollEvent?.startsAt.toISOString() ?? row.poll.updatedAt.toISOString();
  const endsAt = checkedEndsAt ?? pollEvent?.endsAt.toISOString() ?? startsAt;
  const checkedAt = validIso(snapshot.checkedAt);
  const capacity = typeof snapshot.capacity === "number" ? snapshot.capacity : "unknown";
  const deeplink = safeHttps(snapshot.deeplink);

  const winner: WinnerCandidate = {
    id: row.candidate.id,
    presetId: "winner.rechecked",
    pollId: row.poll.id,
    pollStatus: "closed",
    title: row.candidate.title,
    transportLabel: hasRouteSnapshot ? transportLabel(snapshot.travelMode) : "Маршрут не проверен",
    dateLabel: new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: row.timezone }).format(new Date(startsAt)),
    departure: { time: formatTime(startsAt, row.timezone), place: hasRouteSnapshot ? "Точка отправления" : "Начало свободного окна" },
    arrival: { time: formatTime(endsAt, row.timezone), place: hasRouteSnapshot ? row.candidate.title : "Конец свободного окна" },
    calendarStartsAt: startsAt,
    calendarEndsAt: endsAt,
    votesLabel: `Выбрали ${yesCount} из ${participantCount}`,
    fitLabel: "нужна актуальная перепроверка маршрута",
    participantCount,
    recheckStatus: "stale",
    pricePerPerson: row.candidate.pricePerPerson ?? 0,
    capacity,
    returnBufferMinutes: typeof snapshot.returnBufferMinutes === "number" ? snapshot.returnBufferMinutes : 0,
    checkedAtLabel: checkedAt ? formatCheckedAt(checkedAt) : "ранее",
    deeplink
  };

  return { tripId: row.poll.tripId, winner };
}

function validIso(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function safeHttps(value: unknown) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date(iso));
}

function transportLabel(mode: unknown) {
  if (mode === "train") return "Поезд";
  if (mode === "walk") return "Пешком";
  if (mode === "mixed") return "Смешанный маршрут";
  return "Автобус";
}

function formatCheckedAt(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return minutes < 2 ? "только что" : `${minutes} мин назад`;
}
