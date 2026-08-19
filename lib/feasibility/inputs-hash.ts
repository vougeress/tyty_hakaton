import type { FeasibilityInputs } from "./types";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }

  return value;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stable identity of every material feasibility input.
 * Participant constraints are sorted so repository ordering cannot make a check stale.
 */
export function createFeasibilityInputsHash(inputs: FeasibilityInputs): string {
  const normalized: FeasibilityInputs = {
    ...inputs,
    participantConstraints: [...inputs.participantConstraints].sort((left, right) =>
      left.participantId.localeCompare(right.participantId),
    ),
  };

  return `feasibility-v1-${fnv1a32(JSON.stringify(stableValue(normalized)))}`;
}
