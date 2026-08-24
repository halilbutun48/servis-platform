import path from "node:path";
import { fileURLToPath } from "node:url";
import { runStructuredScriptChain } from "./guardRunnerContracts.js";
import {
  assertImpactAwareValidationPlannerV1Shape,
  buildImpactAwareValidationPlannerV1,
} from "./impactAwareValidationPlannerV1.js";
import { productExtensionsChecks } from "./productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

export const IMPACT_AWARE_VALIDATION_EXECUTOR_V1_VERSION = "step-3-impact-aware-validation-executor";

export const IMPACT_AWARE_VALIDATION_EXECUTOR_V1_MODES = Object.freeze([
  "PLAN_ONLY",
  "FOCUSED",
  "FULL_CHAIN_REQUIRED",
]);

function normalizeMode(mode) {
  const value = String(mode == null ? "FOCUSED" : mode)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (value === "PLAN" || value === "PLAN_ONLY") {
    return "PLAN_ONLY";
  }
  if (value === "FOCUSED" || value === "FOCUSED_DRY_RUN") {
    return "FOCUSED";
  }
  if (value === "FULL_CHAIN" || value === "FULL_CHAIN_REQUIRED") {
    return "FULL_CHAIN_REQUIRED";
  }

  throw new Error(
    `FAIL impact aware validation executor v1: invalid mode ${String(mode)}`,
  );
}

function cloneCommand(command) {
  return Object.freeze([...command]);
}

function commandKey(command) {
  return JSON.stringify(command);
}

