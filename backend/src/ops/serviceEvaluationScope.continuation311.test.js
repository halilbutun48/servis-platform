import test from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_EVALUATION_BUYER_ROLES,
  canManageServiceEvaluation,
} from "./serviceEvaluationScope.js";

test("service evaluation accepts the three buyer roles and super admin only", () => {
  assert.deepEqual(SERVICE_EVALUATION_BUYER_ROLES, ["COMPANY", "SCHOOL", "ORGANIZATION", "SUPER_ADMIN"]);
  assert.equal(canManageServiceEvaluation("COMPANY"), true);
  assert.equal(canManageServiceEvaluation("SCHOOL"), true);
  assert.equal(canManageServiceEvaluation("ORGANIZATION"), true);
  assert.equal(canManageServiceEvaluation("SUPER_ADMIN"), true);
  assert.equal(canManageServiceEvaluation("ROOM"), false);
  assert.equal(canManageServiceEvaluation("DRIVER"), false);
  assert.equal(canManageServiceEvaluation("PARENT"), false);
});

test("service evaluation role matching is normalized and fails closed", () => {
  assert.equal(canManageServiceEvaluation(" school "), true);
  assert.equal(canManageServiceEvaluation(""), false);
  assert.equal(canManageServiceEvaluation(null), false);
});
