import type { CalendarItem } from "@/lib/calendar-repository";

export const MANUAL_CALENDAR_KEY = "tutu-okno:manual-calendar-items";

export type ManualCalendarItem = CalendarItem & {
  candidateId: string;
  bookingConfirmed: true;
  addedManuallyAt: string;
};

function isManualCalendarItem(value: unknown): value is ManualCalendarItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<ManualCalendarItem>;
  return (
    typeof item.id === "string" &&
    typeof item.candidateId === "string" &&
    typeof item.tripId === "string" &&
    item.type === "booking" &&
    item.status === "confirmed" &&
    typeof item.title === "string" &&
    typeof item.shortTitle === "string" &&
    typeof item.startsAt === "string" &&
    typeof item.endsAt === "string" &&
    Array.isArray(item.participantIds) &&
    item.participantIds.every((participantId) => typeof participantId === "string") &&
    item.source === "tutu" &&
    typeof item.href === "string" &&
    item.bookingConfirmed === true &&
    typeof item.addedManuallyAt === "string"
  );
}

export function readManualCalendarItems(): ManualCalendarItem[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(MANUAL_CALENDAR_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isManualCalendarItem) : [];
  } catch {
    return [];
  }
}

export function upsertManualCalendarItem(item: ManualCalendarItem) {
  const withoutDuplicate = readManualCalendarItems().filter(
    (savedItem) => savedItem.candidateId !== item.candidateId
  );
  window.localStorage.setItem(
    MANUAL_CALENDAR_KEY,
    JSON.stringify([...withoutDuplicate, item])
  );
}
