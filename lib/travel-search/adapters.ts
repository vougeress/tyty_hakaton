import "server-only";

import { createHash } from "node:crypto";

import {
  travelOptionSchema,
  type TravelOption,
  type TravelOptionType,
  type TravelSearchInput
} from "@/lib/travel-search/contracts";
import { LiveTutuMcpClient, type McpTool, type TutuMcpClient } from "@/lib/travel-search/mcp-client";

export type TravelSearchAdapter = {
  search(input: TravelSearchInput): Promise<TravelOption[]>;
};

const TOOL_PATTERNS: Record<TravelOptionType, RegExp> = {
  train: /(^|_)rail$|train|поезд|жд|ж\/д/i,
  bus: /(bus|автобус)/i,
  suburban_train: /(etrain|suburban|commuter|электрич|пригород)/i,
  hotel: /(hotel|отел|гостиниц)/i
};

const TOOL_NAMES: Record<TravelOptionType, string> = {
  train: "search_rail",
  bus: "search_bus",
  suburban_train: "search_etrain",
  hotel: "search_hotels"
};

export class MockTravelSearchAdapter implements TravelSearchAdapter {
  async search(input: TravelSearchInput) {
    const checkedAt = new Date().toISOString();
    const start = input.startsAt.getTime();
    const hour = 60 * 60 * 1000;
    const candidates: TravelOption[] = [
      {
        id: stableId("mock-train", input),
        type: "train",
        origin: input.origin,
        destination: input.destination,
        departureAt: new Date(start + hour).toISOString(),
        arrivalAt: new Date(start + 2.5 * hour).toISOString(),
        returnDepartureAt: new Date(start + 4 * hour).toISOString(),
        returnArrivalAt: new Date(start + 5.3 * hour).toISOString(),
        pricePerPerson: 1760,
        availableSeats: Math.max(input.travelers + 2, 6),
        bookingUrl: "https://www.tutu.ru/",
        source: "demo_catalog",
        checkedAt
      },
      {
        id: stableId("mock-bus", input),
        type: "bus",
        origin: input.origin,
        destination: input.destination,
        departureAt: new Date(start + 45 * 60 * 1000).toISOString(),
        arrivalAt: new Date(start + 2.2 * hour).toISOString(),
        returnDepartureAt: new Date(start + 4.2 * hour).toISOString(),
        returnArrivalAt: new Date(start + 5.5 * hour).toISOString(),
        pricePerPerson: 920,
        availableSeats: input.travelers,
        bookingUrl: "https://www.tutu.ru/",
        source: "demo_catalog",
        checkedAt
      },
      {
        id: stableId("mock-suburban", input),
        type: "suburban_train",
        origin: input.origin,
        destination: input.destination,
        departureAt: new Date(start + 30 * 60 * 1000).toISOString(),
        arrivalAt: new Date(start + 1.7 * hour).toISOString(),
        returnDepartureAt: new Date(start + 4.5 * hour).toISOString(),
        returnArrivalAt: new Date(start + 5.7 * hour).toISOString(),
        pricePerPerson: 380,
        bookingUrl: "https://www.tutu.ru/",
        source: "demo_catalog",
        checkedAt
      },
      {
        id: stableId("mock-hotel", input),
        type: "hotel",
        origin: input.origin,
        destination: input.destination,
        departureAt: new Date(start + hour).toISOString(),
        arrivalAt: new Date(input.endsAt.getTime() - hour).toISOString(),
        pricePerPerson: 2600,
        availableSeats: Math.max(input.travelers, 4),
        bookingUrl: "https://hotel.tutu.ru/",
        source: "demo_catalog",
        checkedAt
      }
    ];

    return candidates.filter((candidate) => input.types.includes(candidate.type));
  }
}

export class LiveTravelSearchAdapter implements TravelSearchAdapter {
  constructor(private readonly client: TutuMcpClient = new LiveTutuMcpClient()) {}

  async search(input: TravelSearchInput) {
    const tools = await this.client.listTools();
    const checkedAt = new Date().toISOString();
    const batches = await Promise.all(input.types.map(async (type) => {
      const tool = findTool(tools, type);
      if (!tool) return [];
      const raw = await this.client.callTool(tool.name, createToolArgs(type, input));
      return normalizeToolResult(raw, type, input, checkedAt);
    }));

    return batches.flat().slice(0, 8);
  }
}

function findTool(tools: McpTool[], type: TravelOptionType) {
  return tools.find((tool) => tool.name === TOOL_NAMES[type])
    ?? tools.find((tool) => TOOL_PATTERNS[type].test(`${tool.name} ${tool.description ?? ""}`));
}

function createToolArgs(type: TravelOptionType, input: TravelSearchInput) {
  if (type === "hotel") {
    return {
      city_name: input.destination,
      check_in: dateOnly(input.startsAt),
      check_out: dateOnly(input.endsAt),
      adults: input.travelers,
      page: 1,
      page_size: 3,
      view: "compact"
    };
  }

  const common = {
    origin: input.origin,
    destination: input.destination,
    departure_date: dateOnly(input.startsAt),
    page: 1,
    page_size: 3,
    sort: "price_asc",
    view: "compact"
  };

  if (type === "train") return { ...common, passengers: input.travelers };
  if (type === "bus") return { ...common, adults: input.travelers };
  return common;
}

