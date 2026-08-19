"use server";

import { ZodError } from "zod";

import {
  createTravelSearchService,
  type TravelOption,
  type TravelOptionType
} from "@/lib/travel-search";

export type TravelOptionsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  options: TravelOption[];
  checkedAt?: string;
  cache?: "hit" | "miss";
  warnings?: string[];
};

const initialTypes: TravelOptionType[] = ["train", "bus", "suburban_train", "hotel"];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function searchTravelOptionsAction(
  _previousState: TravelOptionsActionState,
  formData: FormData
): Promise<TravelOptionsActionState> {
  try {
    const result = await createTravelSearchService().search({
      tripId: text(formData, "tripId") || undefined,
      gapId: text(formData, "gapId") || undefined,
      origin: text(formData, "origin"),
      destination: text(formData, "destination"),
      startsAt: text(formData, "startsAt"),
      endsAt: text(formData, "endsAt"),
      travelers: text(formData, "travelers") || 1,
      types: formData.getAll("types").length > 0 ? formData.getAll("types") : initialTypes,
      mode: text(formData, "mode") || "auto"
    });

    return {
      status: "success",
      message: "Варианты проверены",
      options: result.options,
      checkedAt: result.checkedAt,
      cache: result.cache,
      warnings: result.warnings
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ZodError ? "Проверьте маршрут, окно и число участников" : "Не удалось получить варианты",
      options: []
    };
  }
}