function parseCommandText(commandText) {
  const text = String(commandText || "").trim();
  if (!text) {
    return [];
  }

  const nodeMatch = text.match(/^node\s+(.+)$/i);
  if (nodeMatch) {
    return ["node", nodeMatch[1].trim().replace(/^["']|["']$/g, "")];
  }

  const npmMatch = text.match(/^npm\s+run\s+(.+)$/i);
  if (npmMatch) {
    return ["npm", "run", npmMatch[1].trim().replace(/^["']|["']$/g, "")];
  }

  return text.split(/\s+/).filter(Boolean);
}

function createStep({
  kind,
  id,
  script,
  command,
  origin,
  reason = null,
  checkId = null,
  productExtensionsStep = null,
}) {
  return Object.freeze({
    kind,
    id,
    script,
    command: cloneCommand(command),
    origin,
    reason,
    checkId,
    productExtensionsStep,
  });
}

function dedupeSteps(steps) {
  const out = [];
  const seen = new Set();
  let duplicateCount = 0;

  for (const step of steps) {
    const key = commandKey(step.command);
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(key);
    out.push(step);
  }

  return Object.freeze({
    steps: Object.freeze(out),
    duplicateCount,
  });
}

function buildProductExtensionStepMap(registry = productExtensionsChecks) {
  return new Map(registry.map((step) => [step.script, step]));
}

function buildFocusedCandidateSteps(plan, registry = productExtensionsChecks) {
  const byScript = buildProductExtensionStepMap(registry);
  const ordered = [];
  const unresolvedCandidateCheckIds = [];

  for (const step of registry) {
    if (!plan.candidateCheckIds.includes(step.script)) {
      continue;
    }

    ordered.push(
      createStep({
        kind: "PRODUCT_EXTENSION",
        id: step.id,
        script: step.script,
        command: step.command,
        origin: "candidate",
        checkId: step.script,
        productExtensionsStep: step.id,
      }),
    );
  }

  for (const checkId of plan.candidateCheckIds) {
    if (!byScript.has(checkId)) {
      unresolvedCandidateCheckIds.push(checkId);
    }
  }

  return Object.freeze({
    steps: Object.freeze(ordered),
    unresolvedCandidateCheckIds: Object.freeze([...new Set(unresolvedCandidateCheckIds)]),
  });
}

function buildFoundationSteps(plan) {
  const steps = [];

  for (const sentinel of plan.foundationSentinels || []) {
    steps.push(
      createStep({
        kind: "FOUNDATION_SENTINEL",
        id: sentinel.id,
        script: sentinel.command,
        command: parseCommandText(sentinel.command),
        origin: "foundation",
        reason: sentinel.reason,
      }),
    );
  }

  return Object.freeze(steps);
}

function buildSmokeRunnerSteps(plan) {
  const steps = [];

  for (const smoke of plan.smokeRunnerCommands || []) {
    steps.push(
      createStep({
        kind: "SMOKE_RUNNER",
        id: smoke.suite,
        script: smoke.command,
        command: parseCommandText(smoke.command),
        origin: "smoke",
      }),
    );
  }

  return Object.freeze(steps);
}

function buildReleaseChainSteps(plan, executionMode, requestedMode) {
  const steps = [];
  const releaseChains =
    Array.isArray(plan.releaseChains) && plan.releaseChains.length > 0
      ? plan.releaseChains
      : executionMode === "FULL_CHAIN_REQUIRED"
        ? ["npm run check:product-extensions"]
        : [];

  for (const releaseChain of releaseChains) {
    steps.push(
      createStep({
        kind: "RELEASE_CHAIN",
        id: releaseChain,
        script: releaseChain,
        command: parseCommandText(releaseChain),
        origin: "release",
        reason:
          executionMode === "FULL_CHAIN_REQUIRED" && releaseChains.length === 1
            ? requestedMode === "FULL_CHAIN_REQUIRED"
              ? "requested-full-chain-required"
              : "planner-full-chain-required"
            : null,
      }),
    );
  }

  return Object.freeze(steps);
}

function buildExecutionSelection(plan, requestedMode, registry) {
  const focusedCandidate = buildFocusedCandidateSteps(plan, registry);
  const foundationSteps = buildFoundationSteps(plan);
  const smokeRunnerSteps = buildSmokeRunnerSteps(plan);
  const focusedCombined = dedupeSteps([...foundationSteps, ...focusedCandidate.steps, ...smokeRunnerSteps]);
  const fallbackReasons = [];

  let executionMode = "FOCUSED";
  if (plan.confidence === "FAIL_CLOSED") {
    executionMode = "FULL_CHAIN_REQUIRED";
    fallbackReasons.push("planner-fail-closed");
  } else if (plan.fullChainRequired) {
    executionMode = "FULL_CHAIN_REQUIRED";
    fallbackReasons.push("planner-full-chain-required");
  } else if (focusedCandidate.unresolvedCandidateCheckIds.length > 0) {
    executionMode = "FULL_CHAIN_REQUIRED";
    fallbackReasons.push("unresolved-candidate-check-id");
  }

  if (requestedMode === "FULL_CHAIN_REQUIRED") {
    executionMode = "FULL_CHAIN_REQUIRED";
    fallbackReasons.push("requested-full-chain-required");
  }

  const releaseChainSteps = buildReleaseChainSteps(plan, executionMode, requestedMode);
  const selectedSteps = executionMode === "FULL_CHAIN_REQUIRED" ? releaseChainSteps : focusedCombined.steps;
  const selection = Object.freeze({
    focusedCandidateSteps: focusedCandidate.steps,
    focusedCandidateCount: focusedCandidate.steps.length,
    focusedFoundationSteps: foundationSteps,
    focusedFoundationCount: foundationSteps.length,
    focusedSmokeRunnerSteps: smokeRunnerSteps,
    focusedSmokeRunnerCount: smokeRunnerSteps.length,
    focusedDuplicateCommandCount: focusedCombined.duplicateCount,
    focusedSelectedSteps: focusedCombined.steps,
    focusedSelectedCount: focusedCombined.steps.length,
    releaseChainSteps,
    releaseChainCount: releaseChainSteps.length,
    selectedSteps: Object.freeze(selectedSteps),
    selectedStepCount: selectedSteps.length,
    selectedCommandCount: selectedSteps.length,
    unresolvedCandidateCheckIds: focusedCandidate.unresolvedCandidateCheckIds,
    unresolvedCandidateCheckIdCount: focusedCandidate.unresolvedCandidateCheckIds.length,
    fallbackReasons: Object.freeze([...new Set(fallbackReasons)]),
    fallbackReasonCount: [...new Set(fallbackReasons)].length,
  });

  return Object.freeze({
    requestedMode,
    executionMode,
    selection,
  });
}

function assertNoShaFields(value, label) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertNoShaFields(item, `${label}[${index}]`);
    }
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (/sha/i.test(key)) {
      throw new Error(`FAIL ${label}: sha field is forbidden (${key})`);
    }
    assertNoShaFields(nestedValue, `${label}.${key}`);
  }
}

function assertStepShape(step, label) {
  if (!step || typeof step !== "object" || Array.isArray(step)) {
    throw new Error(`FAIL ${label}: step is not an object`);
  }

  if (!step.kind || typeof step.kind !== "string") {
    throw new Error(`FAIL ${label}: missing kind`);
  }
  if (!step.id || typeof step.id !== "string") {
    throw new Error(`FAIL ${label}: missing id`);
  }
  if (!step.script || typeof step.script !== "string") {
    throw new Error(`FAIL ${label}: missing script`);
  }
  if (!Array.isArray(step.command) || step.command.length === 0) {
    throw new Error(`FAIL ${label}: command is not an array`);
  }
  if (!step.origin || typeof step.origin !== "string") {
    throw new Error(`FAIL ${label}: missing origin`);
  }
  if (step.reason != null && typeof step.reason !== "string") {
    throw new Error(`FAIL ${label}: invalid reason`);
  }
  if (step.checkId != null && typeof step.checkId !== "string") {
    throw new Error(`FAIL ${label}: invalid checkId`);
  }
  if (step.productExtensionsStep != null && typeof step.productExtensionsStep !== "string") {
    throw new Error(`FAIL ${label}: invalid productExtensionsStep`);
  }
}

export function assertImpactAwareValidationExecutorV1Shape(plan, label = "impact aware validation executor v1") {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new Error(`FAIL ${label}: plan is not an object`);
  }

  if (!IMPACT_AWARE_VALIDATION_EXECUTOR_V1_MODES.includes(plan.requestedMode)) {
    throw new Error(`FAIL ${label}: invalid requestedMode ${String(plan.requestedMode)}`);
  }
  if (!IMPACT_AWARE_VALIDATION_EXECUTOR_V1_MODES.includes(plan.executionMode)) {
    throw new Error(`FAIL ${label}: invalid executionMode ${String(plan.executionMode)}`);
  }
  if (!plan.planner || typeof plan.planner !== "object" || Array.isArray(plan.planner)) {
    throw new Error(`FAIL ${label}: planner is not an object`);
  }
  if (!plan.selection || typeof plan.selection !== "object" || Array.isArray(plan.selection)) {
    throw new Error(`FAIL ${label}: selection is not an object`);
  }
  if (!Array.isArray(plan.changedPaths)) {
    throw new Error(`FAIL ${label}: changedPaths is not an array`);
  }
  if (!Array.isArray(plan.selectedSteps)) {
    throw new Error(`FAIL ${label}: selectedSteps is not an array`);
  }
  if (!Array.isArray(plan.fallbackReasons)) {
    throw new Error(`FAIL ${label}: fallbackReasons is not an array`);
  }
  if (!Array.isArray(plan.unresolvedCandidateCheckIds)) {
    throw new Error(`FAIL ${label}: unresolvedCandidateCheckIds is not an array`);
  }

  assertNoShaFields(plan, label);
  assertImpactAwareValidationPlannerV1Shape(plan.planner, `${label}.planner`);

  const selection = plan.selection;
  if (!Array.isArray(selection.focusedCandidateSteps)) {
    throw new Error(`FAIL ${label}: focusedCandidateSteps is not an array`);
  }
  if (!Array.isArray(selection.focusedFoundationSteps)) {
    throw new Error(`FAIL ${label}: focusedFoundationSteps is not an array`);
  }
  if (!Array.isArray(selection.focusedSmokeRunnerSteps)) {
    throw new Error(`FAIL ${label}: focusedSmokeRunnerSteps is not an array`);
  }
  if (!Array.isArray(selection.focusedSelectedSteps)) {
    throw new Error(`FAIL ${label}: focusedSelectedSteps is not an array`);
  }
  if (!Array.isArray(selection.releaseChainSteps)) {
    throw new Error(`FAIL ${label}: releaseChainSteps is not an array`);
  }
  if (!Array.isArray(selection.selectedSteps)) {
    throw new Error(`FAIL ${label}: selectedSteps is not an array`);
  }
  if (!Array.isArray(selection.unresolvedCandidateCheckIds)) {
    throw new Error(`FAIL ${label}: unresolvedCandidateCheckIds is not an array`);
  }
  if (!Array.isArray(selection.fallbackReasons)) {
    throw new Error(`FAIL ${label}: fallbackReasons is not an array`);
  }

  for (const [index, step] of selection.focusedCandidateSteps.entries()) {
    assertStepShape(step, `${label}.selection.focusedCandidateSteps[${index}]`);
  }
  for (const [index, step] of selection.focusedFoundationSteps.entries()) {
    assertStepShape(step, `${label}.selection.focusedFoundationSteps[${index}]`);
  }
  for (const [index, step] of selection.focusedSmokeRunnerSteps.entries()) {
    assertStepShape(step, `${label}.selection.focusedSmokeRunnerSteps[${index}]`);
  }
  for (const [index, step] of selection.focusedSelectedSteps.entries()) {
    assertStepShape(step, `${label}.selection.focusedSelectedSteps[${index}]`);
  }
  for (const [index, step] of selection.releaseChainSteps.entries()) {
    assertStepShape(step, `${label}.selection.releaseChainSteps[${index}]`);
  }
  for (const [index, step] of selection.selectedSteps.entries()) {
    assertStepShape(step, `${label}.selection.selectedSteps[${index}]`);
  }

  if (selection.selectedStepCount !== selection.selectedSteps.length) {
    throw new Error(`FAIL ${label}: selectedStepCount mismatch`);
  }
  if (selection.selectedCommandCount !== selection.selectedSteps.length) {
    throw new Error(`FAIL ${label}: selectedCommandCount mismatch`);
  }
  if (selection.focusedSelectedCount !== selection.focusedSelectedSteps.length) {
    throw new Error(`FAIL ${label}: focusedSelectedCount mismatch`);
  }
  if (selection.releaseChainCount !== selection.releaseChainSteps.length) {
    throw new Error(`FAIL ${label}: releaseChainCount mismatch`);
  }
  if (selection.focusedDuplicateCommandCount < 0) {
    throw new Error(`FAIL ${label}: focusedDuplicateCommandCount is negative`);
  }
  if (selection.unresolvedCandidateCheckIdCount !== selection.unresolvedCandidateCheckIds.length) {
    throw new Error(`FAIL ${label}: unresolvedCandidateCheckIdCount mismatch`);
  }
  if (selection.fallbackReasonCount !== selection.fallbackReasons.length) {
    throw new Error(`FAIL ${label}: fallbackReasonCount mismatch`);
  }
  if (plan.selectedStepCount !== selection.selectedStepCount) {
    throw new Error(`FAIL ${label}: top-level selectedStepCount mismatch`);
  }
  if (plan.selectedCommandCount !== selection.selectedCommandCount) {
    throw new Error(`FAIL ${label}: top-level selectedCommandCount mismatch`);
  }
  if (plan.focusedSelectedCount !== selection.focusedSelectedCount) {
    throw new Error(`FAIL ${label}: top-level focusedSelectedCount mismatch`);
  }
  if (plan.focusedDuplicateCommandCount !== selection.focusedDuplicateCommandCount) {
    throw new Error(`FAIL ${label}: top-level focusedDuplicateCommandCount mismatch`);
  }
  if (plan.fallbackReasonCount !== selection.fallbackReasonCount) {
    throw new Error(`FAIL ${label}: top-level fallbackReasonCount mismatch`);
  }
  if (plan.unresolvedCandidateCheckIdCount !== selection.unresolvedCandidateCheckIdCount) {
    throw new Error(`FAIL ${label}: top-level unresolvedCandidateCheckIdCount mismatch`);
  }

  if (plan.requestedMode === "PLAN_ONLY" && plan.executionMode === "PLAN_ONLY") {
    throw new Error(`FAIL ${label}: PLAN_ONLY must still derive a deterministic execution mode preview`);
  }
  if (plan.requestedMode !== "PLAN_ONLY" && plan.executionMode === "PLAN_ONLY") {
    throw new Error(`FAIL ${label}: non-plan mode cannot execute as plan only`);
  }

  return Object.freeze(plan);
}

export function buildImpactAwareValidationExecutionPlanV1(
  changedPaths = [],
  { mode = "FOCUSED", registryRecords = null, productExtensionsRegistry = productExtensionsChecks } = {},
) {
  const requestedMode = normalizeMode(mode);
  const planner = buildImpactAwareValidationPlannerV1(changedPaths, { registryRecords });
  assertImpactAwareValidationPlannerV1Shape(planner, "impact aware validation planner from executor");

  const execution = buildExecutionSelection(planner, requestedMode, productExtensionsRegistry);
  const selection = execution.selection;
  return Object.freeze({
    version: IMPACT_AWARE_VALIDATION_EXECUTOR_V1_VERSION,
    requestedMode,
    executionMode: execution.executionMode,
    changedPaths: planner.changedPaths,
    planner,
    selection,
    selectedSteps: selection.selectedSteps,
    selectedStepCount: selection.selectedStepCount,
    selectedCommandCount: selection.selectedCommandCount,
    focusedCandidateSteps: selection.focusedCandidateSteps,
    focusedCandidateCount: selection.focusedCandidateCount,
    focusedFoundationSteps: selection.focusedFoundationSteps,
    focusedFoundationCount: selection.focusedFoundationCount,
    focusedSmokeRunnerSteps: selection.focusedSmokeRunnerSteps,
    focusedSmokeRunnerCount: selection.focusedSmokeRunnerCount,
    focusedSelectedCount: selection.focusedSelectedCount,
    focusedDuplicateCommandCount: selection.focusedDuplicateCommandCount,
    focusedSelectedSteps: selection.focusedSelectedSteps,
    releaseChainSteps: selection.releaseChainSteps,
    releaseChainCount: selection.releaseChainCount,
    fallbackReasons: selection.fallbackReasons,
    fallbackReasonCount: selection.fallbackReasonCount,
    unresolvedCandidateCheckIds: selection.unresolvedCandidateCheckIds,
    unresolvedCandidateCheckIdCount: selection.unresolvedCandidateCheckIdCount,
    summary: Object.freeze({
      requestedMode,
      executionMode: execution.executionMode,
      changedPathCount: planner.summary.changedPathCount,
      planCount: planner.summary.planCount,
      candidateCheckCount: planner.summary.candidateCheckCount,
      globalCheckCount: planner.summary.globalCheckCount,
      domainCheckCount: planner.summary.domainCheckCount,
      mixedCheckCount: planner.summary.mixedCheckCount,
      foundationCheckCount: planner.summary.foundationCheckCount,
      foundationSentinelCount: planner.summary.foundationSentinelCount,
      smokeSuiteCount: planner.summary.smokeSuiteCount,
      releaseChainCount: planner.summary.releaseChainCount,
      selectedStepCount: selection.selectedStepCount,
      focusedSelectedCount: selection.focusedSelectedCount,
      fallbackReasonCount: selection.fallbackReasonCount,
      unresolvedCandidateCheckIdCount: selection.unresolvedCandidateCheckIdCount,
    }),
  });
}

export async function runImpactAwareValidationV1(
  changedPaths = [],
  { mode = "FOCUSED", registryRecords = null, productExtensionsRegistry = productExtensionsChecks, label = null } = {},
) {
  const plan = buildImpactAwareValidationExecutionPlanV1(changedPaths, {
    mode,
    registryRecords,
    productExtensionsRegistry,
  });

  if (plan.requestedMode === "PLAN_ONLY") {
    return Object.freeze({
      ...plan,
      executed: false,
      exitCode: 0,
      stepsRun: Object.freeze([]),
    });
  }

  const runLabel = label || `IMPACT AWARE VALIDATION ${plan.executionMode}`;
  const exitCode = await runStructuredScriptChain(plan.selection.selectedSteps, { cwd: repoRoot, label: runLabel });
  return Object.freeze({
    ...plan,
    executed: true,
    exitCode,
    stepsRun: plan.selection.selectedSteps,
  });
}
