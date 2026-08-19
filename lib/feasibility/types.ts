export const FEASIBILITY_STATUSES = [
  "unknown",
  "checking",
  "valid",
  "warning",
  "blocking",
  "stale",
] as const;

export type FeasibilityStatus = (typeof FEASIBILITY_STATUSES)[number];

export const FEASIBILITY_REASON_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  ACTIVITY_OUTSIDE_WINDOW: "ACTIVITY_OUTSIDE_WINDOW",
  OUTBOUND_ROUTE_MISSING: "OUTBOUND_ROUTE_MISSING",
  OUTBOUND_ROUTE_INVALID: "OUTBOUND_ROUTE_INVALID",
  RETURN_ROUTE_MISSING: "RETURN_ROUTE_MISSING",
  RETURN_ROUTE_INVALID: "RETURN_ROUTE_INVALID",
  RETURN_AFTER_DEADLINE: "RETURN_AFTER_DEADLINE",
  RETURN_BUFFER_TOO_SMALL: "RETURN_BUFFER_TOO_SMALL",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  PRICE_UNKNOWN: "PRICE_UNKNOWN",
  CAPACITY_INSUFFICIENT: "CAPACITY_INSUFFICIENT",
  CAPACITY_UNKNOWN: "CAPACITY_UNKNOWN",
  USEFUL_TIME_TOO_SHORT: "USEFUL_TIME_TOO_SHORT",
  TRAVEL_TIME_EXCEEDED: "TRAVEL_TIME_EXCEEDED",
  TRAVEL_TO_USEFUL_RATIO_HIGH: "TRAVEL_TO_USEFUL_RATIO_HIGH",
  OVERNIGHT_NOT_ALLOWED: "OVERNIGHT_NOT_ALLOWED",
  INPUTS_CHANGED: "INPUTS_CHANGED",
  CHECK_EXPIRED: "CHECK_EXPIRED",
} as const;

export type FeasibilityReasonCode =
  (typeof FEASIBILITY_REASON_CODES)[keyof typeof FEASIBILITY_REASON_CODES];

export type FeasibilityReasonSeverity = "warning" | "blocking";

export type FeasibilityReason = {
  code: FeasibilityReasonCode;
  message: string;
  severity: FeasibilityReasonSeverity;
  /** Non-sensitive values that a UI may safely use to explain the result. */
  facts?: Record<string, number | string>;
};

export type FeasibilityCheck = {
  status: FeasibilityStatus;
  reasons: FeasibilityReason[];
  checkedAt?: string;
  inputsHash?: string;
};

export type RouteLeg = {
  startsAt: string;
  endsAt: string;
};

export type ParticipantConstraint = {
  participantId: string;
  /** Private input. It is intentionally never copied into a reason or output. */
  maxBudgetPerPerson?: number;
  maxTravelMinutes?: number;
  allowOvernight?: boolean;
  returnBufferMinutes?: number;
};

export type FeasibilityCandidate = {
  id: string;
  startsAt: string;
  endsAt: string;
  pricePerPerson?: number;
  groupPrice?: number;
  capacity: number | "unknown";
  outboundRoute?: RouteLeg;
  returnRoute?: RouteLeg;
};

export type FeasibilityWindow = {
  startsAt: string;
  endsAt: string;
  /** Start of the next mandatory item. Defaults to `endsAt`. */
  nextRequiredAt?: string;
};

export type FeasibilityPolicy = {
  minimumReturnBufferMinutes: number;
  minimumUsefulMinutes: number;
  /** A warning threshold. For example, 1 means travel is longer than useful time. */
  warningTravelToUsefulRatio?: number;
};

export type FeasibilityInputs = {
  candidate: FeasibilityCandidate;
  window: FeasibilityWindow;
  participantConstraints: ParticipantConstraint[];
  policy: FeasibilityPolicy;
};

export type CalculateFeasibilityOptions = {
  /** Explicit for deterministic calculations; must be a valid ISO timestamp. */
  checkedAt: string;
  /** When supplied, changed inputs or an expired check produce `stale`. */
  previousCheck?: FeasibilityCheck;
  maxCheckAgeMinutes?: number;
};

export type BufferCalculation = {
  actualMinutes: number;
  requiredMinutes: number;
  deadlineAt: string;
  returnAt: string;
};
