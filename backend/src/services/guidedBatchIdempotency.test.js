import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGuidedBatchRequestHash,
  isGuidedBatchUniqueConflict,
  normalizeGuidedBatchIdempotencyKey,
} from "./guidedBatchIdempotency.js";

test("guided batch idempotency keys are required, trimmed and bounded", () => {
  assert.equal(normalizeGuidedBatchIdempotencyKey("  guided-1  "), "guided-1");
  assert.throws(() => normalizeGuidedBatchIdempotencyKey(""), (error) => error.code === "GUIDED_BATCH_IDEMPOTENCY_REQUIRED");
  assert.throws(() => normalizeGuidedBatchIdempotencyKey("x".repeat(161)), (error) => error.code === "GUIDED_BATCH_IDEMPOTENCY_REQUIRED");
  assert.throws(() => normalizeGuidedBatchIdempotencyKey("guided\n1"), (error) => error.code === "GUIDED_BATCH_IDEMPOTENCY_REQUIRED");
});

test("guided batch request hashes are stable for object key order", () => {
  const first = buildGuidedBatchRequestHash({
    actorUserId: 10,
    actorRole: "COMPANY",
    companyId: 1,
    items: [{ roomId: 2, startAt: "2026-11-15T08:00:00.000Z", stops: [] }],
  });
  const reordered = buildGuidedBatchRequestHash({
    companyId: 1,
    items: [{ stops: [], startAt: "2026-11-15T08:00:00.000Z", roomId: 2 }],
    actorRole: "COMPANY",
    actorUserId: 10,
  });
  const changed = buildGuidedBatchRequestHash({
    actorUserId: 10,
    actorRole: "COMPANY",
    companyId: 1,
    items: [{ roomId: 2, startAt: "2026-11-16T08:00:00.000Z", stops: [] }],
  });

  assert.equal(first, reordered);
  assert.notEqual(first, changed);
});

test("only the guided-batch unique constraint is treated as a replay race", () => {
  assert.equal(isGuidedBatchUniqueConflict({ code: "P2002", meta: { target: ["actorUserId", "companyId", "idempotencyKey"] } }), true);
  assert.equal(isGuidedBatchUniqueConflict({ code: "P2002", message: "GuidedBatchRequest unique constraint" }), true);
  assert.equal(isGuidedBatchUniqueConflict({ code: "P2002", meta: { target: ["email"] } }), false);
  assert.equal(isGuidedBatchUniqueConflict({ code: "P2025", meta: { target: ["idempotencyKey"] } }), false);
});
