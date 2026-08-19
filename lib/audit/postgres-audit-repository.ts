import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eventParticipants, events } from "@/db/schema";
import type {
  AuditIssue,
  AuditReport,
  AuditRepositoryResult,
  SuggestedTransfer
} from "@/lib/audit-repository";
import { createTripService } from "@/lib/trips";
import type { CalendarEvent, TripDetails } from "@/lib/trips/contracts";
import { createTravelSearchService, type TravelOption } from "@/lib/travel-search";

const DEFAULT_TRANSFER_MINUTES = 30;
const REQUIRED_BUFFER_MINUTES = 15;
const DRAFT_PREFIX = "audit:transfer:";

type CalculatedTransfer = SuggestedTransfer & {
  startsAt: Date;
  endsAt: Date;
  participantIds: string[];
  locationName: string;
  externalRef: string;
};

type AuditCalculation = {
  report: AuditReport;
  transfers: CalculatedTransfer[];
  conflicts: AuditConflictDetail[];
};

type RouteEstimate = {
  minutes: number;
  startsAt?: Date;
  endsAt?: Date;
  source: NonNullable<SuggestedTransfer["routeSource"]>;
  checkedAt: string;
  warning?: string;
};

type RouteEstimates = ReadonlyMap<string, RouteEstimate>;

export type AuditConflictDetail = {
  id: string;
  kind: "overlap" | "route";
  previous: CalendarEvent;
  next: CalendarEvent;
  actualBufferMinutes: number;
  requiredBufferMinutes: number;
  routeMinutes: number;
  routeSource?: NonNullable<SuggestedTransfer["routeSource"]>;
  routeCheckedAt?: string;
  routeWarning?: string;
};

function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function sameParticipants(left: CalendarEvent, right: CalendarEvent) {
  const rightIds = new Set(right.participantIds);
  return left.participantIds.filter((id) => rightIds.has(id));
}

function distinctLocations(left: CalendarEvent, right: CalendarEvent) {
  const from = left.location?.name.trim().toLocaleLowerCase("ru-RU");
  const to = right.location?.name.trim().toLocaleLowerCase("ru-RU");
  return Boolean(from && to && from !== to);
}

function fallbackRouteEstimate(left: CalendarEvent, right: CalendarEvent): RouteEstimate {
  const from = left.location;
  const to = right.location;
  if (
    from?.lat === undefined || from.lon === undefined ||
    to?.lat === undefined || to.lon === undefined
  ) {
    return {
      minutes: DEFAULT_TRANSFER_MINUTES,
      source: "estimate",
      checkedAt: new Date().toISOString(),
      warning: "Маршрут не найден: использована резервная оценка 30 минут."
    };
  }

  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lon - from.lon);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) *
    Math.sin(longitudeDelta / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return {
    minutes: Math.max(10, Math.ceil((distanceKm / 25) * 60 / 5) * 5),
    source: "coordinates",
    checkedAt: new Date().toISOString(),
    warning: "Маршрут не найден: время оценено по координатам."
  };
}

function routeKey(left: CalendarEvent, right: CalendarEvent) {
  return `${left.id}:${right.id}`;
}

function externalRef(tripId: string, fromEventId: string, toEventId: string) {
  return `${DRAFT_PREFIX}${tripId}:${fromEventId}:${toEventId}`;
}

