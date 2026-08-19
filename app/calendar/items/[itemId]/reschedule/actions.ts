"use server";

import { revalidatePath } from "next/cache";
import { createPostgresRescheduleEventRepository } from "@/lib/reschedule-event-repository";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export type RescheduleEventActionInput = {
  conflictId: string;
  eventId: string;
  actorParticipantId: string;
  title: string;
  locationName: string;
  startsAtLocal: string;
  endsAtLocal: string;
};

export async function rescheduleEventAction(input: RescheduleEventActionInput) {
  if (![input.eventId, input.actorParticipantId].every((value) => /^[0-9a-f-]{36}$/i.test(value))) {
    return { status: "error" as const, message: "Некорректный участник или событие." };
  }
  const tripId = await getCurrentTripId();
  const result = await createPostgresRescheduleEventRepository().reschedule({ ...input, tripId });
  if (result.status === "success") {
    revalidatePath("/calendar");
    revalidatePath("/audit");
    revalidatePath(`/calendar/items/${result.eventId}`);
    revalidatePath(`/conflicts/${input.conflictId}`);
  }
  return result;
}
