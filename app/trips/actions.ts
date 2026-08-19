"use server";

import { cookies } from "next/headers";

import { createTripService } from "@/lib/trips";
import { TRIP_STORAGE_KEY } from "@/lib/trips/constants";

export type TripActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  tripId?: string;
  participantId?: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createTripAction(
  _previousState: TripActionState,
  formData: FormData
): Promise<TripActionState> {
  try {
    const timezone = text(formData, "timezone") || "Europe/Moscow";
    const startsAt = new Date(`${text(formData, "startsAt")}T00:00:00+03:00`);
    const endsAt = new Date(`${text(formData, "endsAt")}T23:59:59+03:00`);
    const trip = await createTripService().createTrip({
      title: text(formData, "title"),
      timezone,
      startsAt,
      endsAt,
      owner: { displayName: text(formData, "displayName") }
    });
    (await cookies()).set(TRIP_STORAGE_KEY, trip.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
    return {
      status: "success",
      tripId: trip.id,
      participantId: trip.ownerId,
      message: "Поездка создана"
    };
  } catch {
    return { status: "error", message: "Проверьте название, даты и имя участника" };
  }
}

export async function joinTripAction(
  _previousState: TripActionState,
  formData: FormData
): Promise<TripActionState> {
  try {
    const trip = await createTripService().joinTrip({
      inviteCode: text(formData, "inviteCode"),
      participant: { displayName: text(formData, "displayName") }
    });
    (await cookies()).set(TRIP_STORAGE_KEY, trip.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
    const participant = trip.participants.at(-1);
    return {
      status: "success",
      tripId: trip.id,
      participantId: participant?.id,
      message: `Вы присоединились к поездке «${trip.title}»`
    };
  } catch {
    return { status: "error", message: "Поездка с таким кодом не найдена" };
  }
}
