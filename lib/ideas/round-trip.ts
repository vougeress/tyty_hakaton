import type { TravelOption } from "../travel-search/contracts";

function seats(option: TravelOption) {
  return option.availableSeats ?? Number.MAX_SAFE_INTEGER;
}

function endpoint(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function mergeRoundTripOptions(
  outboundOptions: TravelOption[],
  returnOptions: TravelOption[],
  expected?: { origin: string; destination: string }
) {
  return outboundOptions.map((outbound) => {
    if (outbound.returnDepartureAt && outbound.returnArrivalAt) return outbound;
    if (expected && (
      endpoint(outbound.origin) !== endpoint(expected.origin)
      || endpoint(outbound.destination) !== endpoint(expected.destination)
    )) return outbound;
    const inbound = returnOptions
      .filter((candidate) =>
        candidate.id !== outbound.id
        && endpoint(candidate.origin) === endpoint(outbound.destination)
        && endpoint(candidate.destination) === endpoint(outbound.origin)
        && candidate.type === outbound.type
        && Date.parse(candidate.departureAt) >= Date.parse(outbound.arrivalAt)
      )
      .sort((left, right) => Date.parse(left.arrivalAt) - Date.parse(right.arrivalAt))[0];
    if (!inbound) return outbound;

    return {
      ...outbound,
      id: `${outbound.id}:${inbound.id}`.slice(0, 160),
      returnDepartureAt: inbound.departureAt,
      returnArrivalAt: inbound.arrivalAt,
      pricePerPerson: outbound.pricePerPerson + inbound.pricePerPerson,
      availableSeats: Math.min(seats(outbound), seats(inbound)) === Number.MAX_SAFE_INTEGER
        ? undefined
        : Math.min(seats(outbound), seats(inbound)),
      checkedAt: Date.parse(outbound.checkedAt) <= Date.parse(inbound.checkedAt) ? outbound.checkedAt : inbound.checkedAt
    };
  });
}
