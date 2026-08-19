import type { PhotoCalendarBinding } from "./types";

type TripEvent = {
  id: string;
  tripId: string;
  title: string;
  startsAt: string;
  endsAt: string;
};

const demoEvents: TripEvent[] = [
  {
    id: "kremlin",
    tripId: "demo-trip",
    title: "Казанский Кремль",
    startsAt: "2026-09-11T11:00:00+03:00",
    endsAt: "2026-09-11T13:00:00+03:00"
  },
  {
    id: "baumana-dinner",
    tripId: "demo-trip",
    title: "Ужин на Баумана",
    startsAt: "2026-09-12T19:30:00+03:00",
    endsAt: "2026-09-12T21:00:00+03:00"
  },
  {
    id: "return-train",
    tripId: "demo-trip",
    title: "Поезд Казань - Москва",
    startsAt: "2026-09-13T15:30:00+03:00",
    endsAt: "2026-09-13T21:10:00+03:00"
  }
];

export function bindPhotoToCalendar(tripId: string, takenAt: string | null): PhotoCalendarBinding {
  if (!takenAt) {
    return {
      calendarDay: null,
      eventId: null,
      eventTitle: "Без даты"
    };
  }

  const takenTime = Date.parse(takenAt);
  if (!Number.isFinite(takenTime)) {
    return {
      calendarDay: null,
      eventId: null,
      eventTitle: "Без даты"
    };
  }

  const event = demoEvents.find((item) => {
    if (item.tripId !== tripId) {
      return false;
    }

    return takenTime >= Date.parse(item.startsAt) && takenTime <= Date.parse(item.endsAt);
  });

  return {
    calendarDay: takenAt.slice(0, 10),
    eventId: event?.id ?? null,
    eventTitle: event?.title ?? null
  };
}
