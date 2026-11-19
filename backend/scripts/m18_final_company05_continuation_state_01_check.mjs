#!/usr/bin/env node

import assert from "node:assert/strict";
import { decode } from "jsonwebtoken";
import { signToken } from "../src/auth/jwt.js";
import { extractCanonicalActual } from "./lib/m18HoldoutExecutionAdapter.mjs";
import { validateExecutionContext } from "./lib/m18HoldoutGovernance.mjs";

function checkUniqueAuthSessionClaim() {
  const payload = { userId: 880501, role: "COMPANY", sv: 1 };
  const first = decode(signToken(payload, { expiresIn: "7d" }));
  const second = decode(signToken(payload, { expiresIn: "7d" }));
  assert.ok(first?.jti, "access tokens expose a unique auth-session claim");
  assert.ok(second?.jti, "second access token exposes a unique auth-session claim");
  assert.notEqual(first.jti, second.jti, "same-second access tokens must not share conversation scope");
}

function checkContinuationTaskProjection() {
  const actual = extractCanonicalActual({
    semanticPlan: {
      family: "CONTINUE_CURRENT_REASONING",
      typedRequest: { taskType: "CONTINUE_CURRENT_REASONING" },
      authorizationDecision: { status: "ALLOW", authorizationStatus: "AUTHORIZED" },
      canonicalRequest: {
        request: {
          semanticScope: { class: "PRODUCT_CONTEXTUAL" },
          semanticAction: { actionClass: "CONTINUE", objectClass: "RECORD", resolutionStatus: "RESOLVED" },
          typedEvidence: { requestMode: { value: "EXPLAIN" }, reference: { value: "ABSENT" } },
          operation: "CONTINUE_EXPLANATION",
        },
      },
    },
  });
  assert.equal(actual.task, "CONTINUE_CURRENT_REASONING", "adapter preserves the typed continuation task");
}

function checkSelectedEntityContract() {
  const base = {
    source: "AUTHORIZED_PRODUCT_CATALOG",
    role: "COMPANY",
    tenantContext: { type: "COMPANY", companyKind: "COMPANY" },
    screen: null,
  };
  const genericRecord = validateExecutionContext({
    ...base,
    selectedEntity: { type: "RECORD", id: 84, tenantContextType: "COMPANY" },
  }, { role: "COMPANY", semanticScope: "PRODUCT_AMBIGUOUS" });
  assert.equal(genericRecord.safe, false, "generic RECORD is rejected when the runtime requires a concrete entity type");

  const concreteShift = validateExecutionContext({
    ...base,
    selectedEntity: { type: "SHIFT", id: 84, tenantContextType: "COMPANY" },
  }, { role: "COMPANY", semanticScope: "PRODUCT_AMBIGUOUS" });
  assert.equal(concreteShift.safe, true, "concrete SHIFT remains a valid selected entity context");
}

checkUniqueAuthSessionClaim();
checkContinuationTaskProjection();
checkSelectedEntityContract();
console.log("M18_FINAL_COMPANY05_CONTINUATION_STATE_CHECK=GREEN");
