import assert from "node:assert/strict";
import test from "node:test";
import { mockConflictRepository } from "./conflict-repository";

test("returns the linked schedule conflict with an explainable buffer deficit", async () => {
  const conflict = await mockConflictRepository.getConflict("schedule-shift");

  assert.ok(conflict);
  assert.equal(conflict.presetId, "conflict.schedule_changed");
  assert.equal(conflict.logisticsStatus, "blocking");
  assert.equal(conflict.reason.code, "RETURN_BUFFER_TOO_SMALL");
  assert.equal(conflict.actualBufferMinutes, 20);
  assert.equal(conflict.requiredBufferMinutes, 45);
  assert.match(conflict.reason.summary, /19:10/);
  assert.match(conflict.reason.summary, /19:30/);
  assert.equal(conflict.relatedEvents.length, 4);
});

test("keeps conflict actions separate from voting persistence", async () => {
  const conflict = await mockConflictRepository.getConflict("schedule-shift");

  assert.ok(conflict);
  assert.equal(conflict.links.poll, "/polls/demo-poll");
  assert.equal(conflict.links.alternatives, "/calendar/gaps/demo-gap/ideas");
  assert.equal(conflict.links.adjustTime, "/calendar/gaps/demo-gap/manual?conflictId=schedule-shift&candidateId=sviyazhsk");
  assert.match(conflict.votesNotice, /Ответы участников сохранены/);
});

test("returns null for an unknown conflict id", async () => {
  assert.equal(await mockConflictRepository.getConflict("missing"), null);
});
