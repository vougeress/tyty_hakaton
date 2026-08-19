export type WinnerRecheckStatus =
  | "valid"
  | "price_changed"
  | "capacity_unknown"
  | "stale"
  | "insufficient_capacity"
  | "sold_out";

export type WinnerCandidate = {
  id: string;
  presetId: "winner.rechecked" | "winner.recheck_failed";
  pollId: string;
  pollStatus: "closed";
  title: string;
  transportLabel: string;
  dateLabel: string;
  departure: { time: string; place: string };
  arrival: { time: string; place: string };
  calendarStartsAt: string;
  calendarEndsAt: string;
  votesLabel: string;
  fitLabel: string;
  participantCount: number;
  recheckStatus: WinnerRecheckStatus;
  pricePerPerson: number;
  previousPricePerPerson?: number;
  capacity: number | "unknown";
  returnBufferMinutes: number;
  checkedAtLabel?: string;
  deeplink?: string;
};

export interface WinnerRepository {
  getWinner(candidateId: string): WinnerCandidate | null;
  recheckWinner(candidateId: string): WinnerCandidate | null;
}

const winnerBase = {
  pollId: "demo-poll",
  pollStatus: "closed" as const,
  title: "Иннополис",
  transportLabel: "Автобус",
  dateLabel: "12 сентября",
  departure: { time: "14:05", place: "Казань" },
  arrival: { time: "14:57", place: "Иннополис" },
  calendarStartsAt: "2026-09-12T14:05:00+03:00",
  calendarEndsAt: "2026-09-12T17:32:00+03:00",
  votesLabel: "Выбрали 4 из 4",
  fitLabel: "маршрут подходит всем",
  participantCount: 4,
  pricePerPerson: 790,
  capacity: 8,
  returnBufferMinutes: 58,
  checkedAtLabel: "только что",
  deeplink: "https://www.tutu.ru/bus/"
};

const fixtures: Record<string, WinnerCandidate> = {
  innopolis_bus: {
    ...winnerBase,
    id: "innopolis_bus",
    presetId: "winner.rechecked",
    recheckStatus: "valid"
  },
  "innopolis-price-changed": {
    ...winnerBase,
    id: "innopolis-price-changed",
    presetId: "winner.rechecked",
    recheckStatus: "price_changed",
    previousPricePerPerson: 790,
    pricePerPerson: 890
  },
  "innopolis-capacity-unknown": {
    ...winnerBase,
    id: "innopolis-capacity-unknown",
    presetId: "winner.rechecked",
    recheckStatus: "capacity_unknown",
    capacity: "unknown"
  },
  "innopolis-stale": {
    ...winnerBase,
    id: "innopolis-stale",
    presetId: "winner.rechecked",
    recheckStatus: "stale",
    checkedAtLabel: "18 минут назад",
    deeplink: undefined
  },
  "innopolis-insufficient-seats": {
    ...winnerBase,
    id: "innopolis-insufficient-seats",
    presetId: "winner.recheck_failed",
    recheckStatus: "insufficient_capacity",
    capacity: 2,
    deeplink: undefined
  },
  "innopolis-sold-out": {
    ...winnerBase,
    id: "innopolis-sold-out",
    presetId: "winner.recheck_failed",
    recheckStatus: "sold_out",
    capacity: 0,
    deeplink: undefined
  }
};

const aliases: Record<string, string> = {
  innopolis: "innopolis_bus"
};

export const mockWinnerRepository: WinnerRepository = {
  getWinner(candidateId) {
    return fixtures[aliases[candidateId] ?? candidateId] ?? null;
  },
  recheckWinner(candidateId) {
    const resolvedId = aliases[candidateId] ?? candidateId;
    if (resolvedId !== "innopolis-stale") return fixtures[resolvedId] ?? null;
    return fixtures.innopolis_bus;
  }
};

export const winnerFixtureIds = [...Object.keys(fixtures), ...Object.keys(aliases)];
