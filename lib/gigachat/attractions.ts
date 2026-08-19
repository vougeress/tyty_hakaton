import { z } from "zod";

export const attractionSuggestionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(320),
  address: z.string().trim().min(2).max(180),
  category: z.string().trim().min(2).max(60),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  distanceKm: z.number().nonnegative().max(300),
  travelMinutesOneWay: z.number().int().nonnegative().max(240),
  visitMinutes: z.number().int().min(30).max(480),
  pricePerPerson: z.number().nonnegative().max(1_000_000).nullable().optional(),
  reason: z.string().trim().min(5).max(240)
});

export const attractionSuggestionsSchema = z.object({
  attractions: z.array(attractionSuggestionSchema).min(1).max(5)
});

export type AttractionSuggestion = z.infer<typeof attractionSuggestionSchema>;

export type AttractionSuggestionRequest = {
  city: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  currentLocation: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
  travelers: number;
  budgetPerPerson: number;
  requiredReturnBufferMinutes: number;
  minimumVisitMinutes: number;
  maxTravelMinutesOneWay: number;
};
