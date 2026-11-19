import test from "node:test";
import assert from "node:assert/strict";
import { selectGuidedReorderDraftShifts } from "./guidedPlanBulkReorder.js";

test("tekil rota sıralaması güncel sunucu taslağındaki durakları kullanır", () => {
  const stale = [{ id: 51, stops: [{ id: 1 }] }];
  const refreshed = [{ id: 51, stops: [{ id: 1 }, { id: 2 }] }];

  assert.deepEqual(
    selectGuidedReorderDraftShifts({ draftShifts: stale, refreshedDraftShifts: refreshed }),
    refreshed,
  );
});
