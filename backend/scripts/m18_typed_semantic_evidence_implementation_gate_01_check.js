#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { verifyProvenanceReceipt } from "./lib/m18RunScopedProvenance.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const TASK_DIR = path.join(
  REPO_ROOT,
  ".superpowers",
  "sdd",
  "2026-10-01-m18-typed-semantic-evidence-implementation-plan",
);

const SPEC_PATH = path.join(
  REPO_ROOT,
  "docs",
  "superpowers",
  "specs",
  "2026-10-01-m18-typed-semantic-evidence-architecture-design.md",
);
const PLAN_PATH = path.join(
  REPO_ROOT,
  "docs",
  "superpowers",
  "plans",
  "2026-10-01-m18-typed-semantic-evidence-implementation-plan.md",
);
const RH_PATH = path.join(
  REPO_ROOT,
  "backend",
  "artifacts",
  "harness-topology",
  "m18-role-help-architecture-diagnostic-20261001.json",
);
const GI_PATH = path.join(
  REPO_ROOT,
  "backend",
  "artifacts",
  "harness-topology",
  "m18-typed-semantic-evidence-independent-diagnostic-20261001.json",
);
const FINAL_REPLAY_PATH = path.join(TASK_DIR, "task-12-final-residual-final-replay.json");
const TASK13_REVIEW_PATH = path.join(TASK_DIR, "task-13-review-package.md");
const TASK13_REPORT_PATH = path.join(TASK_DIR, "task-13-implementer-report.md");

const EXPECTED = Object.freeze({
  specHash: "A99F08E73D607E15D130856C0BB21CEBE4355E5DA3B293841444A12D7B2CADD7",
  planHash: "6D8B95508E97BCD2AC244C60FA806DAFB10E4E23998DD2FBA63B0A6F1B006A54",
  rhHash: "0400ED06D4596518CCAB60782D0FA0DD7370FA312141E48C750F9A6033664247",
  giHash: "A927300AC4C61196BD45B311CE905CC002D92C16D9B4A3F9D583CF57E9FAA950",
  wrapperHashes: Object.freeze({
    "backend/scripts/m18_semantic_evidence_service_01_check.mjs":
      "7CA9C2B929D3CF9E7BA16F4B3D0C083FE9F3C4FB30B3E55A9E392CB4492964F4",
    "backend/scripts/m18_semantic_evidence_browser_01_check.mjs":
      "1764290C47CA9665EE1A3CCB66CD18C493128978EAC480A3302F46448F377D92",
    "backend/scripts/m18_semantic_evidence_responsive_01_check.mjs":
      "80198828EF3C2D8643300D0601D9A3D595BD938C6D50B74A55BC7C1F0A0DC386",
  }),
});

const DIRECT_CHECKS = Object.freeze([
  ["E01", "backend/scripts/m18_run_e_e01_scope_precedence_regression_01_check.js"],
  ["F01", "backend/scripts/m18_run_f01_scope_precedence_regression_01_check.js"],
  ["G01", "backend/scripts/m18_run_g01_object_mapping_regression_01_check.js"],
  ["H03", "backend/scripts/m18_h03_basic_help_corrective_01_check.js"],
  ["I01", "backend/scripts/m18_run_i01_explain_view_navigate_contrastive_01_check.js"],
  ["J02", "backend/scripts/m18_run_j02_role_help_regression_01_check.js"],
  ["K02", "backend/scripts/m18_run_k02_role_concept_regression_01_check.js"],
  ["authority-switch", "backend/scripts/m18_semantic_authority_switch_01_check.js"],
  ["plan-only", "backend/scripts/m18_semantic_plan_only_01_check.js"],
  ["security", "backend/scripts/m18_semantic_security_boundary_01_check.js"],
]);

const REQUIRED_REPORTS = Object.freeze([
  "task-01-implementer-report.md",
  "task-02-implementer-report.md",
  "task-03-implementer-report.md",
  "task-04-implementer-report.md",
  "task-05-implementer-report.md",
  "task-06-implementer-report.md",
  "task-07-implementer-report.md",
  "task-08-implementer-report.md",
  "task-09-implementer-report.md",
  "task-10-implementer-report.md",
  "task-11-implementer-report.md",
  "task-13-implementer-report.md",
  "task-13-review-package.md",
]);

const SAFETY_FIELDS = Object.freeze([
  "businessWriteExecution",
  "draftCreation",
  "offerSend",
  "dispatchExecution",
  "financialWrite",
  "authorizationMutation",
  "externalLlmProviderCount",
  "externalLlmNetworkCallCount",
  "llmApiSecretCount",
]);

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hashMap(entries) {
  return Object.fromEntries(entries.map(([relativePath]) => [
    relativePath,
    sha256(path.join(REPO_ROOT, relativePath)),
  ]));
}

