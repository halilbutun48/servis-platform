import assert from "node:assert/strict";
import test from "node:test";

import { buildGuidedResumeStopSyncPlan } from "./guidedPlanResumeStops.js";

test("resumed organization draft syncs edited stops and appends new destinations without recreating the shift", () => {
  const plan = buildGuidedResumeStopSyncPlan({
    shiftId: 53,
    currentStops: [
      { id: 501, name: "Eski hedef", lat: 41.01, lng: 29.01, order: 1 },
    ],
    destinations: [
      { title: "Güncel hedef", lat: "41.011", lng: "29.011" },
      { title: "İkinci DEMO hedef", lat: "41.012", lng: "29.014" },
    ],
  });

  assert.deepEqual(plan, {
    shiftId: 53,
    updates: [
      { stopId: 501, name: "Güncel hedef", lat: 41.011, lng: 29.011, order: 1, type: "MANUAL" },
    ],
    additions: [
      { name: "İkinci DEMO hedef", lat: 41.012, lng: 29.014, order: 2, type: "MANUAL" },
    ],
  });
});

test("resume stop sync ignores incomplete destinations and duplicate no-op values", () => {
  const plan = buildGuidedResumeStopSyncPlan({
    shiftId: 9,
    currentStops: [{ id: 90, name: "A", lat: 41.01, lng: 29.01, order: 1, type: "MANUAL" }],
    destinations: [
      { title: "A", lat: "41.01", lng: "29.01" },
      { title: "Eksik", lat: "", lng: "29.02" },
      { title: "", lat: "41.03", lng: "29.03" },
    ],
  });

  assert.deepEqual(plan, { shiftId: 9, updates: [], additions: [] });
});
