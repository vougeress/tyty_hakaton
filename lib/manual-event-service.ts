import { buildCalendarPreset } from "./calendar-data";
import type {
  ManualEventContext,
  ManualEventDraft
} from "./manual-event-repository";
import type { CalendarEvent, TripDetails } from "./trips/contracts";
import type { TripService } from "./trips/trip-service";

const MINUTE_MS = 60_000;

export type ManualEventValidation = {
  ok: boolean;
  message: string;
  logistics?: ManualEventContext["logistics"];
  startsAt?: Date;
  endsAt?: Date;
};

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`
  };
}

function utcOffsetAt(date: Date, timezone: string) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset"
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
  const match = name?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  return match ? `${match[1]}${match[2]}:${match[3]}` : "+00:00";
}

function dateLabel(startsAt: Date, endsAt: Date, timezone: string) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: timezone
  }).format(startsAt);
  return `${date} · ${zonedParts(startsAt, timezone).time}–${zonedParts(endsAt, timezone).time}`;
}

function initialRange(startsAt: Date, endsAt: Date) {
  const duration = endsAt.getTime() - startsAt.getTime();
  const eventDuration = Math.min(90 * MINUTE_MS, duration);
  const start = new Date(startsAt.getTime() + Math.max(0, (duration - eventDuration) / 2));
  return { startsAt: start, endsAt: new Date(start.getTime() + eventDuration) };
}

export function parseLocalDateTimeInTimeZone(value: string, timezone: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const desired = `${year}-${month}-${day}T${hour}:${minute}`;
  const naiveUtc = Date.UTC(+year, +month - 1, +day, +hour, +minute);
  const matches: Date[] = [];

  // Timezone offsets in the IANA database are within ±14 hours and may use
  // 15-minute increments. Finding the matching instant also detects DST gaps
  // and ambiguous fall-back local times instead of silently choosing one.
  for (let offsetMinutes = -14 * 60; offsetMinutes <= 14 * 60; offsetMinutes += 15) {
    const instant = new Date(naiveUtc - offsetMinutes * MINUTE_MS);
    const parts = zonedParts(instant, timezone);
    if (`${parts.date}T${parts.time}` === desired) matches.push(instant);
  }

  return matches.length === 1 ? matches[0] : null;
}

export function buildManualEventContext(
  trip: TripDetails,
  timeline: CalendarEvent[],
  gapId: string
): ManualEventContext | null {
  const preset = buildCalendarPreset(trip, timeline);
  const gap = gapId === "demo-gap"
    ? preset.gaps[0]
    : preset.gaps.find((candidate) => candidate.id === gapId);
  if (!gap) return null;

  const next = gap.nextRequiredItemId
    ? timeline.find((event) => event.id === gap.nextRequiredItemId)
    : undefined;
  const nextRequiredAt = next?.startsAt ?? new Date(gap.endsAt);
  const initial = initialRange(new Date(gap.startsAt), new Date(gap.endsAt));
  const returnBufferMinutes = Math.round(
    (nextRequiredAt.getTime() - initial.endsAt.getTime()) / MINUTE_MS
  );

  return {
    presetId: "create.gap_selected",
    timezone: trip.timezone,
    utcOffset: utcOffsetAt(new Date(gap.startsAt), trip.timezone),
    currentParticipantId: trip.ownerId,
    participants: trip.participants.map((participant) => ({
      id: participant.id,
      displayName: participant.displayName,
      initial: participant.displayName.slice(0, 1).toUpperCase(),
      isCurrent: participant.id === trip.ownerId
    })),
    busyIntervals: timeline
      .filter((event) => event.type !== "poll" && event.type !== "draft" && event.status !== "cancelled")
      .map((event) => ({
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString(),
        participantIds: event.participantIds
      })),
    gap: {
      id: gap.id,
      tripId: trip.id,
      startsAt: gap.startsAt,
      endsAt: gap.endsAt,
      dateLabel: dateLabel(new Date(gap.startsAt), new Date(gap.endsAt), trip.timezone),
      participantIds: gap.participantIds,
      nextEventTitle: next?.title ?? "следующего события",
      nextRequiredAt: nextRequiredAt.toISOString(),
      bufferToNextEventMinutes: Math.round(
        (nextRequiredAt.getTime() - new Date(gap.endsAt).getTime()) / MINUTE_MS
      )
    },
    initialDraft: {
      gapId: gap.id,
      title: "",
      startsAt: initial.startsAt.toISOString(),
      endsAt: initial.endsAt.toISOString(),
      locationName: "",
      participantIds: gap.participantIds,
      publicationMode: "direct"
    },
    logistics: {
      status: "unchecked",
      travelMinutes: null,
      returnBufferMinutes,
      message: "Проверьте расписание перед сохранением."
    }
  };
}

export function validateManualEventDraft(
  context: ManualEventContext,
  draft: ManualEventDraft,
  currentParticipantId: string
): ManualEventValidation {
  if (draft.gapId !== context.gap.id) {
    return { ok: false, message: "Свободное окно изменилось. Обновите страницу." };
  }
  if (!context.participants.some(({ id }) => id === currentParticipantId)) {
    return { ok: false, message: "Выбранный участник не состоит в поездке." };
  }
  const title = draft.title.trim();
  const location = draft.locationName.trim();
  if (!title || !location) {
    return { ok: false, message: "Заполните название и место события." };
  }
  const memberIds = new Set(context.participants.map(({ id }) => id));
  const gapParticipantIds = new Set(context.gap.participantIds);
  const participantIds = [...new Set(draft.participantIds)];
  if (
    participantIds.length === 0 ||
    participantIds.some((id) => !memberIds.has(id) || !gapParticipantIds.has(id))
  ) {
    return { ok: false, message: "Выберите участников этой поездки." };
  }
  const startsAtDate = parseLocalDateTimeInTimeZone(draft.startsAt, context.timezone);
  const endsAtDate = parseLocalDateTimeInTimeZone(draft.endsAt, context.timezone);
  const startsAt = startsAtDate?.getTime() ?? Number.NaN;
  const endsAt = endsAtDate?.getTime() ?? Number.NaN;
  const gapStartsAt = Date.parse(context.gap.startsAt);
  const gapEndsAt = Date.parse(context.gap.endsAt);
  if (![startsAt, endsAt, gapStartsAt, gapEndsAt].every(Number.isFinite) || startsAt >= endsAt) {
    return {
      ok: false,
      message: "Проверьте местное время: оно некорректно или неоднозначно из-за перехода часов.",
      logistics: {
        status: "blocking",
        travelMinutes: null,
        returnBufferMinutes: 0,
        message: "Событие нельзя безопасно разместить в расписании."
      }
    };
  }
  if (startsAt < gapStartsAt || endsAt > gapEndsAt) {
    return {
      ok: false,
      message: "Событие должно полностью помещаться в выбранное окно.",
      logistics: {
        status: "blocking",
        travelMinutes: null,
        returnBufferMinutes: Math.floor((Date.parse(context.gap.nextRequiredAt) - endsAt) / MINUTE_MS),
        message: "Событие выходит за границы свободного окна."
      }
    };
  }

  const selected = new Set(participantIds);
  const overlap = context.busyIntervals.find((interval) =>
    interval.participantIds.some((id) => selected.has(id)) &&
    Date.parse(interval.startsAt) < endsAt &&
    Date.parse(interval.endsAt) > startsAt
  );
  if (overlap) {
    return {
      ok: false,
      message: `У выбранного участника уже есть событие «${overlap.title}».`,
      logistics: {
        status: "blocking",
        travelMinutes: null,
        returnBufferMinutes: 0,
        message: `Пересечение с событием «${overlap.title}».`
      }
    };
  }

  const returnBufferMinutes = Math.floor(
    (Date.parse(context.gap.nextRequiredAt) - endsAt) / MINUTE_MS
  );
  if (returnBufferMinutes < context.gap.bufferToNextEventMinutes) {
    return {
      ok: false,
      message: "Недостаточно времени до следующего обязательного события.",
      logistics: {
        status: "blocking",
        travelMinutes: null,
        returnBufferMinutes,
        message: `Нужен запас минимум ${context.gap.bufferToNextEventMinutes} мин.`
      }
    };
  }
  return {
    ok: true,
    message: "Время и участники проверены.",
    startsAt: startsAtDate!,
    endsAt: endsAtDate!,
    logistics: {
      status: "warning",
      travelMinutes: null,
      returnBufferMinutes,
      message: `До «${context.gap.nextEventTitle}» останется ${returnBufferMinutes} мин. Точное время локального маршрута пока недоступно.`
    }
  };
}

export class ManualEventContextService {
  constructor(private readonly tripService: TripService) {}

  async getContext(tripId: string, gapId: string) {
    const [trip, timeline] = await Promise.all([
      this.tripService.getTrip(tripId),
      this.tripService.getTimeline(tripId)
    ]);
    return trip ? buildManualEventContext(trip, timeline, gapId) : null;
  }
}