function runDirectCheck(name, relativePath) {
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, relativePath)], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW",
      },
      encoding: "utf8",
    timeout: 120000,
  });
  return {
    name,
    relativePath,
    exitCode: result.status,
    timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
    passed: result.status === 0 && !result.error,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
  };
}

function actionRow(replay, caseId) {
  return replay.rows.find((row) => row.caseId === caseId);
}

function collectFacts({ executeChecks = true } = {}) {
  const replay = readJson(FINAL_REPLAY_PATH);
  const task13Review = fs.readFileSync(TASK13_REVIEW_PATH, "utf8");
  const task13Report = fs.readFileSync(TASK13_REPORT_PATH, "utf8");
  const directChecks = executeChecks
    ? DIRECT_CHECKS.map(([name, relativePath]) => runDirectCheck(name, relativePath))
    : DIRECT_CHECKS.map(([name, relativePath]) => ({
      name, relativePath, exitCode: 0, timedOut: false, passed: true, output: "skipped for mutation control",
    }));
  const authorityRows = replay.rows.map((row) => row.actualCanonicalFields.authority);
  const safetyRows = replay.rows.map((row) => row.safetyCounters.evidence);

  return {
    hashes: {
      spec: sha256(SPEC_PATH),
      plan: sha256(PLAN_PATH),
      rh: sha256(RH_PATH),
      gi: sha256(GI_PATH),
      sources: Object.fromEntries(Object.keys(replay.sourceHashes).map((relativePath) => [
        relativePath,
        sha256(path.join(REPO_ROOT, relativePath)),
      ])),
      wrappers: hashMap(Object.entries(EXPECTED.wrapperHashes)),
    },
    replay,
    neg04: actionRow(replay, "NEG-04"),
    neg16: actionRow(replay, "NEG-16"),
    reports: {
      requiredPresent: REQUIRED_REPORTS.every((name) => fs.existsSync(path.join(TASK_DIR, name))),
      task13Review,
      task13Report,
    },
    task13Evidence: {
      service: task13Review.includes("| Service behavior | PASS |") &&
        task13Report.includes("Service wrapper exited"),
      browser: task13Review.includes("| Browser behavior | PASS |") &&
        task13Report.includes("Browser wrapper exited"),
      responsive: task13Review.includes("| Responsive behavior | PASS |") &&
        task13Report.includes("Responsive wrapper exited"),
      authorization: task13Report.includes("L01 direct canonical role/tenant cases") &&
        task13Review.includes("| Security/write policy | PASS |"),
      tenant: task13Report.includes("L01 direct canonical role/tenant cases"),
      grounding: task13Review.includes("| UI grounding | PASS |") &&
        task13Report.includes("guidedTarget.status=FOUND"),
      scope: task13Report.includes("No product source file was changed by this package.") &&
        task13Report.includes("No corpus or expectation was mutated."),
    },
    authorityRows,
    safetyRows,
    directChecks,
  };
}

function check(condition, code, failures) {
  if (!condition) failures.push(code);
}

