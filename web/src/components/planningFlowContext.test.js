import test from "node:test";
import assert from "node:assert/strict";
import { guidedPlanningCompletionPath, isGuidedPlanningContext, shouldOpenGuidedPlanningWorkspace } from "./planningFlowContext.js";

test("guided planning is visible for all three buyer contexts", () => {
  assert.equal(isGuidedPlanningContext("COMPANY"), true);
  assert.equal(isGuidedPlanningContext("SCHOOL"), true);
  assert.equal(isGuidedPlanningContext("ORGANIZATION"), true);
  assert.equal(isGuidedPlanningContext("ROOM"), false);
});

test("completed guided planning stays in the tenant route", () => {
  assert.equal(guidedPlanningCompletionPath({ companyKind: "" }), "/company/commercial-flow");
  assert.equal(guidedPlanningCompletionPath({ companyKind: "SCHOOL" }), "/school/commercial-flow");
  assert.equal(guidedPlanningCompletionPath({ companyKind: "ORGANIZATION" }), "/organization/commercial-flow");
});

test("buyer planning workspace is openable from the normal home surface", () => {
  assert.equal(shouldOpenGuidedPlanningWorkspace("COMPANY"), true);
  assert.equal(shouldOpenGuidedPlanningWorkspace("SCHOOL"), true);
  assert.equal(shouldOpenGuidedPlanningWorkspace("ORGANIZATION"), true);
  assert.equal(shouldOpenGuidedPlanningWorkspace("ROOM"), false);
});
