"use server";

import type { ManualEventDraft } from "@/lib/manual-event-repository";
import { createManualEventContextService } from "@/lib/manual-event-context";
import {
  validateManualEventDraft
} from "@/lib/manual-event-service";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export type ManualEventActionResult =
  | { status: "success"; href: string; eventId: string; message: string }
  | { status: "error"; message: string; logistics?: NonNullable<ReturnType<typeof validateManualEventDraft>["logistics"]> };

export type ManualLogisticsActionResult =
  | {
      status: "success";
      message: string;
      logistics: NonNullable<ReturnType<typeof validateManualEventDraft>["logistics"]>;
    }
  | { status: "error"; message: string; logistics?: NonNullable<ReturnType<typeof validateManualEventDraft>["logistics"]> };

async function trustedContext(gapId: string) {
  const tripId = await getCurrentTripId();
  return createManualEventContextService().getContext(tripId, gapId);
}

// MVP intentionally has no authentication. The browser-selected participant ID
// is only a local persona, never an authenticated identity. Every mutation still
// constrains that persona to the current trip/gap, but impersonation protection
// requires a future login/session boundary and cannot be claimed here.

export async function checkManualEventLogisticsAction(
  draft: ManualEventDraft,
  currentParticipantId: string
): Promise<ManualLogisticsActionResult> {
  try {
    const context = await trustedContext(draft.gapId);
    if (!context) return { status: "error", message: "Свободное окно больше не найдено." };
    const validation = validateManualEventDraft(context, draft, currentParticipantId);
    return validation.logistics
      ? {
          status: "success",
          message: validation.message,
          logistics: validation.logistics
        }
      : { status: "error", message: validation.message };
  } catch {
    return { status: "error", message: "Не удалось проверить событие. Попробуйте ещё раз." };
  }
}

export async function createManualEventAction(
  draft: ManualEventDraft,
  currentParticipantId: string,
  idempotencyKey: string
): Promise<ManualEventActionResult> {
  if (draft.publicationMode === "vote") {
    return {
      status: "error",
      message: "Серверное голосование ещё подключается. Пока добавьте событие сразу в план."
    };
  }
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return { status: "error", message: "Некорректный идентификатор операции. Обновите страницу." };
  }

  try {
    const context = await trustedContext(draft.gapId);
    if (!context) return { status: "error", message: "Свободное окно больше не найдено." };
    const validation = validateManualEventDraft(context, draft, currentParticipantId);
    if (!validation.ok || !validation.startsAt || !validation.endsAt) {
      return { status: "error", message: validation.message, logistics: validation.logistics };
    }

    const result = await createPostgresCalendarRepository().saveManualEvent({
      tripId: context.gap.tripId,
      title: draft.title,
      startsAt: validation.startsAt,
      endsAt: validation.endsAt,
      participantIds: [...new Set(draft.participantIds)],
      location: { name: draft.locationName.trim() },
      type: "event",
      status: "active",
      guard: {
        actorParticipantId: currentParticipantId,
        gapParticipantIds: context.gap.participantIds,
        gapStartsAt: new Date(context.gap.startsAt),
        gapEndsAt: new Date(context.gap.endsAt),
        nextRequiredAt: new Date(context.gap.nextRequiredAt),
        minimumReturnBufferMinutes: context.gap.bufferToNextEventMinutes,
        idempotencyKey,
        routeChecked: false
      }
    });

    const href = `/calendar/items/${result.event.id}`;
    return {
      status: "success",
      href,
      eventId: result.event.id,
      message: "Событие добавлено в общий план."
    };
  } catch {
    return {
      status: "error",
      message: "Расписание изменилось или участник уже занят. Перепроверьте событие."
    };
  }
}
