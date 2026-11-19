import test from "node:test";
import assert from "node:assert/strict";
import { resolveCommercialFlowRolePath } from "./commercialFlowNavigation.js";

test("commercial-flow actions stay inside the active role surface", () => {
  assert.equal(resolveCommercialFlowRolePath("/company/commercial-flow", "/shifts"), "/company/shifts");
  assert.equal(resolveCommercialFlowRolePath("/school/commercial-flow", "/shifts"), "/school/shifts");
  assert.equal(resolveCommercialFlowRolePath("/organization/commercial-flow", "/agreements?detail=bridge"), "/organization/agreements?detail=bridge");
});
