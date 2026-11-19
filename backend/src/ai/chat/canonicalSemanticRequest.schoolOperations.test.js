import test from "node:test";
import assert from "node:assert/strict";
import { hasSchoolOperationsStatusCue } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";

const user = { id: 7, role: "COMPANY", companyId: 2, companyKind: "SCHOOL" };
const schoolOperations = {
  path: "/school/operations",
  label: "Okul Operasyon Paneli",
  role: "COMPANY",
  companyKind: "SCHOOL",
  selectedEntityType: "",
  selectedEntityId: null,
};

test("SCHOOL operations status questions remain product reads after final role-help composition", () => {
  const message = "Okul operasyon panelinde öğrenci servis durumu ne?";
  assert.equal(hasSchoolOperationsStatusCue(message, schoolOperations), true);
  const plan = resolveSemanticIntent({ message, user, screenContext: schoolOperations, conversationState: {} });
  assert.equal(plan.family, "ENTITY_LOOKUP");
  assert.equal(plan.typedRequest?.taskType, "FIELD_LOOKUP");
  assert.equal(plan.roleHelpIntent, false);
  assert.equal(plan.conversationRoute, "RETURN_TO_PRODUCT_TASK");
  assert.ok(plan.requestedDomains.includes("OPERATIONS"));
});
