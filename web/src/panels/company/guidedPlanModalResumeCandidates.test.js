import assert from "node:assert/strict";
import test from "node:test";
import { shouldDiscoverGuidedDraftCandidates } from "./guidedPlanModalHydration.js";

test("route refresh reopens the server-backed guided draft chooser", () => {
  assert.equal(
    shouldDiscoverGuidedDraftCandidates({ token: "authorized-token", routeRefreshMode: true }),
    true,
  );
});

test("guided draft discovery still requires an authorized session", () => {
  assert.equal(
    shouldDiscoverGuidedDraftCandidates({ token: "", routeRefreshMode: true }),
    false,
  );
});
