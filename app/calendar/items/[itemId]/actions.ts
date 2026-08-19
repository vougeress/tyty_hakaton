"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { events } from "@/db/schema";
import { getCurrentTripId } from "@/lib/trips/current-trip";

export async function deleteCalendarEventAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return;

  const tripId = await getCurrentTripId();
  const [deleted] = await getDatabase()
    .delete(events)
    .where(and(eq(events.id, eventId), eq(events.tripId, tripId)))
    .returning({ id: events.id });

  if (deleted) {
    revalidatePath("/calendar");
    revalidatePath(`/calendar/items/${eventId}`);
  }

  redirect("/calendar");
}