export function calculateAudit(
  trip: TripDetails,
  timeline: CalendarEvent[],
  routeEstimates: RouteEstimates = new Map()
): AuditCalculation {
  const checkedAt = new Date();
  const existingDraftRefs = new Set(
    timeline
      .filter((event) => event.status === "draft" && event.externalRef?.startsWith(DRAFT_PREFIX))
      .map((event) => event.externalRef!)
  );
  const anchors = timeline
    .filter((event) =>
      event.status !== "cancelled" &&
      event.status !== "draft" &&
      event.type !== "draft" &&
      event.type !== "poll"
    )
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  const conflicts: AuditIssue[] = [];
  const conflictDetails: AuditConflictDetail[] = [];
  const transfers: CalculatedTransfer[] = [];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const previous = anchors[index];
    const next = anchors[index + 1];
    const participantIds = sameParticipants(previous, next);
    if (participantIds.length === 0) continue;

    const gapMinutes = Math.floor((next.startsAt.getTime() - previous.endsAt.getTime()) / 60_000);
    const linkedEvents = [
      { id: previous.id, title: previous.title },
      { id: next.id, title: next.title }
    ];

    if (gapMinutes < 0) {
      const conflictId = `overlap-${previous.id}-${next.id}`;
      conflicts.push({
        id: conflictId,
        tone: "conflict",
        title: `${previous.title} пересекается с «${next.title}»`,
        description: `События пересекаются на ${Math.abs(gapMinutes)} мин.`,
        meta: "Открыть",
        conflictId,
        relatedEvents: linkedEvents
      });
      conflictDetails.push({
        id: conflictId,
        kind: "overlap",
        previous,
        next,
        actualBufferMinutes: gapMinutes,
        requiredBufferMinutes: 0,
        routeMinutes: 0
      });
      continue;
    }

    if (previous.type === "transfer" || next.type === "transfer" || !distinctLocations(previous, next)) {
      continue;
    }

    const estimate = routeEstimates.get(routeKey(previous, next)) ?? fallbackRouteEstimate(previous, next);
    const routeMinutes = estimate.minutes;
    const requiredMinutes = routeMinutes + REQUIRED_BUFFER_MINUTES;
    if (gapMinutes < requiredMinutes) {
      const conflictId = `route-${previous.id}-${next.id}`;
      conflicts.push({
        id: conflictId,
        tone: "conflict",
        title: `Не успеть: ${previous.title} → ${next.title}`,
        description: `Доступно ${gapMinutes} мин., нужно минимум ${requiredMinutes} мин. с буфером ${REQUIRED_BUFFER_MINUTES} мин.`,
        meta: "Открыть",
        conflictId,
        relatedEvents: linkedEvents
      });
      conflictDetails.push({
        id: conflictId,
        kind: "route",
        previous,
        next,
        actualBufferMinutes: gapMinutes,
        requiredBufferMinutes: requiredMinutes,
        routeMinutes,
        routeSource: estimate.source,
        routeCheckedAt: estimate.checkedAt,
        routeWarning: estimate.warning
      });
      continue;
    }

    const endsAt = estimate.endsAt ?? new Date(next.startsAt.getTime() - REQUIRED_BUFFER_MINUTES * 60_000);
    const startsAt = estimate.startsAt ?? new Date(endsAt.getTime() - routeMinutes * 60_000);
    const id = `${previous.id}:${next.id}`;
    transfers.push({
      id,
      title: `${previous.location!.name} → ${next.location!.name}`,
      description: `${estimate.source === "tutu" ? "Маршрут Туту" : estimate.source === "demo_catalog" ? "Резервный каталог" : "Оценка маршрута"}: ${routeMinutes} мин. Буфер ${REQUIRED_BUFFER_MINUTES} мин.${estimate.warning ? ` ${estimate.warning}` : ""}`,
      meta: formatTime(startsAt, trip.timezone),
      fromEventId: previous.id,
      toEventId: next.id,
      routeSource: estimate.source,
      routeCheckedAt: estimate.checkedAt,
      routeWarning: estimate.warning,
      startsAt,
      endsAt,
      participantIds,
      locationName: next.location!.name,
      externalRef: externalRef(trip.id, previous.id, next.id)
    });
  }

  const bookingCount = anchors.filter((event) => event.type === "booking").length;
  const suggestedTransfers = transfers.filter((transfer) => !existingDraftRefs.has(transfer.externalRef));
  const draftedTransferIds = transfers
    .filter((transfer) => existingDraftRefs.has(transfer.externalRef))
    .map((transfer) => transfer.id);
  const issues: AuditIssue[] = [
    ...(bookingCount > 0 ? [{
      id: "bookings-checked",
      tone: "ready" as const,
      title: `Билеты проверены · ${bookingCount}`,
      description: "Бронирования учтены в текущем расписании",
      meta: "Готово"
    }] : []),
    ...suggestedTransfers.map((transfer) => ({ ...transfer, tone: "suggestion" as const })),
    ...conflicts
  ];

  return {
    transfers,
    conflicts: conflictDetails,
    report: {
      presetId: "audit.issues_found",
      checkedAt: new Intl.DateTimeFormat("ru-RU", {
        timeZone: trip.timezone,
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(checkedAt),
      checkedEventCount: anchors.length,
      checkedBookingCount: bookingCount,
      issueCount: conflicts.length + suggestedTransfers.length,
      conflictCount: conflicts.length,
      suggestedTransfers,
      draftedTransferIds,
      issues
    }
  };
}

async function findRouteEstimates(trip: TripDetails, timeline: CalendarEvent[], bypassCache = false) {
  const anchors = timeline
    .filter((event) => event.status !== "cancelled" && event.status !== "draft" && event.type !== "draft" && event.type !== "poll")
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const service = createTravelSearchService();
  const entries = await Promise.all(anchors.slice(0, -1).map(async (previous, index) => {
    const next = anchors[index + 1];
    const participantIds = sameParticipants(previous, next);
    const gapMinutes = Math.floor((next.startsAt.getTime() - previous.endsAt.getTime()) / 60_000);
    if (
      participantIds.length === 0 || gapMinutes <= 0 || previous.type === "transfer" ||
      next.type === "transfer" || !distinctLocations(previous, next)
    ) return undefined;

    try {
      const deadline = new Date(next.startsAt.getTime() - REQUIRED_BUFFER_MINUTES * 60_000);
      if (deadline <= previous.endsAt) return undefined;
      const result = await service.search({
        tripId: trip.id,
        origin: previous.location!.name,
        destination: next.location!.name,
        timezone: trip.timezone,
        startsAt: previous.endsAt,
        endsAt: deadline,
        travelers: participantIds.length,
        types: ["train", "bus", "suburban_train"],
        mode: "auto"
      }, { bypassCache });
      const option = bestAuditOption(result.options, previous.endsAt, deadline, participantIds.length);
      if (!option) return [routeKey(previous, next), fallbackRouteEstimate(previous, next)] as const;
      const source = option.source === "tutu" ? "tutu" : "demo_catalog";
      return [routeKey(previous, next), {
        minutes: Math.ceil((Date.parse(option.arrivalAt) - Date.parse(option.departureAt)) / 60_000),
        startsAt: new Date(option.departureAt),
        endsAt: new Date(option.arrivalAt),
        source,
        checkedAt: result.checkedAt,
        warning: [...result.warnings, ...(source === "demo_catalog" ? ["Использован резервный каталог вместо live MCP."] : [])].filter(Boolean).join(" ") || undefined
      } satisfies RouteEstimate] as const;
    } catch {
      return [routeKey(previous, next), fallbackRouteEstimate(previous, next)] as const;
    }
  }));
  return new Map(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)));
}

