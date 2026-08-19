import { describe, expect, it } from "vitest";

import {
  calculateFeasibility,
  calculateRequiredReturnBufferMinutes,
  calculateReturnBuffer,
  createCheckingFeasibilityCheck,
  createFeasibilityInputsHash,
  createUnknownFeasibilityCheck,
  createValidFeasibilityFixture,
  DEFAULT_CHECKED_AT,
  FEASIBILITY_REASON_CODES as CODE,
  type FeasibilityInputs,
} from ".";

function fixture(): FeasibilityInputs {
  return structuredClone(createValidFeasibilityFixture());
}

function reasonCodes(inputs: FeasibilityInputs) {
  return calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT }).reasons.map(
    (reason) => reason.code,
  );
}

describe("calculateFeasibility", () => {
  it("returns a deterministic valid result for a feasible group trip", () => {
    const inputs = fixture();

    const first = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    const second = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(first).toEqual(second);
    expect(first).toEqual({
      status: "valid",
      reasons: [],
      checkedAt: DEFAULT_CHECKED_AT,
      inputsHash: expect.stringMatching(/^feasibility-v1-[0-9a-f]{8}$/),
    });
  });

  it("blocks a return after the next mandatory event with concrete times", () => {
    const inputs = fixture();
    inputs.candidate.returnRoute!.endsAt = "2026-09-12T19:50:00+03:00";

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    const reason = result.reasons.find(({ code }) => code === CODE.RETURN_AFTER_DEADLINE);

    expect(result.status).toBe("blocking");
    expect(reason?.facts).toEqual({
      returnAt: "2026-09-12T19:50:00+03:00",
      deadlineAt: "2026-09-12T19:30:00+03:00",
      lateByMinutes: 20,
    });
  });

  it("blocks a return buffer below the strictest participant requirement", () => {
    const inputs = fixture();
    inputs.participantConstraints[1].returnBufferMinutes = 75;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    const reason = result.reasons.find(({ code }) => code === CODE.RETURN_BUFFER_TOO_SMALL);

    expect(result.status).toBe("blocking");
    expect(reason?.facts).toMatchObject({
      actualBufferMinutes: 58,
      requiredBufferMinutes: 75,
    });
  });

  it("treats returning exactly at the deadline as on time but without the required buffer", () => {
    const inputs = fixture();
    inputs.candidate.returnRoute!.endsAt = inputs.window.nextRequiredAt!;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("blocking");
    expect(result.reasons.map(({ code }) => code)).not.toContain(CODE.RETURN_AFTER_DEADLINE);
    expect(result.reasons.find(({ code }) => code === CODE.RETURN_BUFFER_TOO_SMALL)?.facts).toMatchObject({
      actualBufferMinutes: 0,
      requiredBufferMinutes: 45,
    });
  });

  it("uses the window end as the deadline when no next event is supplied", () => {
    const inputs = fixture();
    delete inputs.window.nextRequiredAt;

    expect(reasonCodes(inputs)).toContain(CODE.RETURN_AFTER_DEADLINE);
  });

  it.each([
    ["outbound", CODE.OUTBOUND_ROUTE_MISSING],
    ["return", CODE.RETURN_ROUTE_MISSING],
  ] as const)("blocks when the %s route is missing", (route, code) => {
    const inputs = fixture();
    if (route === "outbound") delete inputs.candidate.outboundRoute;
    else delete inputs.candidate.returnRoute;

    expect(reasonCodes(inputs)).toContain(code);
  });

  it("blocks routes that do not connect to the activity", () => {
    const inputs = fixture();
    inputs.candidate.outboundRoute!.endsAt = "2026-09-12T14:30:00+03:00";
    inputs.candidate.returnRoute!.startsAt = "2026-09-12T15:30:00+03:00";

    expect(reasonCodes(inputs)).toEqual(
      expect.arrayContaining([CODE.OUTBOUND_ROUTE_INVALID, CODE.RETURN_ROUTE_INVALID]),
    );
  });

  it("blocks an activity outside the selected window", () => {
    const inputs = fixture();
    inputs.candidate.startsAt = "2026-09-12T11:00:00+03:00";

    expect(reasonCodes(inputs)).toContain(CODE.ACTIVITY_OUTSIDE_WINDOW);
  });

  it("checks every private participant budget without exposing values", () => {
    const inputs = fixture();
    inputs.participantConstraints[2].maxBudgetPerPerson = 500;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    const reason = result.reasons.find(({ code }) => code === CODE.BUDGET_EXCEEDED);

    expect(result.status).toBe("blocking");
    expect(reason).toBeDefined();
    expect(reason?.facts).toBeUndefined();
    expect(JSON.stringify(reason)).not.toContain("500");
    expect(JSON.stringify(reason)).not.toContain("maria");
  });

  it("derives per-person price from group price", () => {
    const inputs = fixture();
    delete inputs.candidate.pricePerPerson;
    inputs.candidate.groupPrice = 4_000;
    inputs.participantConstraints[0].maxBudgetPerPerson = 900;

    expect(reasonCodes(inputs)).toContain(CODE.BUDGET_EXCEEDED);
  });

  it("warns when price is unknown", () => {
    const inputs = fixture();
    delete inputs.candidate.pricePerPerson;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("warning");
    expect(reasonCodes(inputs)).toContain(CODE.PRICE_UNKNOWN);
  });

  it("blocks insufficient confirmed capacity", () => {
    const inputs = fixture();
    inputs.candidate.capacity = 3;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    const reason = result.reasons.find(({ code }) => code === CODE.CAPACITY_INSUFFICIENT);

    expect(result.status).toBe("blocking");
    expect(reason?.facts).toEqual({ confirmedCapacity: 3, requiredCapacity: 4 });
  });

  it("warns rather than claiming availability when capacity is unknown", () => {
    const inputs = fixture();
    inputs.candidate.capacity = "unknown";

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("warning");
    expect(reasonCodes(inputs)).toContain(CODE.CAPACITY_UNKNOWN);
  });

  it("blocks too little useful time", () => {
    const inputs = fixture();
    inputs.policy.minimumUsefulMinutes = 150;

    expect(reasonCodes(inputs)).toContain(CODE.USEFUL_TIME_TOO_SHORT);
  });

  it("blocks when total travel violates one participant constraint", () => {
    const inputs = fixture();
    inputs.participantConstraints[0].maxTravelMinutes = 120;

    const reason = calculateFeasibility(inputs, {
      checkedAt: DEFAULT_CHECKED_AT,
    }).reasons.find(({ code }) => code === CODE.TRAVEL_TIME_EXCEEDED);

    expect(reason?.facts).toEqual({ travelMinutes: 199 });
  });

  it("warns when travel dominates useful time", () => {
    const inputs = fixture();
    inputs.policy.warningTravelToUsefulRatio = 1;

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("warning");
    expect(reasonCodes(inputs)).toContain(CODE.TRAVEL_TO_USEFUL_RATIO_HIGH);
  });

  it("blocks an overnight route for any participant who disallows it", () => {
    const inputs = fixture();
    inputs.window.startsAt = "2026-09-12T22:00:00+03:00";
    inputs.window.endsAt = "2026-09-13T05:00:00+03:00";
    inputs.window.nextRequiredAt = "2026-09-13T07:00:00+03:00";
    inputs.candidate.startsAt = "2026-09-12T23:00:00+03:00";
    inputs.candidate.endsAt = "2026-09-13T02:00:00+03:00";
    inputs.candidate.outboundRoute = {
      startsAt: "2026-09-12T22:00:00+03:00",
      endsAt: "2026-09-12T23:00:00+03:00",
    };
    inputs.candidate.returnRoute = {
      startsAt: "2026-09-13T02:00:00+03:00",
      endsAt: "2026-09-13T04:00:00+03:00",
    };
    inputs.participantConstraints[0].allowOvernight = false;

    expect(reasonCodes(inputs)).toContain(CODE.OVERNIGHT_NOT_ALLOWED);
  });

  it("returns one safe blocking reason for malformed input", () => {
    const inputs = fixture();
    inputs.candidate.endsAt = "not-a-date";

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("blocking");
    expect(result.reasons.map(({ code }) => code)).toEqual([CODE.INVALID_INPUT]);
  });

  it("rejects timestamps without an explicit timezone", () => {
    const inputs = fixture();
    inputs.candidate.returnRoute!.endsAt = "2026-09-12T18:32:00";

    const result = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    expect(result.status).toBe("blocking");
    expect(result.reasons.map(({ code }) => code)).toEqual([CODE.INVALID_INPUT]);
  });
});

