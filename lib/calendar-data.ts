import type {
  CalendarGap,
  CalendarItem,
  CalendarParticipant,
  CalendarPreset,
  EventDetails
} from "@/lib/calendar-repository";
import type { CalendarEvent, TripDetails } from "@/lib/trips/contracts";

const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const TONES: CalendarParticipant["tone"][] = ["purple", "purple", "cyan", "lime"];

function zonedDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day"))
  };
}

function tripDateLabel(trip: TripDetails) {
  const start = zonedDateParts(trip.startsAt, trip.timezone);
  const end = zonedDateParts(trip.endsAt, trip.timezone);
  const monthParts = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: trip.timezone }).formatToParts(trip.endsAt);
  const month = monthParts.find((part) => part.type === "month")?.value ?? "";
  return `${start.day}–${end.day} ${month}`;
}

function calendarParticipants(trip: TripDetails): CalendarParticipant[] {
  return trip.participants.map((participant, index) => ({
    id: participant.id,
    displayName: participant.displayName,
    shortName: participant.displayName === "Никита" ? "Я" : participant.displayName,
    initial: participant.displayName.slice(0, 1).toUpperCase(),
    tone: TONES[index % TONES.length]
  }));
}

function shortTitle(event: CalendarEvent) {
  if (event.type === "poll") return event.status === "confirmed" ? event.title : "Голос";
  if (event.type === "booking") return event.title.includes("отел") ? "Отель" : "Поезд";
  if (event.title.includes("Кремл")) return "Кремль";
  if (event.title.includes("ужин")) return "Ужин";
  if (event.title.includes("центр")) return "Центр";
  return event.title.split(" ").slice(0, 2).join(" ");
}

function toCalendarItem(event: CalendarEvent, timezone: string): CalendarItem {
  return {
    id: event.id,
    tripId: event.tripId,
    type: event.type,
    status: event.status,
    title: event.title,
    shortTitle: shortTitle(event),
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    participantIds: event.participantIds,
    ...(event.location ? { location: event.location.name } : {}),
    source: event.source,
    secondaryLabel: zonedDateParts(event.startsAt, timezone).time,
    href: event.type === "poll" && event.externalRef ? `/polls/${event.externalRef}` : `/calendar/items/${event.id}`
  };
}

function deriveGap(trip: TripDetails, events: CalendarEvent[]): CalendarGap[] {
  // Polls and drafts describe proposals inside a window; they are not mandatory
  // calendar anchors and must not consume the window they are evaluating.
  const sorted = events
    .filter((event) => event.type !== "poll" && event.type !== "draft" && event.status !== "cancelled")
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  if (sorted.length < 2) return [];

  let previous = sorted[0];
  let busyUntil = previous.endsAt;
  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    const sameDay = zonedDateParts(busyUntil, trip.timezone).date === zonedDateParts(next.startsAt, trip.timezone).date;
    const gapMinutes = (next.startsAt.getTime() - busyUntil.getTime()) / 60_000;
    if (sameDay && gapMinutes >= 240) {
      const returnBufferMinutes = 80;
      const departureBufferMinutes = 25;
      const id = `gap-${previous.id}-${next.id}`;
      return [{
        id,
        tripId: trip.id,
        startsAt: new Date(busyUntil.getTime() + departureBufferMinutes * 60_000).toISOString(),
        endsAt: new Date(next.startsAt.getTime() - returnBufferMinutes * 60_000).toISOString(),
        participantIds: trip.participants.map(({ id }) => id),
        nextRequiredItemId: next.id,
        href: `/calendar/gaps/${id}/create`
      }];
    }

    if (next.endsAt > busyUntil) {
      previous = next;
      busyUntil = next.endsAt;
    }
  }
  return [];
}

function weekDays(trip: TripDetails, currentDate?: string): CalendarPreset["days"] {
  const start = zonedDateParts(trip.startsAt, trip.timezone);
  const localStart = new Date(Date.UTC(start.year, start.month - 1, start.day));
  const offsetToMonday = (localStart.getUTCDay() + 6) % 7;
  const monday = new Date(localStart);
  monday.setUTCDate(monday.getUTCDate() - offsetToMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const isoDate = date.toISOString().slice(0, 10);
    return {
      label: DAY_LABELS[date.getUTCDay()],
      date: date.getUTCDate(),
      isoDate,
      ...(isoDate === currentDate ? { isCurrent: true } : {})
    };
  });
}

export function buildCalendarPreset(trip: TripDetails, events: CalendarEvent[]): CalendarPreset {
  const gaps = deriveGap(trip, events);
  const currentDate = gaps[0] ? zonedDateParts(new Date(gaps[0].startsAt), trip.timezone).date : undefined;
  return {
    id: "calendar.default",
    trip: {
      id: trip.id,
      title: trip.title,
      timezone: trip.timezone,
      dateLabel: tripDateLabel(trip),
      participantIds: trip.participants.map(({ id }) => id)
    },
    participants: calendarParticipants(trip),
    days: weekDays(trip, currentDate),
    items: events.map((event) => toCalendarItem(event, trip.timezone)),
    gaps
  };
}

export function buildEventDetails(event: CalendarEvent, trip: TripDetails): EventDetails {
  const item = toCalendarItem(event, trip.timezone);
  return {
    ...item,
    presetId: event.title.includes("Кремл") ? "event.confirmed" : "event.generic",
    dateLabel: new Intl.DateTimeFormat("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: trip.timezone
    }).format(event.startsAt),
    mapLabel: event.location?.name ?? trip.title,
    mapUrl: event.location?.mapUrl ?? `https://yandex.ru/maps/?text=${encodeURIComponent(event.location?.name ?? trip.title)}`,
    routeLabel: event.source === "manual" && event.status !== "confirmed"
      ? "Маршрут не проверен · уточните время в пути до события"
      : "Маршрут и время в пути уточняются",
    ticketCount: event.type === "booking" ? event.participantIds.length : 0,
    photoCount: 0
  };
}
