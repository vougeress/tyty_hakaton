import { calculateReturnBuffer, minutesBetween } from "./calculate-buffer";
import { createFeasibilityInputsHash } from "./inputs-hash";
import { feasibilityReason } from "./reasons";
import {
  FEASIBILITY_REASON_CODES as CODE,
  type CalculateFeasibilityOptions,
  type FeasibilityCheck,
  type FeasibilityInputs,
  type FeasibilityReason,
  type RouteLeg,
} from "./types";

function isFiniteNonNegative(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

function isValidTime(value: string | undefined): value is string {
  return (
    value !== undefined &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function routeDuration(route: RouteLeg | undefined): number | undefined {
  if (!route || !isValidTime(route.startsAt) || !isValidTime(route.endsAt)) {
    return undefined;
  }
  return minutesBetween(route.startsAt, route.endsAt);
}

function itineraryCrossesLocalDate(inputs: FeasibilityInputs): boolean {
  const startsAt = inputs.candidate.outboundRoute?.startsAt ?? inputs.candidate.startsAt;
  const endsAt = inputs.candidate.returnRoute?.endsAt ?? inputs.candidate.endsAt;

  return startsAt.slice(0, 10) !== endsAt.slice(0, 10);
}

function invalidInputs(inputs: FeasibilityInputs, checkedAt: string): boolean {
  const { candidate, window, participantConstraints, policy } = inputs;
  const dates = [
    checkedAt,
    candidate.startsAt,
    candidate.endsAt,
    window.startsAt,
    window.endsAt,
    window.nextRequiredAt,
    candidate.outboundRoute?.startsAt,
    candidate.outboundRoute?.endsAt,
    candidate.returnRoute?.startsAt,
    candidate.returnRoute?.endsAt,
  ].filter((value): value is string => value !== undefined);

  return (
    dates.some((value) => !isValidTime(value)) ||
    !isFiniteNonNegative(candidate.pricePerPerson) ||
    !isFiniteNonNegative(candidate.groupPrice) ||
    (candidate.capacity !== "unknown" && !isFiniteNonNegative(candidate.capacity)) ||
    !isFiniteNonNegative(policy.minimumReturnBufferMinutes) ||
    !isFiniteNonNegative(policy.minimumUsefulMinutes) ||
    (policy.warningTravelToUsefulRatio !== undefined &&
      (!Number.isFinite(policy.warningTravelToUsefulRatio) ||
        policy.warningTravelToUsefulRatio <= 0)) ||
    participantConstraints.some(
      (constraint) =>
        !constraint.participantId ||
        !isFiniteNonNegative(constraint.maxBudgetPerPerson) ||
        !isFiniteNonNegative(constraint.maxTravelMinutes) ||
        !isFiniteNonNegative(constraint.returnBufferMinutes),
    )
  );
}

function staleCheck(
  inputsHash: string,
  previousCheck: FeasibilityCheck,
  checkedAt: string,
  maxCheckAgeMinutes?: number,
): FeasibilityCheck | undefined {
  if (previousCheck.inputsHash && previousCheck.inputsHash !== inputsHash) {
    return {
      ...previousCheck,
      status: "stale",
      inputsHash,
      reasons: [feasibilityReason(CODE.INPUTS_CHANGED, "warning")],
    };
  }

  if (
    maxCheckAgeMinutes !== undefined &&
    previousCheck.checkedAt &&
    minutesBetween(previousCheck.checkedAt, checkedAt) > maxCheckAgeMinutes
  ) {
    return {
      ...previousCheck,
      status: "stale",
      inputsHash,
      reasons: [feasibilityReason(CODE.CHECK_EXPIRED, "warning")],
    };
  }

  return undefined;
}

function pricePerPerson(inputs: FeasibilityInputs): number | undefined {
  if (inputs.candidate.pricePerPerson !== undefined) {
    return inputs.candidate.pricePerPerson;
  }

  if (inputs.candidate.groupPrice !== undefined && inputs.participantConstraints.length > 0) {
    return inputs.candidate.groupPrice / inputs.participantConstraints.length;
  }

  return undefined;
}

function evaluate(inputs: FeasibilityInputs): FeasibilityReason[] {
  const { candidate, window, participantConstraints, policy } = inputs;
  const reasons: FeasibilityReason[] = [];
  const activityStartsAt = Date.parse(candidate.startsAt);
  const activityEndsAt = Date.parse(candidate.endsAt);
  const windowStartsAt = Date.parse(window.startsAt);
  const windowEndsAt = Date.parse(window.endsAt);
  const usefulMinutes = minutesBetween(candidate.startsAt, candidate.endsAt);

  if (
    activityStartsAt < windowStartsAt ||
    activityEndsAt > windowEndsAt ||
    activityEndsAt <= activityStartsAt
  ) {
    reasons.push(feasibilityReason(CODE.ACTIVITY_OUTSIDE_WINDOW, "blocking"));
  }

  const outboundMinutes = routeDuration(candidate.outboundRoute);
  if (!candidate.outboundRoute) {
    reasons.push(feasibilityReason(CODE.OUTBOUND_ROUTE_MISSING, "blocking"));
  } else if (
    outboundMinutes === undefined ||
    outboundMinutes < 0 ||
    Date.parse(candidate.outboundRoute.startsAt) < windowStartsAt ||
    Date.parse(candidate.outboundRoute.endsAt) > activityStartsAt
  ) {
    reasons.push(feasibilityReason(CODE.OUTBOUND_ROUTE_INVALID, "blocking"));
  }

  const returnMinutes = routeDuration(candidate.returnRoute);
  if (!candidate.returnRoute) {
    reasons.push(feasibilityReason(CODE.RETURN_ROUTE_MISSING, "blocking"));
  } else if (
    returnMinutes === undefined ||
    returnMinutes < 0 ||
    Date.parse(candidate.returnRoute.startsAt) < activityEndsAt
  ) {
    reasons.push(feasibilityReason(CODE.RETURN_ROUTE_INVALID, "blocking"));
  }

  const buffer = calculateReturnBuffer(inputs);
  if (buffer && Number.isFinite(buffer.actualMinutes)) {
    if (buffer.actualMinutes < 0) {
      reasons.push(
        feasibilityReason(CODE.RETURN_AFTER_DEADLINE, "blocking", {
          returnAt: buffer.returnAt,
          deadlineAt: buffer.deadlineAt,
          lateByMinutes: Math.abs(buffer.actualMinutes),
        }),
      );
    } else if (buffer.actualMinutes < buffer.requiredMinutes) {
      reasons.push(
        feasibilityReason(CODE.RETURN_BUFFER_TOO_SMALL, "blocking", {
          returnAt: buffer.returnAt,
          deadlineAt: buffer.deadlineAt,
          actualBufferMinutes: buffer.actualMinutes,
          requiredBufferMinutes: buffer.requiredMinutes,
        }),
      );
    }
  }

  const effectivePrice = pricePerPerson(inputs);
  if (effectivePrice === undefined) {
    reasons.push(feasibilityReason(CODE.PRICE_UNKNOWN, "warning"));
  } else if (
    participantConstraints.some(
      (constraint) =>
        constraint.maxBudgetPerPerson !== undefined &&
        effectivePrice > constraint.maxBudgetPerPerson,
    )
  ) {
    reasons.push(feasibilityReason(CODE.BUDGET_EXCEEDED, "blocking"));
  }

  const groupSize = participantConstraints.length;
  if (candidate.capacity === "unknown") {
    reasons.push(feasibilityReason(CODE.CAPACITY_UNKNOWN, "warning"));
  } else if (candidate.capacity < groupSize) {
    reasons.push(
      feasibilityReason(CODE.CAPACITY_INSUFFICIENT, "blocking", {
        confirmedCapacity: candidate.capacity,
        requiredCapacity: groupSize,
      }),
    );
  }

  if (usefulMinutes < policy.minimumUsefulMinutes) {
    reasons.push(
      feasibilityReason(CODE.USEFUL_TIME_TOO_SHORT, "blocking", {
        usefulMinutes,
        minimumUsefulMinutes: policy.minimumUsefulMinutes,
      }),
    );
  }

  if (outboundMinutes !== undefined && returnMinutes !== undefined) {
    const totalTravelMinutes = outboundMinutes + returnMinutes;
    if (
      participantConstraints.some(
        (constraint) =>
          constraint.maxTravelMinutes !== undefined &&
          totalTravelMinutes > constraint.maxTravelMinutes,
      )
    ) {
      reasons.push(
        feasibilityReason(CODE.TRAVEL_TIME_EXCEEDED, "blocking", {
          travelMinutes: totalTravelMinutes,
        }),
      );
    }

    if (
      policy.warningTravelToUsefulRatio !== undefined &&
      usefulMinutes > 0 &&
      totalTravelMinutes / usefulMinutes > policy.warningTravelToUsefulRatio
    ) {
      reasons.push(
        feasibilityReason(CODE.TRAVEL_TO_USEFUL_RATIO_HIGH, "warning", {
          travelMinutes: totalTravelMinutes,
          usefulMinutes,
        }),
      );
    }
  }

  if (
    participantConstraints.some((constraint) => constraint.allowOvernight === false) &&
    itineraryCrossesLocalDate(inputs)
  ) {
    reasons.push(feasibilityReason(CODE.OVERNIGHT_NOT_ALLOWED, "blocking"));
  }

  return reasons;
}

export function createUnknownFeasibilityCheck(): FeasibilityCheck {
  return { status: "unknown", reasons: [] };
}

export function createCheckingFeasibilityCheck(inputs: FeasibilityInputs): FeasibilityCheck {
  return {
    status: "checking",
    reasons: [],
    inputsHash: createFeasibilityInputsHash(inputs),
  };
}

export function calculateFeasibility(
  inputs: FeasibilityInputs,
  options: CalculateFeasibilityOptions,
): FeasibilityCheck {
  const inputsHash = createFeasibilityInputsHash(inputs);

  if (invalidInputs(inputs, options.checkedAt)) {
    return {
      status: "blocking",
      reasons: [feasibilityReason(CODE.INVALID_INPUT, "blocking")],
      checkedAt: options.checkedAt,
      inputsHash,
    };
  }

  if (options.previousCheck) {
    const stale = staleCheck(
      inputsHash,
      options.previousCheck,
      options.checkedAt,
      options.maxCheckAgeMinutes,
    );
    if (stale) return stale;
  }

  const reasons = evaluate(inputs);
  const status = reasons.some((reason) => reason.severity === "blocking")
    ? "blocking"
    : reasons.length > 0
      ? "warning"
      : "valid";

  return { status, reasons, checkedAt: options.checkedAt, inputsHash };
}