describe("staleness and lifecycle", () => {
  it("returns stale when a material input such as price changed", () => {
    const inputs = fixture();
    const previousCheck = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });
    inputs.candidate.pricePerPerson = 900;

    const result = calculateFeasibility(inputs, {
      checkedAt: "2026-09-12T10:05:00+03:00",
      previousCheck,
    });

    expect(result.status).toBe("stale");
    expect(result.reasons.map(({ code }) => code)).toEqual([CODE.INPUTS_CHANGED]);
    expect(result.inputsHash).not.toBe(previousCheck.inputsHash);
    expect(result.checkedAt).toBe(previousCheck.checkedAt);
  });

  it("returns stale when a check exceeds its explicit max age", () => {
    const inputs = fixture();
    const previousCheck = calculateFeasibility(inputs, { checkedAt: DEFAULT_CHECKED_AT });

    const result = calculateFeasibility(inputs, {
      checkedAt: "2026-09-12T10:31:00+03:00",
      previousCheck,
      maxCheckAgeMinutes: 30,
    });

    expect(result.status).toBe("stale");
    expect(result.reasons.map(({ code }) => code)).toEqual([CODE.CHECK_EXPIRED]);
  });

  it("does not become stale just because participant repository order changed", () => {
    const inputs = fixture();
    const hash = createFeasibilityInputsHash(inputs);
    inputs.participantConstraints.reverse();

    expect(createFeasibilityInputsHash(inputs)).toBe(hash);
  });

  it("creates explicit unknown and checking states", () => {
    const inputs = fixture();

    expect(createUnknownFeasibilityCheck()).toEqual({ status: "unknown", reasons: [] });
    expect(createCheckingFeasibilityCheck(inputs)).toEqual({
      status: "checking",
      reasons: [],
      inputsHash: createFeasibilityInputsHash(inputs),
    });
  });
});

describe("buffer helpers", () => {
  it("returns the strictest policy or participant buffer", () => {
    const inputs = fixture();
    inputs.participantConstraints[2].returnBufferMinutes = 90;

    expect(calculateRequiredReturnBufferMinutes(inputs)).toBe(90);
  });

  it("calculates the actual return buffer", () => {
    expect(calculateReturnBuffer(fixture())).toEqual({
      actualMinutes: 58,
      requiredMinutes: 45,
      deadlineAt: "2026-09-12T19:30:00+03:00",
      returnAt: "2026-09-12T18:32:00+03:00",
    });
  });
});
