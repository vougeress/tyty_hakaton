import "server-only";

import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";
import { createTripService } from "@/lib/trips";
import type { IdeasFeasibilityContext } from "@/lib/ideas/travel-option-adapter";
import type { IdeasPreset } from "@/lib/ideas/contracts";

export type LoadedIdeasContext = {
  preset: IdeasPreset;
  search: IdeasFeasibilityContext & {
    tripId: string;
    origin: string;
    timezone: string;
  };
  automatic: {
    city: string;
    currentLocation: {
      name: string;
      latitude?: number;
      longitude?: number;
    };
    maxTravelMinutesOneWay: number;
  };
};

function dateLabel(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: timezone
  }).format(new Date(iso));
}

function timeLabel(startsAt: string, endsAt: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}

export async function loadIdeasContext(gapId: string): Promise<LoadedIdeasContext | null> {
  const tripId = await getCurrentTripId();
  const [calendar, timeline] = await Promise.all([
    createPostgresCalendarRepository().getWeek(tripId),
    createTripService().getTimeline(tripId)
  ]);
  if (!calendar) return null;
  const gap = calendar.gaps.find((item) => item.id === gapId);
  if (!gap) return null;
  const nextRequired = gap.nextRequiredItemId
    ? calendar.items.find((item) => item.id === gap.nextRequiredItemId)
    : undefined;
  const budgetPerPerson = 2_500;
  const gapStart = Date.parse(gap.startsAt);
  const previousEvent = timeline
    .filter((event) =>
      event.endsAt.getTime() <= gapStart &&
      event.status !== "cancelled" &&
      event.type !== "poll" &&
      event.type !== "draft"
    )
    .sort((left, right) => right.endsAt.getTime() - left.endsAt.getTime())[0];
  const availableMinutes = Math.max(0, Math.round((Date.parse(gap.endsAt) - gapStart) / 60_000));
  const maxTravelMinutesOneWay = Math.max(
    10,
    Math.min(90, Math.floor((availableMinutes - 45 - 60) / 2))
  );

  return {
    preset: {
      id: "ideas.two_selected",
      tripId: calendar.trip.id,
      gapId: gap.id,
      dateLabel: dateLabel(gap.startsAt, calendar.trip.timezone),
      timeLabel: timeLabel(gap.startsAt, gap.endsAt, calendar.trip.timezone),
      timezone: calendar.trip.timezone,
      budgetPerPerson,
      filters: ["Все", "Автобус", "Поезд"],
      selectedCandidateIds: [],
      candidates: []
    },
    search: {
      tripId: calendar.trip.id,
      gapId: gap.id,
      origin: calendar.trip.title,
      timezone: calendar.trip.timezone,
      startsAt: gap.startsAt,
      endsAt: gap.endsAt,
      ...(nextRequired ? { nextRequiredAt: nextRequired.startsAt } : {}),
      participantIds: gap.participantIds,
      budgetPerPerson,
      minimumReturnBufferMinutes: 45,
      minimumUsefulMinutes: 60
    },
    automatic: {
      city: calendar.trip.title,
      currentLocation: {
        name: previousEvent?.location?.name ?? calendar.trip.title,
        ...(previousEvent?.location?.lat === undefined ? {} : { latitude: previousEvent.location.lat }),
        ...(previousEvent?.location?.lon === undefined ? {} : { longitude: previousEvent.location.lon })
      },
      maxTravelMinutesOneWay
    }
  };
}
