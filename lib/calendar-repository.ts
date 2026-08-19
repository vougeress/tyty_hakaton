export type CalendarItemType = "booking" | "event" | "transfer" | "poll" | "draft";

export type CalendarItemStatus =
  | "draft"
  | "active"
  | "conflicted"
  | "confirmed"
  | "cancelled";

export type CalendarItem = {
  id: string;
  tripId: string;
  type: CalendarItemType;
  status: CalendarItemStatus;
  title: string;
  shortTitle: string;
  startsAt: string;
  endsAt: string;
  participantIds: string[];
  location?: string;
  source: "manual" | "tutu" | "demo_catalog" | "external";
  secondaryLabel?: string;
  href: string;
};

export type CalendarGap = {
  id: string;
  tripId: string;
  startsAt: string;
  endsAt: string;
  participantIds: string[];
  nextRequiredItemId?: string;
  href: string;
};

export type CalendarParticipant = {
  id: string;
  displayName: string;
  shortName: string;
  initial: string;
  tone: "purple" | "cyan" | "lime";
};

export type CalendarTrip = {
  id: string;
  title: string;
  timezone: string;
  dateLabel: string;
  participantIds: string[];
};

export type CalendarPreset = {
  id: "calendar.default";
  trip: CalendarTrip;
  participants: CalendarParticipant[];
  days: Array<{ label: string; date: number; isoDate: string; isCurrent?: boolean }>;
  items: CalendarItem[];
  gaps: CalendarGap[];
};

export type EventDetails = CalendarItem & {
  presetId: "event.confirmed" | "event.generic";
  dateLabel: string;
  mapLabel: string;
  mapUrl: string;
  routeLabel: string;
  ticketCount: number;
  photoCount: number;
};

export interface CalendarRepository {
  getCalendarPreset(): CalendarPreset;
  getEvent(itemId: string): EventDetails | null;
}

const participants: CalendarParticipant[] = [
  { id: "nikita", displayName: "Никита", shortName: "Я", initial: "Н", tone: "purple" },
  { id: "anna", displayName: "Анна", shortName: "Аня", initial: "А", tone: "purple" },
  { id: "maria", displayName: "Мария", shortName: "Маша", initial: "М", tone: "cyan" },
  { id: "ilya", displayName: "Илья", shortName: "Илья", initial: "И", tone: "lime" }
];

const allParticipants = participants.map(({ id }) => id);

const items: CalendarItem[] = [
  {
    id: "arrival-train",
    tripId: "kazan-demo",
    type: "booking",
    status: "confirmed",
    title: "Поезд Москва — Казань",
    shortTitle: "Поезд",
    startsAt: "2026-09-10T19:40:00+03:00",
    endsAt: "2026-09-10T21:40:00+03:00",
    participantIds: allParticipants,
    source: "tutu",
    secondaryLabel: "Билет",
    href: "/calendar/items/arrival-train"
  },
  {
    id: "kremlin",
    tripId: "kazan-demo",
    type: "event",
    status: "confirmed",
    title: "Казанский Кремль",
    shortTitle: "Кремль",
    startsAt: "2026-09-11T11:00:00+03:00",
    endsAt: "2026-09-11T13:00:00+03:00",
    participantIds: allParticipants,
    location: "Кремль, Казань",
    source: "manual",
    secondaryLabel: "11:00",
    href: "/calendar/items/kremlin"
  },
  {
    id: "lunch",
    tripId: "kazan-demo",
    type: "event",
    status: "active",
    title: "Обед",
    shortTitle: "Обед",
    startsAt: "2026-09-11T14:30:00+03:00",
    endsAt: "2026-09-11T15:55:00+03:00",
    participantIds: allParticipants,
    source: "manual",
    secondaryLabel: "14:30",
    href: "/calendar/items/lunch"
  },
  {
    id: "city-transfer",
    tripId: "kazan-demo",
    type: "transfer",
    status: "confirmed",
    title: "Переезд в центр",
    shortTitle: "Центр",
    startsAt: "2026-09-12T10:00:00+03:00",
    endsAt: "2026-09-12T11:55:00+03:00",
    participantIds: allParticipants,
    source: "manual",
    secondaryLabel: "10:00",
    href: "/calendar/items/city-transfer"
  },
  {
    id: "dinner",
    tripId: "kazan-demo",
    type: "event",
    status: "active",
    title: "Ужин на Баумана",
    shortTitle: "Ужин",
    startsAt: "2026-09-12T19:30:00+03:00",
    endsAt: "2026-09-12T21:00:00+03:00",
    participantIds: allParticipants,
    source: "manual",
    secondaryLabel: "19:30",
    href: "/calendar/items/dinner"
  },
  {
    id: "sunday-poll",
    tripId: "kazan-demo",
    type: "poll",
    status: "conflicted",
    title: "Куда перед поездом?",
    shortTitle: "Куда?",
    startsAt: "2026-09-13T10:20:00+03:00",
    endsAt: "2026-09-13T12:40:00+03:00",
    participantIds: allParticipants,
    source: "demo_catalog",
    secondaryLabel: "⚠ 3/4",
    href: "/conflicts/schedule-shift"
  },
  {
    id: "return-train",
    tripId: "kazan-demo",
    type: "booking",
    status: "confirmed",
    title: "Поезд Казань — Москва",
    shortTitle: "Поезд",
    startsAt: "2026-09-13T15:30:00+03:00",
    endsAt: "2026-09-13T19:05:00+03:00",
    participantIds: allParticipants,
    source: "tutu",
    secondaryLabel: "15:30",
    href: "/calendar/items/return-train"
  },
  {
    id: "packing-draft",
    tripId: "kazan-demo",
    type: "draft",
    status: "draft",
    title: "Собрать вещи",
    shortTitle: "Черновик",
    startsAt: "2026-09-10T09:20:00+03:00",
    endsAt: "2026-09-10T10:10:00+03:00",
    participantIds: ["nikita"],
    source: "manual",
    secondaryLabel: "09:20",
    href: "/calendar/items/packing-draft"
  }
];