export async function calculateAuditWithRoutes(
  trip: TripDetails,
  timeline: CalendarEvent[],
  options: { bypassCache?: boolean } = {}
) {
  const routeEstimates = await findRouteEstimates(trip, timeline, options.bypassCache);
  return calculateAudit(trip, timeline, routeEstimates);
}

function bestAuditOption(options: TravelOption[], earliest: Date, deadline: Date, travelers: number) {
  return options
    .filter((option) =>
      Date.parse(option.departureAt) >= earliest.getTime() &&
      Date.parse(option.arrivalAt) <= deadline.getTime() &&
      Date.parse(option.arrivalAt) >= Date.parse(option.departureAt) &&
      (option.availableSeats === undefined || option.availableSeats >= travelers)
    )
    .sort((left, right) =>
      (Date.parse(left.arrivalAt) - Date.parse(left.departureAt)) -
      (Date.parse(right.arrivalAt) - Date.parse(right.departureAt))
    )[0];
}

function timelineFingerprint(timeline: CalendarEvent[]) {
  return timeline.map((event) => [event.id, event.status, event.startsAt.toISOString(), event.endsAt.toISOString(), event.location?.name ?? ""].join("|")).sort().join(";");
}

export class PostgresAuditRepository {
  async getLatestReport(tripId: string): Promise<AuditRepositoryResult> {
    const service = createTripService();
    const [trip, timeline] = await Promise.all([
      service.getTrip(tripId),
      service.getTimeline(tripId)
    ]);
    if (!trip) return { status: "empty" };

    const { report } = await calculateAuditWithRoutes(trip, timeline);
    if (report.issueCount === 0 && (report.draftedTransferIds?.length ?? 0) === 0) {
      return { status: "empty", checkedAt: report.checkedAt };
    }
    return { status: "ready", report };
  }