export function evaluateImplementationReadiness({ reports, sourceIdentity, authorityMode, provenanceReceipt }) {
  const facts = { ...reports, hashes: sourceIdentity, authorityRows: authorityMode };
  const failures = [];
  const replay = facts.replay;
  const matrix = replay.confusionMatrix;
  const metrics = replay.metrics;
  const roles = Object.values(replay.roleBreakdown);
  const concepts = Object.values(replay.conceptBreakdown);
  const allAuthorityRows = facts.authorityRows;
  const allSafetyRows = facts.safetyRows;
  const review = facts.reports.task13Review;
  const report = facts.reports.task13Report;
  const tick = String.fromCharCode(96);

  if (provenanceReceipt !== undefined) {
    const receipt = provenanceReceipt?.receipt || provenanceReceipt;
    const provenance = verifyProvenanceReceipt({
      receiptBytes: receipt,
      expectedRunId: receipt?.runId,
      expectedStartSha256: receipt?.startManifestSha256,
      expectedEndSha256: receipt?.endManifestSha256,
    });
    check(provenance.safe && ['GREEN', 'PASS'].includes(String(receipt?.finalStatus || '').toUpperCase()), "PROVENANCE_RECEIPT_INVALID", failures);
  }

  check(facts.hashes.spec === EXPECTED.specHash, "SOURCE_MISMATCH_SPEC", failures);
  check(facts.hashes.plan === EXPECTED.planHash, "SOURCE_MISMATCH_PLAN", failures);
  check(facts.hashes.rh === EXPECTED.rhHash, "SOURCE_MISMATCH_RH", failures);
  check(facts.hashes.gi === EXPECTED.giHash, "SOURCE_MISMATCH_GI", failures);
  check(
    Object.entries(replay.sourceHashes).every(([relativePath, expectedHash]) =>
      facts.hashes.sources[relativePath] === expectedHash),
    "SOURCE_MISMATCH_PRODUCT",
    failures,
  );
  check(
    Object.entries(EXPECTED.wrapperHashes).every(([relativePath, expectedHash]) =>
      facts.hashes.wrappers[relativePath] === expectedHash),
    "SOURCE_MISMATCH_TASK13_WRAPPER",
    failures,
  );
  check(facts.reports.requiredPresent, "MISSING_REQUIRED_REPORT", failures);

  check(replay.total === 112 && replay.positive === 80 && replay.negative === 32, "MISSING_THRESHOLD_CORPUS", failures);
  check(matrix.tp === 80 && matrix.fn === 0 && matrix.fp === 0 && matrix.tn === 32, "MISSING_THRESHOLD_CONFUSION", failures);
  check(
    metrics.recall === 1 && metrics.precision === 1 && metrics.falsePositiveRate === 0 &&
      metrics.ambiguityRate === 0 && metrics.executionErrors === 0 &&
      metrics.crossRoleRecallSpread === 0,
    "MISSING_THRESHOLD_METRICS",
    failures,
  );
  check(
    roles.length === 8 && roles.every((entry) => entry.correct === entry.total && entry.recall === 1),
    "MISSING_THRESHOLD_ROLE",
    failures,
  );
  check(
    concepts.length === 9 && concepts.every((entry) => entry.correct === entry.total && entry.recall === 1),
    "MISSING_THRESHOLD_CONCEPT",
    failures,
  );
  check(replay.action.missingRequestMode.length === 0, "MISSING_THRESHOLD_REQUEST_MODE", failures);
  check(replay.action.uncheckable === 0, "MISSING_THRESHOLD_ACTION_UNCHECKABLE", failures);

  check(
    facts.neg04.actualCanonicalFields.requestMode === "COMPARE" &&
      facts.neg04.actualCanonicalFields.action === "COMPARE",
    "ACTION_REGRESSION_NEG04",
    failures,
  );
  check(
    facts.neg16.actualCanonicalFields.semanticScope === "OFF_TOPIC_GENUINE" &&
      facts.neg16.actualCanonicalFields.action === "NONE" &&
      facts.neg16.actualCanonicalFields.roleHelpIntent === false &&
      facts.neg16.actualCanonicalFields.object === null &&
      facts.neg16.actualCanonicalFields.resolution === "NOT_APPLICABLE",
    "ACTION_REGRESSION_NEG16",
    failures,
  );

  check(
    allAuthorityRows.length === 112 && allAuthorityRows.every((entry) =>
      entry.PER_REQUEST_SEMANTIC_AUTHORITY_COUNT === 1 &&
      entry.RUNTIME_SEMANTIC_FALLBACK_COUNT === 0 &&
      entry.SHADOW_SEMANTIC_AUTHORITY_COUNT === 0 &&
      entry.DUAL_SEMANTIC_AUTHORITY_COUNT === 0 &&
      entry.DOWNSTREAM_SEMANTIC_REDECISION_COUNT === 0),
    "DUAL_AUTHORITY",
    failures,
  );
  check(
    allAuthorityRows.every((entry) => entry.RUNTIME_SEMANTIC_FALLBACK_COUNT === 0),
    "RUNTIME_FALLBACK",
    failures,
  );
  check(
    allAuthorityRows.every((entry) => entry.DOWNSTREAM_SEMANTIC_REDECISION_COUNT === 0),
    "DOWNSTREAM_REDECISION",
    failures,
  );
  check(
    allSafetyRows.length === 112 && allSafetyRows.every((entry) =>
      SAFETY_FIELDS.every((field) => entry[field]?.observed === true && entry[field]?.value === 0)),
    "WRITE_OR_EXTERNAL_AI_REGRESSION",
    failures,
  );

  check(facts.task13Evidence.service, "TASK13_SERVICE_REGRESSION", failures);
  check(facts.task13Evidence.browser, "TASK13_BROWSER_REGRESSION", failures);
  check(facts.task13Evidence.responsive, "TASK13_RESPONSIVE_REGRESSION", failures);
  check(facts.task13Evidence.authorization, "AUTHORIZATION_REGRESSION", failures);
  check(facts.task13Evidence.tenant, "TENANT_REGRESSION", failures);
  check(facts.task13Evidence.grounding, "GROUNDING_REGRESSION", failures);
  check(review.includes("Critical findings: " + tick + "0" + tick), "TASK13_CRITICAL_FINDING", failures);
  check(review.includes("Important findings: " + tick + "0" + tick), "TASK13_IMPORTANT_FINDING", failures);
  check(facts.task13Evidence.scope, "TASK13_SCOPE_REGRESSION", failures);

  check(
    facts.directChecks.every((entry) => entry.passed),
    "DIRECT_REGRESSION_CHECK_FAILURE",
    failures,
  );

  return {
    status: failures.length === 0 ? "READY_FOR_SEPARATE_HUMAN_AUTHORIZATION" : "NOT_READY",
    failures,
    directChecks: facts.directChecks.map(({ name, relativePath, exitCode, timedOut, passed }) => ({
      name, relativePath, exitCode, timedOut, passed,
    })),
  };
}

