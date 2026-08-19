"use server";

import { createHash } from "node:crypto";
import { ZodError } from "zod";

import { createTravelSearchService } from "@/lib/travel-search";
import {
  adaptTravelOptions,
  ideaCandidateToPollCandidate,
  isFreshSelectableCandidate,
  mergeRoundTripOptions,
  travelOptionToIdeaCandidate,
  validateCustomIdeaInput,
  type IdeaCandidate,
  type IdeasSearchState
} from "@/lib/ideas";
import { loadIdeasContext } from "@/lib/ideas/server-context";
import {
  getCachedAttractionCandidates,
  searchAttractionCandidates
} from "@/lib/ideas/attraction-suggestions";
import { createPollRepository } from "@/lib/polls";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function searchIdeasAction(
  previousState: IdeasSearchState,
  formData: FormData
): Promise<IdeasSearchState> {
  const gapId = text(formData, "gapId");
  const destination = text(formData, "destination");
  const searchKind = text(formData, "searchKind") || "travel";
  if (!gapId || (searchKind !== "attractions" && !destination)) {
    return { ...previousState, status: "error", message: "Укажите направление", candidates: [] };
  }

  try {
    const context = await loadIdeasContext(gapId);
    if (!context) {
      return { ...previousState, status: "error", message: "Свободное окно больше недоступно", candidates: [] };
    }
    if (searchKind === "attractions") {
      const result = await searchAttractionCandidates(context);
      return {
        status: "success",
        message: result.candidates.length > 0 ? "Места рядом подобраны" : "Подходящих мест рядом не найдено",
        destination: "Рядом с текущей точкой",
        candidates: result.candidates,
        checkedAt: result.checkedAt,
        mode: "live",
        provider: "gigachat",
        cache: "miss",
        warnings: []
      };
    }
    const result = await searchCandidates(context, destination, false);

    return {
      status: "success",
      message: result.candidates.length > 0 ? "Варианты проверены" : "По этому направлению вариантов не найдено",
      destination,
      candidates: result.candidates,
      checkedAt: result.checkedAt,
      mode: result.mode,
      provider: result.mode === "live" ? "tutu" : "demo_catalog",
      cache: result.cache,
      warnings: result.warnings
    };
  } catch (error) {
    const automatic = searchKind === "attractions";
    console.error(
      automatic ? "[ideas:gigachat] automatic suggestion failed" : "[ideas:tutu] search failed",
      error instanceof Error ? error.message : "Unknown error"
    );
    return {
      status: "error",
      message: automatic
        ? "Не удалось подобрать места рядом. Повторите попытку через несколько секунд."
        : error instanceof ZodError ? "Проверьте направление" : "Сервис вариантов временно недоступен",
      destination,
      candidates: [],
      provider: automatic ? "gigachat" : undefined,
      warnings: [automatic ? "Текущая позиция и свободное окно сохранены — можно повторить подбор позже" : "Проверьте подключение и повторите поиск"]
    };
  }
}

async function searchCandidates(
  context: NonNullable<Awaited<ReturnType<typeof loadIdeasContext>>>,
  destination: string,
  bypassCache: boolean
) {
  const service = createTravelSearchService();
  const result = await service.search({
      tripId: context.search.tripId,
      gapId: context.search.gapId,
      origin: context.search.origin,
      destination,
      timezone: context.search.timezone,
      startsAt: context.search.startsAt,
      endsAt: context.search.endsAt,
      travelers: context.search.participantIds.length,
      types: ["train", "bus", "suburban_train"],
      mode: "auto"
    }, { bypassCache });
  let options = result.options;
  const needsReturn = options.some((option) => !option.returnDepartureAt || !option.returnArrivalAt);
  const warnings = [...result.warnings];

  if (needsReturn && result.mode === "live") {
    const midpoint = new Date((Date.parse(context.search.startsAt) + Date.parse(context.search.endsAt)) / 2);
    const returnEnd = new Date(context.search.nextRequiredAt ?? context.search.endsAt);
    const reverse = await service.search({
      tripId: context.search.tripId,
      gapId: context.search.gapId,
      origin: destination,
      destination: context.search.origin,
      timezone: context.search.timezone,
      startsAt: midpoint,
      endsAt: returnEnd,
      travelers: context.search.participantIds.length,
      types: ["train", "bus", "suburban_train"],
      mode: "live"
    }, { bypassCache });
    options = mergeRoundTripOptions(options, reverse.options, {
      origin: context.search.origin,
      destination
    });
    warnings.push(...reverse.warnings);
    if (options.some((option) => !option.returnDepartureAt || !option.returnArrivalAt)) {
      warnings.push("Для части вариантов не найден подтверждённый обратный маршрут");
    }
  }

  return { ...result, options, warnings: [...new Set(warnings)], candidates: adaptTravelOptions(options, context.search) };
}

