import { calculateFeasibility, type FeasibilityInputs } from "../feasibility";
import type { TravelOption } from "../travel-search/contracts";
import type { IdeaCandidate } from "./contracts";

export type IdeasFeasibilityContext = {
  gapId: string;
  startsAt: string;
  endsAt: string;
  nextRequiredAt?: string;
  participantIds: string[];
  budgetPerPerson: number;
  minimumReturnBufferMinutes: number;
  minimumUsefulMinutes: number;
};

const STATUS_ORDER: Record<IdeaCandidate["check"]["status"], number> = {
  valid: 0,
  warning: 1,
  stale: 2,
  unknown: 3,
  checking: 4,
  blocking: 5
};

function minutesBetween(startsAt: string, endsAt: string) {
  return Math.max(0, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000));
}

function titleFor(option: TravelOption) {
  const transport = option.type === "bus"
    ? "на автобусе"
    : option.type === "suburban_train"
      ? "на электричке"
      : option.type === "train"
        ? "на поезде"
        : "с проживанием";
  return `${option.destination} ${transport}`;
}

function recommendation(check: ReturnType<typeof calculateFeasibility>) {
  if (check.status === "valid") return "Проходит проверку времени, бюджета, мест и возврата";
  if (check.status === "warning") return "Можно выбрать, но перед голосованием проверьте предупреждения";
  return "Вариант нельзя отправить на голосование, пока блокирующие условия не исправлены";
}

export function travelOptionToIdeaCandidate(option: TravelOption, context: IdeasFeasibilityContext): IdeaCandidate {
  const activityStartsAt = option.arrivalAt;
  const activityEndsAt = option.returnDepartureAt ?? option.arrivalAt;
  const returnAt = option.returnArrivalAt ?? activityEndsAt;
  const feasibilityInputs: FeasibilityInputs = {
    candidate: {
      id: option.id,
      startsAt: activityStartsAt,
      endsAt: activityEndsAt,
      pricePerPerson: option.pricePerPerson,
      capacity: option.availableSeats ?? "unknown",
      outboundRoute: { startsAt: option.departureAt, endsAt: option.arrivalAt },
      ...(option.returnDepartureAt && option.returnArrivalAt
        ? { returnRoute: { startsAt: option.returnDepartureAt, endsAt: option.returnArrivalAt } }
        : {})
    },
    window: {
      startsAt: context.startsAt,
      endsAt: context.endsAt,
      ...(context.nextRequiredAt ? { nextRequiredAt: context.nextRequiredAt } : {})
    },
    participantConstraints: context.participantIds.map((participantId) => ({
      participantId,
      maxBudgetPerPerson: context.budgetPerPerson,
      returnBufferMinutes: context.minimumReturnBufferMinutes,
      allowOvernight: false
    })),
    policy: {
      minimumReturnBufferMinutes: context.minimumReturnBufferMinutes,
      minimumUsefulMinutes: context.minimumUsefulMinutes,
      warningTravelToUsefulRatio: 1
    }
  };
  const check = calculateFeasibility(feasibilityInputs, { checkedAt: option.checkedAt });

  return {
    id: option.id,
    gapId: context.gapId,
    title: titleFor(option),
    source: option.source,
    startsAt: activityStartsAt,
    endsAt: activityEndsAt,
    travelMode: option.type === "bus" ? "bus" : option.type === "train" || option.type === "suburban_train" ? "train" : "mixed",
    travelMinutes: minutesBetween(option.departureAt, option.arrivalAt) + (option.returnDepartureAt && option.returnArrivalAt ? minutesBetween(option.returnDepartureAt, option.returnArrivalAt) : 0),
    usefulMinutes: minutesBetween(activityStartsAt, activityEndsAt),
    pricePerPerson: option.pricePerPerson,
    capacity: option.availableSeats ?? "unknown",
    returnBufferMinutes: context.nextRequiredAt ? minutesBetween(returnAt, context.nextRequiredAt) : minutesBetween(returnAt, context.endsAt),
    deeplink: option.bookingUrl,
    recommendationReason: recommendation(check),
    check: {
      status: check.status,
      reasons: check.reasons.map(({ code, message }) => ({ code, message })),
      checkedAt: check.checkedAt,
      inputsHash: check.inputsHash
    }
  };
}

export function adaptTravelOptions(options: TravelOption[], context: IdeasFeasibilityContext, limit = 5) {
  return options
    .map((option) => travelOptionToIdeaCandidate(option, context))
    .sort((left, right) =>
      STATUS_ORDER[left.check.status] - STATUS_ORDER[right.check.status]
      || (left.pricePerPerson ?? Number.MAX_SAFE_INTEGER) - (right.pricePerPerson ?? Number.MAX_SAFE_INTEGER)
      || left.travelMinutes - right.travelMinutes
    )
    .slice(0, limit);
}
