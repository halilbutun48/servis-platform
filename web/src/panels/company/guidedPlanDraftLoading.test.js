import assert from "node:assert/strict";
import test from "node:test";

import { guidedResumeDraftsEndpoint, selectGuidedResumeDrafts } from "./guidedPlanDraftLoading.js";

test("guided resume refresh uses the server-backed draft endpoint", () => {
  assert.equal(guidedResumeDraftsEndpoint(), "/api/shifts/guided-drafts");
});

test("guided resume refresh keeps the canonical draft stops", () => {
  const items = [
    { id: 31, status: "DRAFT", stops: [{ id: 501 }, { id: 502 }] },
    { id: 61, status: "APPROVED", stops: [] },
  ];

  assert.deepEqual(selectGuidedResumeDrafts(items, [31]), [items[0]]);
});