  async saveDraftTransfers(tripId: string, transferIds: string[]) {
    const requested = new Set(transferIds);
    // MCP/network work happens before the transaction. Inside the lock we only
    // accept these results if the schedule is still exactly the one we checked.
    const service = createTripService();
    const [preflightTrip, preflightTimeline] = await Promise.all([
      service.getTrip(tripId),
      service.getTimeline(tripId)
    ]);
    if (!preflightTrip) throw new Error("Trip not found");
    const routeEstimates = await findRouteEstimates(preflightTrip, preflightTimeline, true);
    const preflightFingerprint = timelineFingerprint(preflightTimeline);
    return getDatabase().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${tripId}))`);
      // Rebuild the audit after taking the trip lock so a stale UI cannot save a
      // transfer whose neighbouring events or buffer have changed.
      const [trip, timeline] = await Promise.all([
        service.getTrip(tripId),
        service.getTimeline(tripId)
      ]);
      if (!trip) throw new Error("Trip not found");
      if (timelineFingerprint(timeline) !== preflightFingerprint) {
        throw new Error("Расписание изменилось во время проверки. Запустите аудит ещё раз.");
      }
      const selected = calculateAudit(trip, timeline, routeEstimates).transfers.filter((transfer) => requested.has(transfer.id));
      if (selected.length === 0) return 0;

      const refs = selected.map((transfer) => transfer.externalRef);
      const existing = await tx
        .select({ externalRef: events.externalRef })
        .from(events)
        .where(and(eq(events.tripId, tripId), inArray(events.externalRef, refs)));
      const existingRefs = new Set(existing.map(({ externalRef: ref }) => ref));
      const fresh = selected.filter((transfer) => !existingRefs.has(transfer.externalRef));
      if (fresh.length === 0) return 0;

      const inserted = await tx.insert(events).values(fresh.map((transfer) => ({
        tripId,
        type: "transfer" as const,
        status: "draft" as const,
        title: transfer.title,
        startsAt: transfer.startsAt,
        endsAt: transfer.endsAt,
        locationName: transfer.locationName,
        source: "manual" as const,
        externalRef: transfer.externalRef
      }))).returning({ id: events.id, externalRef: events.externalRef });
      const insertedByRef = new Map(inserted.map((event) => [event.externalRef, event.id]));
      await tx.insert(eventParticipants).values(fresh.flatMap((transfer) => {
        const eventId = insertedByRef.get(transfer.externalRef)!;
        return transfer.participantIds.map((participantId) => ({ eventId, participantId }));
      }));
      return fresh.length;
    });
  }
}

export function createPostgresAuditRepository() {
  return new PostgresAuditRepository();
}