function alteredFacts(facts, mutation) {
  const copy = structuredClone(facts);
  mutation(copy);
  return copy;
}

function runMutationControl(controlName, expectedFailure) {
  const facts = collectFacts({ executeChecks: false });
  const mutations = {
    "missing-threshold": (value) => { value.replay.confusionMatrix.fn = 1; },
    "dual-authority": (value) => { value.authorityRows[0].DUAL_SEMANTIC_AUTHORITY_COUNT = 1; },
    "runtime-fallback": (value) => { value.authorityRows[0].RUNTIME_SEMANTIC_FALLBACK_COUNT = 1; },
    "downstream-redecision": (value) => { value.authorityRows[0].DOWNSTREAM_SEMANTIC_REDECISION_COUNT = 1; },
    "action-regression": (value) => { value.neg04.actualCanonicalFields.action = "NONE"; },
    "authorization-regression": (value) => { value.task13Evidence.authorization = false; },
    "tenant-regression": (value) => { value.task13Evidence.tenant = false; },
    "grounding-regression": (value) => { value.task13Evidence.grounding = false; },
    "write-count": (value) => { value.safetyRows[0].businessWriteExecution.value = 1; },
    "external-ai-count": (value) => { value.safetyRows[0].externalLlmNetworkCallCount.value = 1; },
    "source-mismatch": (value) => { value.hashes.spec = "0".repeat(64); },
  };
  assert.ok(mutations[controlName], "Unknown Task 14 negative control: " + controlName);
  const mutated = alteredFacts(facts, mutations[controlName]);
  const result = evaluateImplementationReadiness({
    reports: mutated,
    sourceIdentity: mutated.hashes,
    authorityMode: mutated.authorityRows,
  });
  assert.equal(result.status, "NOT_READY");
  assert.ok(result.failures.includes(expectedFailure), result.failures.join(", "));
  console.log(JSON.stringify({ controlName, expectedFailure, result }, null, 2));
}

function normalRun() {
  const facts = collectFacts({ executeChecks: true });
  const result = evaluateImplementationReadiness({
    reports: facts,
    sourceIdentity: facts.hashes,
    authorityMode: facts.authorityRows,
  });
  assert.equal(result.status, "READY_FOR_SEPARATE_HUMAN_AUTHORIZATION", result.failures.join(", "));
  console.log(JSON.stringify({
    status: result.status,
    task14: "FINAL_ARCHITECTURE_IMPLEMENTATION_READINESS_GATE",
    directChecks: result.directChecks,
    task12: facts.replay.confusionMatrix,
    action: facts.replay.action,
  }, null, 2));
}

const control = process.argv.find((argument) => argument.startsWith("--control="));
if (control) {
  const controlName = control.slice("--control=".length);
  const expectedByControl = Object.freeze({
    "missing-threshold": "MISSING_THRESHOLD_CONFUSION",
    "dual-authority": "DUAL_AUTHORITY",
    "runtime-fallback": "RUNTIME_FALLBACK",
    "downstream-redecision": "DOWNSTREAM_REDECISION",
    "action-regression": "ACTION_REGRESSION_NEG04",
    "authorization-regression": "AUTHORIZATION_REGRESSION",
    "tenant-regression": "TENANT_REGRESSION",
    "grounding-regression": "GROUNDING_REGRESSION",
    "write-count": "WRITE_OR_EXTERNAL_AI_REGRESSION",
    "external-ai-count": "WRITE_OR_EXTERNAL_AI_REGRESSION",
    "source-mismatch": "SOURCE_MISMATCH_SPEC",
  });
  runMutationControl(controlName, expectedByControl[controlName]);
} else {
  normalRun();
}
