#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  assertGatePolicyProjectionV1,
  buildGatePolicyProjectionV1,
} from "./lib/checkOwnershipRegistryV1.js";

const projection = buildGatePolicyProjectionV1();
assertGatePolicyProjectionV1(projection);

assert.equal(projection.ownerCount, 1, "one canonical policy owner projects every active gate");
assert.equal(projection.knownScriptTotal, 1048, "projection consumes the frozen known-script total");
assert.equal(projection.activeGateCandidateCount, projection.calibrationTargetCount, "every active known candidate is classified");
assert.equal(projection.unresolvedClassificationCount, 0, "no target has an unresolved class");
assert.equal(projection.unknownOwnerCount, 0, "no target has an unknown owner");
assert.equal(projection.entries.every((entry) => ["CLASS_1_FOUNDATION_SECURITY", "CLASS_2_PRODUCT_QUALITY", "CLASS_3_ADVISORY_OWNER_REVIEW"].includes(entry.class)), true, "every entry has exactly one approved class");
assert.equal(projection.entries.some((entry) => entry.gateId === "check:securitykvkkfinal01" && entry.class === "CLASS_1_FOUNDATION_SECURITY"), true, "KVKK remains a class-1 hard blocker");
assert.equal(projection.entries.some((entry) => entry.gateId === "check:ai03bsemanticvisiblelivematrix01" && entry.class === "CLASS_2_PRODUCT_QUALITY"), true, "semantic matrix remains a class-2 closure blocker");
assert.equal(projection.entries.some((entry) => entry.gateId === "check:docsstate01" && entry.class === "CLASS_3_ADVISORY_OWNER_REVIEW"), true, "documentation traceability is not mislabeled as security");
assert.equal(projection.entries.every((entry) => entry.cleanTreePolicy), true, "every owner has an explicit clean-tree policy");
assert.equal(projection.entries.every((entry) => entry.sourceFamily), true, "every owner has an explicit source family");

const currentHeadCheck = fs.readFileSync("backend/scripts/current_head_scope_policy_01_check.js", "utf8");
assert.match(currentHeadCheck, /assertGatePolicyProjectionV1/u, "the existing current-head owner consumes the one policy projection");

console.log(JSON.stringify({
  GATE_POLICY_PROJECTION_CASES: 12,
  GATE_POLICY_PROJECTION_PASS: 12,
  GATE_POLICY_PROJECTION_FAIL: 0,
  KNOWN_SCRIPT_TOTAL: projection.knownScriptTotal,
  CALIBRATION_TARGET_COUNT: projection.calibrationTargetCount,
  CLASS1_GATE_COUNT: projection.classCounts.CLASS_1_FOUNDATION_SECURITY,
  CLASS2_GATE_COUNT: projection.classCounts.CLASS_2_PRODUCT_QUALITY,
  CLASS3_GATE_COUNT: projection.classCounts.CLASS_3_ADVISORY_OWNER_REVIEW,
}, null, 2));
