export type RequiredCalendarItem = {
  id: string;
  startsAt: string;
  endsAt: string;
};

export type FreeWindow = {
  startsAt: string;
  endsAt: string;
  previousItemId?: string;
  nextRequiredItemId?: string;
  bufferToNextEventMinutes: number;
};

export function findFreeWindows(
  events: RequiredCalendarItem[],
  tripRange: { startsAt: string; endsAt: string },
  bufferMinutes: number
): FreeWindow[] {
  if (bufferMinutes < 0) throw new Error("bufferMinutes must be non-negative");
  const rangeStart = Date.parse(tripRange.startsAt);
  const rangeEnd = Date.parse(tripRange.endsAt);
  if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd) || rangeStart >= rangeEnd) return [];

  const sorted = events
    .map((event) => ({ ...event, start: Date.parse(event.startsAt), end: Date.parse(event.endsAt) }))
    .filter((event) => Number.isFinite(event.start) && Number.isFinite(event.end) && event.start <= event.end)
    .sort((a, b) => a.start - b.start);

  const windows: FreeWindow[] = [];
  let cursor = rangeStart;
  let previousItemId: string | undefined;

  for (const event of sorted) {
    if (event.end < rangeStart || event.start > rangeEnd) continue;
    const deadline = Math.min(event.start - bufferMinutes * 60_000, rangeEnd);
    if (deadline > cursor) {
      windows.push({
        startsAt: new Date(cursor).toISOString(),
        endsAt: new Date(deadline).toISOString(),
        previousItemId,
        nextRequiredItemId: event.id,
        bufferToNextEventMinutes: bufferMinutes
      });
    }
    cursor = Math.max(cursor, event.end);
    previousItemId = event.id;
  }

  if (cursor < rangeEnd) {
    windows.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(rangeEnd).toISOString(),
      previousItemId,
      bufferToNextEventMinutes: 0
    });
  }

  return windows;
}