export type CustomIdeaActionResult =
  | { status: "success"; candidate: IdeaCandidate }
  | { status: "error"; message: string };

export async function checkCustomIdeaAction(formData: FormData): Promise<CustomIdeaActionResult> {
  const gapId = text(formData, "gapId");
  const title = text(formData, "title");
  const url = text(formData, "url");
  try {
    const validated = validateCustomIdeaInput(title, url);
    const context = await loadIdeasContext(gapId);
    if (!context) throw new Error("Gap not found");
    const checkedAt = new Date().toISOString();
    const candidate = travelOptionToIdeaCandidate({
      id: `user-${createHash("sha1").update(validated.url).digest("hex").slice(0, 16)}`,
      type: "bus",
      origin: context.search.origin,
      destination: validated.title,
      departureAt: context.search.startsAt,
      arrivalAt: context.search.startsAt,
      pricePerPerson: 0,
      bookingUrl: validated.url,
      source: "user_link",
      checkedAt
    }, context.search);
    return {
      status: "success",
      candidate: {
        ...candidate,
        title: validated.title,
        recommendationReason: "Ссылка проверена, но для выбора нужны подтверждённые время и обратный маршрут"
      }
    };
  } catch {
    return {
      status: "error",
      message: "Укажите корректную HTTPS-ссылку и название"
    };
  }
}

export type CreateIdeasPollResult = { status: "success"; pollId: string } | { status: "error"; message: string };

export async function createIdeasPollAction(formData: FormData): Promise<CreateIdeasPollResult> {
  const gapId = text(formData, "gapId");
  const destination = text(formData, "destination");
  const provider = text(formData, "provider");
  const participantId = text(formData, "participantId");
  const selectedIds = [...new Set(formData.getAll("candidateId").map(String))];
  try {
    const context = await loadIdeasContext(gapId);
    if (!context || selectedIds.length === 0) throw new Error("Invalid selection");
    if (!context.search.participantIds.includes(participantId)) {
      return { status: "error", message: "Текущий участник не входит в это свободное окно." };
    }
    const now = Date.now();
    const fresh = provider === "gigachat"
      ? { candidates: getCachedAttractionCandidates(gapId, now), options: [] }
      : await searchCandidates(context, destination, true);
    const acceptable = fresh.candidates.filter((candidate) => {
      if (!selectedIds.includes(candidate.id)) return false;
      return isFreshSelectableCandidate(candidate, now);
    });
    if (acceptable.length !== selectedIds.length) {
      return { status: "error", message: "Часть вариантов изменилась. Обновите поиск и выберите снова." };
    }
    const poll = await createPollRepository().createPoll({
      tripId: context.search.tripId,
      title: `Чем заполнить окно: ${destination}`,
      closesAt: new Date(now + 30 * 60_000),
      createdByParticipantId: participantId,
      candidates: acceptable.map((candidate) => ideaCandidateToPollCandidate(
        candidate,
        fresh.options.find((option) => option.id === candidate.id)
      )),
      idempotencyKey: `ideas-${gapId}-${selectedIds.sort().join("-")}`.slice(0, 120)
    }, {
      startsAt: new Date(context.search.startsAt),
      endsAt: new Date(context.search.endsAt),
      locationName: provider === "gigachat" ? context.automatic.currentLocation.name : destination,
      participantIds: context.search.participantIds
    });
    return { status: "success", pollId: poll.id };
  } catch {
    return { status: "error", message: "Не удалось создать голосование. Проверьте участника и повторите попытку." };
  }
}
