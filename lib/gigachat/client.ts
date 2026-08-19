import "server-only";

import { randomUUID } from "node:crypto";

import {
  attractionSuggestionsSchema,
  type AttractionSuggestionRequest
} from "@/lib/gigachat/attractions";

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | undefined;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    attractions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          address: { type: "string" },
          category: { type: "string" },
          latitude: { type: ["number", "null"] },
          longitude: { type: ["number", "null"] },
          distanceKm: { type: "number" },
          travelMinutesOneWay: { type: "integer" },
          visitMinutes: { type: "integer" },
          pricePerPerson: { type: ["number", "null"] },
          reason: { type: "string" }
        },
        required: [
          "name",
          "description",
          "address",
          "category",
          "latitude",
          "longitude",
          "distanceKm",
          "travelMinutesOneWay",
          "visitMinutes",
          "pricePerPerson",
          "reason"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["attractions"],
  additionalProperties: false
} as const;

function authHeader() {
  const key = process.env.GIGACHAT_AUTH_KEY?.trim();
  if (!key) return undefined;
  return key.toLowerCase().startsWith("basic ") ? key : `Basic ${key}`;
}

async function accessToken() {
  const direct = process.env.GIGACHAT_ACCESS_TOKEN?.trim();
  if (direct) return direct;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const authorization = authHeader();
  if (!authorization) {
    throw new Error("GigaChat is not configured");
  }

  const response = await fetch(
    process.env.GIGACHAT_OAUTH_URL ?? "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: authorization,
        "Content-Type": "application/x-www-form-urlencoded",
        RqUID: randomUUID()
      },
      body: new URLSearchParams({ scope: process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS" }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store"
    }
  );
  if (!response.ok) throw new Error(`GigaChat OAuth failed: ${response.status}`);
  const payload = await response.json() as { access_token?: string; expires_at?: number };
  if (!payload.access_token) throw new Error("GigaChat OAuth returned no access token");
  cachedToken = {
    value: payload.access_token,
    expiresAt: payload.expires_at ? payload.expires_at * 1_000 : Date.now() + 29 * 60_000
  };
  return cachedToken.value;
}

function prompt(input: AttractionSuggestionRequest) {
  const coordinates = input.currentLocation.latitude !== undefined && input.currentLocation.longitude !== undefined
    ? `Координаты текущей точки: ${input.currentLocation.latitude}, ${input.currentLocation.longitude}.`
    : "Координаты неизвестны: оцени расстояние по названию места и явно не предлагай сомнительно далёкие места.";
  return [
    `Подбери от 3 до 5 реально существующих достопримечательностей в городе ${input.city}.`,
    `Текущая позиция группы: ${input.currentLocation.name}. ${coordinates}`,
    `Свободное окно: ${input.startsAt} — ${input.endsAt}, часовой пояс ${input.timezone}.`,
    `Группа: ${input.travelers} чел., бюджет до ${input.budgetPerPerson} рублей на человека.`,
    `Дорога в одну сторону — не больше ${input.maxTravelMinutesOneWay} минут, посещение — минимум ${input.minimumVisitMinutes} минут,`,
    `после возвращения должен остаться запас ${input.requiredReturnBufferMinutes} минут.`,
    "Учитывай дорогу туда и обратно. Не придумывай адреса. Если цена неизвестна, не передавай pricePerPerson.",
    "distanceKm и travelMinutesOneWay должны быть реалистичной оценкой от текущей точки. Кратко объясни, почему место помещается в окно."
  ].join(" ");
}

export async function suggestAttractionsWithGigaChat(input: AttractionSuggestionRequest) {
  const token = await accessToken();
  const response = await fetch(`${process.env.GIGACHAT_API_URL ?? "https://api.giga.chat"}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GIGACHAT_MODEL ?? "GigaChat-2",
      stream: false,
      temperature: 0.25,
      messages: [
        {
          role: "system",
          content: "Ты локальный travel-планировщик. Возвращай только проверяемые достопримечательности и строго соблюдай JSON Schema."
        },
        { role: "user", content: prompt(input) }
      ],
      response_format: {
        type: "json_schema",
        schema: RESPONSE_SCHEMA,
        strict: true
      }
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`GigaChat completion failed: ${response.status}`);
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("GigaChat returned an empty response");
  return attractionSuggestionsSchema.parse(JSON.parse(content)).attractions;
}
