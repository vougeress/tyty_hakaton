import assert from "node:assert/strict";
import test from "node:test";
import { findFreeWindows } from "./free-windows";

const range = { startsAt: "2026-09-12T08:00:00+03:00", endsAt: "2026-09-12T22:00:00+03:00" };

test("finds 08:00–18:00 before a 19:00 event with a 60 minute buffer", () => {
  const windows = findFreeWindows([{ id: "concert", startsAt: "2026-09-12T19:00:00+03:00", endsAt: "2026-09-12T21:00:00+03:00" }], range, 60);
  assert.equal(windows[0]?.startsAt, "2026-09-12T05:00:00.000Z");
  assert.equal(windows[0]?.endsAt, "2026-09-12T15:00:00.000Z");
  assert.equal(windows[0]?.nextRequiredItemId, "concert");
});

test("sorts events and finds the gap between them", () => {
  const windows = findFreeWindows([
    { id: "late", startsAt: "2026-09-12T19:00:00+03:00", endsAt: "2026-09-12T20:00:00+03:00" },
    { id: "early", startsAt: "2026-09-12T08:00:00+03:00", endsAt: "2026-09-12T09:00:00+03:00" }
  ], range, 60);
  assert.ok(windows.some((window) => window.previousItemId === "early" && window.nextRequiredItemId === "late"));
});

test("does not create negative windows for overlapping events", () => {
  const windows = findFreeWindows([
    { id: "one", startsAt: "2026-09-12T10:00:00+03:00", endsAt: "2026-09-12T13:00:00+03:00" },
    { id: "two", startsAt: "2026-09-12T12:00:00+03:00", endsAt: "2026-09-12T14:00:00+03:00" }
  ], range, 30);
  assert.ok(windows.every((window) => Date.parse(window.endsAt) > Date.parse(window.startsAt)));
});

test("returns the whole trip when there are no events", () => {
  assert.deepEqual(findFreeWindows([], range, 60), [{
    startsAt: "2026-09-12T05:00:00.000Z",
    endsAt: "2026-09-12T19:00:00.000Z",
    previousItemId: undefined,
    bufferToNextEventMinutes: 0
  }]);
});

test("rejects a negative buffer", () => {
  assert.throws(() => findFreeWindows([], range, -1));
});
