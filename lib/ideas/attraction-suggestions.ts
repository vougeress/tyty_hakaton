import "server-only";

import { createHash } from "node:crypto";

import { calculateFeasibility } from "@/lib/feasibility";
import { suggestAttractionsWithGigaChat } from "@/lib/gigachat/client";
import type { AttractionSuggestion } from "@/lib/gigachat/attractions";
import type { IdeaCandidate } from "@/lib/ideas/contracts";
import type { LoadedIdeasContext } from "@/lib/ideas/server-context";

type CachedSuggestions = { checkedAt: string; candidates: IdeaCandidate[] };
const cache = new Map<string, CachedSuggestions>();
const CACHE_TTL_MS = 5 * 60_000;

function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

function candidateId(gapId: string, suggestion: AttractionSuggestion) {
  return `giga-${createHash("sha1").update(`${gapId}:${suggestion.name}:${suggestion.address}`).digest("hex").slice(0, 16)}`;
}

function mapCandidate(context: LoadedIdeasContext, suggestion: AttractionSuggestion, checkedAt: string): IdeaCandidate {
  const startsAt = addMinutes(context.search.startsAt, suggestion.travelMinutesOneWay);
  const endsAt = addMinutes(startsAt, suggestion.visitMinutes);
  const returnAt = addMinutes(endsAt, suggestion.travelMinutesOneWay);
  const id = candidateId(context.search.gapId, suggestion);
  const check = calculateFeasibility({
    candidate: {
      id,
      startsAt,
      endsAt,
      capacity: context.search.participantIds.length,
      outboundRoute: { startsAt: context.search.startsAt, endsAt: startsAt },
      returnRoute: { startsAt: endsAt, endsAt: returnAt }
    },
    window: {
      startsAt: context.search.startsAt,
      endsAt: context.search.endsAt,
      ...(context.search.nextRequiredAt ? { nextRequiredAt: context.search.nextRequiredAt } : {})
    },
    participantConstraints: context.search.participantIds.map((participantId) => ({
      participantId,
      maxTravelMinutes: context.automatic.maxTravelMinutesOneWay * 2,
      returnBufferMinutes: context.search.minimumReturnBufferMinutes,
      allowOvernight: false
    })),
    policy: {
      minimumReturnBufferMinutes: context.search.minimumReturnBufferMinutes,
      minimumUsefulMinutes: context.search.minimumUsefulMinutes,
      warningTravelToUsefulRatio: 1
    }
  }, { checkedAt });

  const mapQuery = encodeURIComponent(`${suggestion.name}, ${suggestion.address}`);
  return {
    id,
    gapId: context.search.gapId,
    title: suggestion.name,
    source: "gigachat",
    startsAt,
    endsAt,
    travelMode: suggestion.travelMinutesOneWay <= 25 ? "walk" : "mixed",
    travelMinutes: suggestion.travelMinutesOneWay * 2,
    usefulMinutes: suggestion.visitMinutes,
    capacity: context.search.participantIds.length,
    returnBufferMinutes: Math.max(0, Math.round((Date.parse(context.search.nextRequiredAt ?? context.search.endsAt) - Date.parse(returnAt)) / 60_000)),
    interest: suggestion.category,
    description: suggestion.description,
    address: suggestion.address,
    distanceKm: suggestion.distanceKm,
    deeplink: `https://yandex.ru/maps/?text=${mapQuery}`,
    recommendationReason: suggestion.reason,
    check: {
      status: check.status,
      reasons: check.reasons.map(({ code, message }) => ({ code, message })),
      checkedAt: check.checkedAt,
      inputsHash: check.inputsHash
    }
  };
}

export async function searchAttractionCandidates(context: LoadedIdeasContext) {
  const checkedAt = new Date().toISOString();
  const suggestions = await suggestAttractionsWithGigaChat({
    city: context.automatic.city,
    timezone: context.search.timezone,
    startsAt: context.search.startsAt,
    endsAt: context.search.endsAt,
    currentLocation: context.automatic.currentLocation,
    travelers: context.search.participantIds.length,
    requiredReturnBufferMinutes: context.search.minimumReturnBufferMinutes,
    minimumVisitMinutes: context.search.minimumUsefulMinutes,
    maxTravelMinutesOneWay: context.automatic.maxTravelMinutesOneWay
  });
  const candidates = suggestions.map((suggestion) => mapCandidate(context, suggestion, checkedAt));
  cache.set(context.search.gapId, { checkedAt, candidates });
  return { checkedAt, candidates };
}

export function getCachedAttractionCandidates(gapId: string, now = Date.now()) {
  const entry = cache.get(gapId);
  if (!entry || now - Date.parse(entry.checkedAt) > CACHE_TTL_MS) return [];
  return entry.candidates;
}
