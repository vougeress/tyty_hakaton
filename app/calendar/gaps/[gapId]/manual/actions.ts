"use server";

import { revalidatePath } from "next/cache";
import type { ManualEventDraft } from "@/lib/manual-event-repository";
import { createManualEventContextService } from "@/lib/manual-event-context";
import {
  validateManualEventDraft
} from "@/lib/manual-event-service";
import { checkManualEventLogistics } from "@/lib/manual-event-logistics";
import { createPostgresCalendarRepository } from "@/lib/repositories/postgres-calendar-repository";
import { createPollRepository } from "@/lib/polls";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export type ManualEventActionResult =
  | { status: "success"; kind: "event" | "poll"; href: string; resourceId: string; message: string }
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
    const validation = await checkManualEventLogistics(context, draft, currentParticipantId);
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
  if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    return { status: "error", message: "Некорректный идентификатор операции. Обновите страницу." };
  }

  try {
    const context = await trustedContext(draft.gapId);
    if (!context) return { status: "error", message: "Свободное окно больше не найдено." };
    // Saving always bypasses the short-lived route cache so a prior UI check
    // cannot authorize a now-impossible itinerary.
    const validation = await checkManualEventLogistics(
      context,
      draft,
      currentParticipantId,
      { bypassCache: true }
    );
    if (!validation.ok || !validation.startsAt || !validation.endsAt) {
      return { status: "error", message: validation.message, logistics: validation.logistics };
    }

    const participantIds = [...new Set(draft.participantIds)];
    if (draft.publicationMode === "vote") {
      const poll = await createPollRepository().createPoll({
        tripId: context.gap.tripId,
        title: draft.title.trim(),
        closesAt: new Date(Date.now() + 30 * 60_000),
        createdByParticipantId: currentParticipantId,
        candidates: [{
          title: draft.title.trim(),
          description: `${draft.locationName.trim()} · ${formatPollSchedule(validation.startsAt, validation.endsAt, context.timezone)}`,
          travelOptionId: `manual:${idempotencyKey}`,
          source: "manual"
        }],
        idempotencyKey: `manual-vote:${context.gap.tripId}:${idempotencyKey}`
      }, {
        startsAt: validation.startsAt,
        endsAt: validation.endsAt,
        locationName: draft.locationName.trim(),
        participantIds
      });
      revalidatePath("/calendar");
      revalidatePath(`/polls/${poll.id}`);
      return {
        status: "success",
        kind: "poll",
        href: `/polls/${poll.id}`,
        resourceId: poll.id,
        message: "Голосование создано и добавлено в общий план."
      };
    }

    const result = await createPostgresCalendarRepository().saveManualEvent({
      tripId: context.gap.tripId,
      title: draft.title,
      startsAt: validation.startsAt,
      endsAt: validation.endsAt,
      participantIds,
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
        routeChecked: validation.logistics?.status === "valid" || validation.logistics?.status === "warning"
      }
    });

    const href = `/calendar/items/${result.event.id}`;
    revalidatePath("/calendar");
    return {
      status: "success",
      kind: "event",
      href,
      resourceId: result.event.id,
      message: "Событие добавлено в общий план."
    };
  } catch {
    return {
      status: "error",
      message: "Расписание изменилось или участник уже занят. Перепроверьте событие."
    };
  }
}

function formatPollSchedule(startsAt: Date, endsAt: Date, timezone: string) {
  const date = new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    day: "numeric",
    month: "long"
  }).format(startsAt);
  const time = (value: Date) => new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
  return `${date}, ${time(startsAt)}–${time(endsAt)}`;
}
