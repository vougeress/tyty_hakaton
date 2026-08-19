import type {
  BufferCalculation,
  FeasibilityInputs,
} from "./types";

const MINUTE_MS = 60_000;

export function minutesBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / MINUTE_MS;
}

export function calculateRequiredReturnBufferMinutes(
  inputs: Pick<FeasibilityInputs, "participantConstraints" | "policy">,
): number {
  return Math.max(
    inputs.policy.minimumReturnBufferMinutes,
    ...inputs.participantConstraints.map(
      (constraint) => constraint.returnBufferMinutes ?? 0,
    ),
  );
}

export function calculateReturnBuffer(
  inputs: FeasibilityInputs,
): BufferCalculation | undefined {
  const returnAt = inputs.candidate.returnRoute?.endsAt;
  if (!returnAt) {
    return undefined;
  }

  const deadlineAt = inputs.window.nextRequiredAt ?? inputs.window.endsAt;

  return {
    actualMinutes: minutesBetween(returnAt, deadlineAt),
    requiredMinutes: calculateRequiredReturnBufferMinutes(inputs),
    deadlineAt,
    returnAt,
  };
}
