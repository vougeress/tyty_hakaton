import type { ScheduleConflict } from "@/lib/conflict-repository";
import { calculateAudit } from "@/lib/audit/postgres-audit-repository";
import { createTripService } from "@/lib/trips";

function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}

export class PostgresConflictRepository {
  async getConflict(tripId: string, conflictId: string): Promise<ScheduleConflict | null> {
    const service = createTripService();
    const [trip, timeline] = await Promise.all([
      service.getTrip(tripId),
      service.getTimeline(tripId)
    ]);
    if (!trip) return null;

    const conflict = calculateAudit(trip, timeline).conflicts.find(({ id }) => id === conflictId);
    if (!conflict) return null;

    const isOverlap = conflict.kind === "overlap";
    return {
      id: conflict.id,
      context: "calendar",
      presetId: "conflict.schedule_changed",
      logisticsStatus: "blocking",
      checkedAtLabel: "Проверено по текущему расписанию",
      timezone: trip.timezone,
      candidate: {
        id: conflict.previous.id,
        title: conflict.previous.title
      },
      reason: {
        code: isOverlap ? "EVENTS_OVERLAP" : "RETURN_BUFFER_TOO_SMALL",
        summary: isOverlap
          ? `Событие пересекается с «${conflict.next.title}».`
          : `До события «${conflict.next.title}» не хватает времени на дорогу и обязательный буфер.`
      },
      returnAt: conflict.previous.endsAt.toISOString(),
      nextRequiredEventAt: conflict.next.startsAt.toISOString(),
      actualBufferMinutes: Math.max(0, conflict.actualBufferMinutes),
      requiredBufferMinutes: isOverlap ? Math.abs(conflict.actualBufferMinutes) : conflict.requiredBufferMinutes,
      relatedEvents: [
        {
          id: conflict.previous.id,
          kind: "activity",
          timeLabel: `${formatTime(conflict.previous.startsAt, trip.timezone)}–${formatTime(conflict.previous.endsAt, trip.timezone)}`,
          title: conflict.previous.title,
          meta: isOverlap ? "пересечение" : "предыдущее"
        },
        {
          id: conflict.next.id,
          kind: "required-event",
          timeLabel: formatTime(conflict.next.startsAt, trip.timezone),
          title: conflict.next.title,
          meta: isOverlap ? "занято" : `нужно ${conflict.requiredBufferMinutes} мин.`
        }
      ],
      votesNotice: "Конфликт рассчитан по событиям, участникам и локациям из текущего календаря. Черновики не меняют опубликованный план.",
      links: {
        calendar: "/audit",
        poll: `/calendar/items/${conflict.previous.id}`,
        alternatives: "/calendar",
        adjustTime: `/calendar/items/${conflict.next.id}`
      }
    };
  }
}

export function createPostgresConflictRepository() {
  return new PostgresConflictRepository();
}
