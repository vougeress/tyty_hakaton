import "server-only";

import type { ManualEventContext, ManualEventDraft, ManualRouteLeg } from "./manual-event-repository";
import {
  parseLocalDateTimeInTimeZone,
  validateManualEventDraft,
  type ManualEventValidation
} from "./manual-event-service";
import { createTravelSearchService, type TravelOption } from "./travel-search";

const MINUTE_MS = 60_000;

export async function checkManualEventLogistics(
  context: ManualEventContext,
  draft: ManualEventDraft,
  currentParticipantId: string,
  options: { bypassCache?: boolean } = {}
): Promise<ManualEventValidation> {
  const base = validateManualEventDraft(context, draft, currentParticipantId);
  if (!base.ok || !base.startsAt || !base.endsAt) return base;

  const startsAt = parseLocalDateTimeInTimeZone(draft.startsAt, context.timezone)!;
  const endsAt = parseLocalDateTimeInTimeZone(draft.endsAt, context.timezone)!;
  const previousEndsAt = new Date(context.gap.previousEndsAt);
  const nextRequiredAt = new Date(context.gap.nextRequiredAt);
  const returnDeadline = new Date(
    nextRequiredAt.getTime() - context.gap.bufferToNextEventMinutes * MINUTE_MS
  );

  if (startsAt <= previousEndsAt || returnDeadline <= endsAt) {
    return blocking(base, "На дорогу между соседними событиями и обязательный запас времени места не остаётся.");
  }

  try {
    const service = createTravelSearchService();
    const input = {
      tripId: context.gap.tripId,
      gapId: context.gap.id,
      timezone: context.timezone,
      travelers: draft.participantIds.length,
      types: ["train", "bus", "suburban_train"] as const,
      mode: "auto" as const
    };
    const [outboundResult, inboundResult] = await Promise.all([
      service.search({
        ...input,
        origin: context.gap.previousLocationName,
        destination: draft.locationName.trim(),
        startsAt: previousEndsAt,
        endsAt: startsAt
      }, options),
      service.search({
        ...input,
        origin: draft.locationName.trim(),
        destination: context.gap.nextLocationName,
        startsAt: endsAt,
        endsAt: returnDeadline
      }, options)
    ]);

    const outboundOption = bestFittingOption(outboundResult.options, previousEndsAt, startsAt, draft.participantIds.length);
    const inboundOption = bestFittingOption(inboundResult.options, endsAt, returnDeadline, draft.participantIds.length);
    if (!outboundOption || !inboundOption) {
      const message = !outboundOption && !inboundOption
        ? "Не найдены маршруты от предыдущего события и до следующего события, которые помещаются в доступное время."
        : !outboundOption
          ? "Не найден путь от предыдущего события, который помещается в доступное время."
          : "Не найден путь до следующего события, который помещается в доступное время.";
      return blocking(base, message);
    }

    const outbound = toLeg(outboundOption, outboundResult.mode);
    const inbound = toLeg(inboundOption, inboundResult.mode);
    const returnBufferMinutes = Math.floor((nextRequiredAt.getTime() - Date.parse(inbound.arrivalAt)) / MINUTE_MS);
    const warnings = [...new Set([...outboundResult.warnings, ...inboundResult.warnings])];
    const fallback = outbound.mode === "mock" || inbound.mode === "mock";
    return {
      ...base,
      message: fallback ? "Маршруты проверены по резервному каталогу." : "Маршруты проверены по актуальным данным.",
      logistics: {
        status: fallback ? "warning" : "valid",
        travelMinutes: outbound.minutes + inbound.minutes,
        returnBufferMinutes,
        checkedAt: new Date().toISOString(),
        outbound,
        inbound,
        warnings,
        message: `${context.gap.previousEventTitle} → событие: ${outbound.minutes} мин; событие → ${context.gap.nextEventTitle}: ${inbound.minutes} мин. После возвращения останется ${returnBufferMinutes} мин (минимум ${context.gap.bufferToNextEventMinutes}).`
      }
    };
  } catch {
    return blocking(base, "Не удалось подтвердить оба маршрута. Сохранение заблокировано до повторной проверки.");
  }
}

function bestFittingOption(options: TravelOption[], earliest: Date, deadline: Date, travelers: number) {
  return options
    .filter((option) =>
      Date.parse(option.departureAt) >= earliest.getTime() &&
      Date.parse(option.arrivalAt) <= deadline.getTime() &&
      Date.parse(option.arrivalAt) >= Date.parse(option.departureAt) &&
      (option.availableSeats === undefined || option.availableSeats >= travelers)
    )
    .sort((left, right) =>
      duration(left) - duration(right) || Date.parse(right.departureAt) - Date.parse(left.departureAt)
    )[0];
}

function duration(option: TravelOption) {
  return Math.ceil((Date.parse(option.arrivalAt) - Date.parse(option.departureAt)) / MINUTE_MS);
}

function toLeg(option: TravelOption, mode: "live" | "mock"): ManualRouteLeg {
  return {
    from: option.origin,
    to: option.destination,
    departureAt: option.departureAt,
    arrivalAt: option.arrivalAt,
    minutes: duration(option),
    mode
  };
}

function blocking(base: ManualEventValidation, message: string): ManualEventValidation {
  return {
    ...base,
    ok: false,
    message,
    logistics: {
      status: "blocking",
      travelMinutes: null,
      returnBufferMinutes: base.logistics?.returnBufferMinutes ?? 0,
      checkedAt: new Date().toISOString(),
      message
    }
  };
}