const eventDetails: EventDetails = {
  ...items.find(({ id }) => id === "kremlin")!,
  presetId: "event.confirmed",
  dateLabel: "Пятница, 11 сентября",
  mapLabel: "Кремль, Казань",
  mapUrl: "https://yandex.ru/maps/?text=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%81%D0%BA%D0%B8%D0%B9%20%D0%9A%D1%80%D0%B5%D0%BC%D0%BB%D1%8C",
  routeLabel: "От отеля 18 минут пешком · выехать в 10:32",
  ticketCount: 4,
  photoCount: 6
};

export const mockCalendarRepository: CalendarRepository = {
  getCalendarPreset() {
    return {
      id: "calendar.default",
      trip: {
        id: "kazan-demo",
        title: "Казань",
        timezone: "Europe/Moscow",
        dateLabel: "10–13 сентября",
        participantIds: allParticipants
      },
      participants,
      days: [
        { label: "Пн", date: 7, isoDate: "2026-09-07" },
        { label: "Вт", date: 8, isoDate: "2026-09-08" },
        { label: "Ср", date: 9, isoDate: "2026-09-09" },
        { label: "Чт", date: 10, isoDate: "2026-09-10" },
        { label: "Пт", date: 11, isoDate: "2026-09-11" },
        { label: "Сб", date: 12, isoDate: "2026-09-12", isCurrent: true },
        { label: "Вс", date: 13, isoDate: "2026-09-13" }
      ],
      items,
      gaps: [
        {
          id: "demo-gap",
          tripId: "kazan-demo",
          startsAt: "2026-09-12T12:20:00+03:00",
          endsAt: "2026-09-12T18:10:00+03:00",
          participantIds: allParticipants,
          nextRequiredItemId: "dinner",
          href: "/calendar/gaps/demo-gap/create"
        }
      ]
    };
  },
  getEvent(itemId) {
    if (itemId === "kremlin") return eventDetails;

    const item = items.find(({ id }) => id === itemId);
    if (!item) return null;

    return {
      ...item,
      presetId: "event.generic",
      dateLabel: "Событие поездки",
      mapLabel: item.location ?? "Казань",
      mapUrl: "https://yandex.ru/maps/?text=%D0%9A%D0%B0%D0%B7%D0%B0%D0%BD%D1%8C",
      routeLabel: "Маршрут и время в пути уточняются",
      ticketCount: item.type === "booking" ? 4 : 0,
      photoCount: 0
    };
  }
};