function normalizeToolResult(raw: unknown, type: TravelOptionType, input: TravelSearchInput, checkedAt: string) {
  return extractItems(raw)
    .map((item, index) => normalizeItem(item, type, input, checkedAt, index))
    .filter((item): item is TravelOption => item !== null);
}

function extractItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];
  if (isRecord(raw.structuredContent)) return extractItems(raw.structuredContent);
  if (Array.isArray(raw.options)) return raw.options;
  if (Array.isArray(raw.results)) return raw.results;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.offers)) return raw.offers;
  if (Array.isArray(raw.hotels)) return raw.hotels;
  if (Array.isArray(raw.content)) {
    return raw.content.flatMap((part) => {
      if (!isRecord(part)) return [];
      if (typeof part.text === "string") {
        try {
          return extractItems(JSON.parse(part.text));
        } catch {
          return [];
        }
      }
      return extractItems(part);
    });
  }
  return [];
}

function normalizeItem(
  raw: unknown,
  type: TravelOptionType,
  input: TravelSearchInput,
  checkedAt: string,
  index: number
) {
  if (!isRecord(raw)) return null;
  const option = {
    id: stringValue(raw.id) ?? stableId(`${type}-${index}`, input),
    type,
    origin: stringValue(raw.origin) ?? stringValue(raw.from) ?? stringValue(nested(raw, "meta", "from", "name")) ?? input.origin,
    destination: stringValue(raw.destination) ?? stringValue(raw.to) ?? stringValue(raw.name) ?? input.destination,
    departureAt: dateValue(raw.departureAt) ?? dateValue(raw.departure_at) ?? dateValue(raw.departure_time) ?? firstSegmentDate(raw, "departure_at") ?? input.startsAt.toISOString(),
    arrivalAt: dateValue(raw.arrivalAt) ?? dateValue(raw.arrival_at) ?? dateValue(raw.arrival_time) ?? lastSegmentDate(raw, "arrival_at") ?? input.endsAt.toISOString(),
    returnDepartureAt: dateValue(raw.returnDepartureAt) ?? dateValue(raw.return_departure_time),
    returnArrivalAt: dateValue(raw.returnArrivalAt) ?? dateValue(raw.return_arrival_time),
    pricePerPerson: normalizePricePerPerson(
      type,
      input.travelers,
      priceValue(raw.pricePerPerson) ?? priceValue(raw.price) ?? priceValue(nested(raw, "best_offer", "price")) ?? 0
    ),
    availableSeats: numberValue(raw.availableSeats) ?? numberValue(raw.seats) ?? numberValue(raw.capacity),
    bookingUrl: stringValue(raw.bookingUrl) ?? stringValue(raw.checkout_url) ?? stringValue(raw.search_results_url) ?? stringValue(nested(raw, "best_offer", "checkout_url")) ?? stringValue(raw.url) ?? stringValue(raw.deepLink),
    source: "tutu",
    checkedAt
  };

  const parsed = travelOptionSchema.safeParse(option);
  return parsed.success ? parsed.data : null;
}

function stableId(prefix: string, input: TravelSearchInput) {
  return createHash("sha1")
    .update([prefix, input.origin, input.destination, input.startsAt.toISOString(), input.endsAt.toISOString()].join("|"))
    .digest("hex")
    .slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nested(value: unknown, ...path: string[]) {
  return path.reduce<unknown>((current, key) => isRecord(current) ? current[key] : undefined, value);
}

function priceValue(value: unknown) {
  if (isRecord(value)) return numberValue(value.amount) ?? numberValue(value.value);
  return numberValue(value);
}

function normalizePricePerPerson(type: TravelOptionType, travelers: number, price: number) {
  if (type !== "hotel") return price;
  return Math.round((price / travelers) * 100) / 100;
}

function firstSegmentDate(raw: Record<string, unknown>, key: string) {
  const segment = firstSegment(raw);
  return segment ? dateValue(segment[key]) : undefined;
}

function lastSegmentDate(raw: Record<string, unknown>, key: string) {
  const legs = Array.isArray(raw.legs) ? raw.legs : [];
  const lastLeg = legs.at(-1);
  if (!isRecord(lastLeg) || !Array.isArray(lastLeg.segments)) return undefined;
  const segment = lastLeg.segments.at(-1);
  return isRecord(segment) ? dateValue(segment[key]) : undefined;
}

function firstSegment(raw: Record<string, unknown>) {
  if (!Array.isArray(raw.legs)) return null;
  const firstLeg = raw.legs[0];
  if (!isRecord(firstLeg) || !Array.isArray(firstLeg.segments)) return null;
  const segment = firstLeg.segments[0];
  return isRecord(segment) ? segment : null;
}
