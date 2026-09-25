import assert from "node:assert/strict";

import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import * as runner from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";

const cases = [];
function test(name, run) { cases.push({ name, run }); }
function requiredFunction(owner, name) {
  assert.equal(typeof owner[name], "function", `${name} must be implemented by the authoritative runtime`);
  return owner[name];
}

const inViewportDiagnostic = {
  STABILITY_COMPLETE: true,
  FAILED_STABILITY_COMPONENT: null,
  PHYSICAL_FAILURE_CLASS: "LEGITIMATE_DESCENDANT_HIT",
  TARGET_HIT_TEST: true,
  CENTER_POINT_IN_VIEWPORT: true,
  RECT_INTERSECTS_VIEWPORT: true,
  SCROLL_CONTAINER_TYPE: "NESTED",
  TARGET_RECT: { x: 36, y: 640, width: 167, height: 44 },
  VIEWPORT: { width: 1440, height: 900 },
};

const offscreenDiagnostic = {
  STABILITY_COMPLETE: false,
  FAILED_STABILITY_COMPONENT: "CENTER_OUTSIDE_VIEWPORT",
  PHYSICAL_FAILURE_CLASS: "NESTED_SCROLL_OFFSCREEN",
  TARGET_HIT_TEST: false,
  CENTER_POINT_IN_VIEWPORT: false,
  RECT_INTERSECTS_VIEWPORT: false,
  SCROLL_CONTAINER_TYPE: "NESTED",
  TARGET_RECT: { x: 36, y: 1141, width: 167, height: 66 },
  VIEWPORT: { width: 1440, height: 900 },
};

function rootFacts() {
  return {
    ROOT: "PREHIT-S1",
    AUTH_READY: true,
    ROUTE_READY: true,
    PREMATURE_HISTORICAL_STEP_REPLAY: false,
    cleared: true,
  };
}

function terminalInput(overrides = {}) {
  return {
    ROUTE_PREPARED: true,
    SURFACE_STATE_PREPARED: true,
    SEMANTIC_ACTION_RESOLVED: true,
    BUSINESS_TARGET_RESOLVED: true,
    CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: true,
    LOCATOR_DERIVED_FROM_CURRENT_CANDIDATE: true,
    ACTIONABILITY_PROVEN: true,
    VIEWPORT_REPRESENTATION_MATCH: true,
    OVERLAY_CONTAINMENT_PROVEN: true,
    CANDIDATE_COUNT: 1,
    CURRENT_CANDIDATE_SELECTED: true,
    SAFETY_CLASS: "SAFE",
    ACTION_EXECUTION_CLASS: "SAFE_ACTION_DISPATCH_SUCCEEDED",
    ACTION_ATTEMPTED: true,
    ACTION_DISPATCH_STARTED: true,
    ACTION_DISPATCH_SUCCEEDED: true,
    ACTION_DISPATCH_FAILED: false,
    RAW_HARNESS_FAILURE: false,
    UNSAFE_MUTATION_EXECUTED: false,
    EXPECTED_DISABLED: false,
    POST_ACTION_OBSERVER_VALID: true,
    EXPECTED_EFFECT_OBSERVED: true,
    EXPECTED_EFFECT_ABSENT: false,
    ORIGINAL_ROOT_FACTS: rootFacts(),
    ...overrides,
  };
}

function fakePreparation({ finalStable = true } = {}) {
  const events = [];
  const lifecycle = {};
  const initialMeta = { id: "initial", executionContext: { overlayScope: "NONE" } };
  const freshMeta = { id: "fresh", executionContext: { overlayScope: "NONE" } };
  const initialTarget = {
    async scrollIntoViewIfNeeded(options) {
      events.push(`scroll:${options.force === true ? "force" : "normal"}`);
    },
  };
  const freshTarget = {};
  let targetResolutionCount = 0;
  let stabilityCount = 0;
  return {
    events,
    lifecycle,
    args: {
      page: {},
      surface: { route: "/room/agreements" },
      historicalMeta: { materialState: {}, action: { name: "Geri Bildirim" } },
      currentMeta: initialMeta,
      lifecycle,
      adapters: {
        async targetForCurrentMeta(_page, meta) {
          targetResolutionCount += 1;
          events.push(`target:${meta.id}`);
          return meta === initialMeta
            ? {
              loc: initialTarget,
              observed: { owner: "initial" },
              physicalIdentity: { SEMANTIC_IDENTITY: { candidateKey: "true-open54-fixture", role: "button", name: "Geri Bildirim", owner: { type: "card", label: "fixture" }, dataTestId: "fixture-target", tag: "BUTTON" } },
            }
            : {
              loc: freshTarget,
              observed: { owner: "fresh" },
              physicalIdentity: { SEMANTIC_IDENTITY: { candidateKey: "true-open54-fixture", role: "button", name: "Geri Bildirim", owner: { type: "card", label: "fixture" }, dataTestId: "fixture-target", tag: "BUTTON" } },
            };
        },
        async waitForSemanticStability() {
          stabilityCount += 1;
          events.push(stabilityCount === 1 ? "stability:pre" : "stability:post");
          if (stabilityCount === 1) return { ok: false, diagnostic: offscreenDiagnostic, completion: { requiredEvidence: ["TARGET_HIT_TEST"] } };
          return finalStable
            ? { ok: true, diagnostic: inViewportDiagnostic, completion: { complete: true, requiredEvidence: ["TARGET_HIT_TEST"] } }
            : { ok: false, diagnostic: offscreenDiagnostic, completion: { complete: false, requiredEvidence: ["TARGET_HIT_TEST"] } };
        },
        async resolveFreshSemanticAction() {
          events.push("resolve:fresh");
          return freshMeta;
        },
      },
    },
    counts: () => ({ targetResolutionCount, stabilityCount }),
  };
}

test("RED-1 offscreen nested-scroll geometry requests deterministic preparation", () => {
  const plan = requiredFunction(hybrid, "planPreActionGeometryPreparation")({ diagnostic: offscreenDiagnostic });
  assert.equal(plan.strategy, "SCROLL_CURRENT_CANDIDATE_AND_RERESOLVE");
});

test("RED-2 scroll preparation precedes the final center hit-test", async () => {
  const fixture = fakePreparation();
  await requiredFunction(runner, "prepareCurrentSemanticTargetForAction")(fixture.args);
  assert.deepEqual(fixture.events, ["target:initial", "stability:pre", "scroll:normal", "resolve:fresh", "target:fresh", "stability:post"]);
});

test("RED-3 post-scroll geometry replaces pre-scroll geometry as final proof", async () => {
  const fixture = fakePreparation();
  const prepared = await requiredFunction(runner, "prepareCurrentSemanticTargetForAction")(fixture.args);
  assert.equal(prepared.stabilityDiagnostic, inViewportDiagnostic);
  assert.equal(fixture.lifecycle.POST_SCROLL_GEOMETRY_REFRESHED, true);
  assert.equal(fixture.lifecycle.FINAL_HIT_TEST_AFTER_SCROLL_PREPARATION, true);
});

test("RED-4 unresolved offscreen geometry remains a pre-dispatch harness failure", async () => {
  const fixture = fakePreparation({ finalStable: false });
  await assert.rejects(
    () => requiredFunction(runner, "prepareCurrentSemanticTargetForAction")(fixture.args),
    /POST_SCROLL_SEMANTIC_STABILITY_NOT_PROVEN/u,
  );
  assert.equal(fixture.lifecycle.ACTIONABILITY_PROVEN, false);
  assert.equal(fixture.lifecycle.ACTION_DISPATCH_STARTED, false);
});

test("RED-5 legacy actionAttempted is not accepted as dispatch proof", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    ACTION_ATTEMPTED: true,
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: false,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.equal(result.REASON_CODE, "ACTION_DISPATCH_NOT_PROVEN");
});

test("RED-6 terminal adapter preserves a pre-click no-dispatch state", () => {
  const input = requiredFunction(runner, "toRoomTrueOpen54TerminalInput")({
    row: { SAFETY_CLASS: "SAFE", PREHIT_ROOT: "PREHIT-S1", VIEWPORT: "desktop" },
    surface: { viewport: "desktop" },
    recipe: { routeReadiness: { ready: true }, originalRootInputs: { authReady: true, routeReady: true, prematureHistoricalStepReplay: false } },
    action: {
      executionState: "HARNESS_FAILURE",
      classification: "HARNESS_DEFECT",
      visible: true,
      enabled: true,
      actionAttempted: true,
      ACTIONABILITY_PROVEN: false,
      ACTION_DISPATCH_STARTED: false,
      ACTION_DISPATCH_SUCCEEDED: false,
      SEMANTIC_STABILITY_DIAGNOSTIC: offscreenDiagnostic,
      CANDIDATE_ENUMERATED_FROM_CURRENT_DOM: true,
      SEMANTIC_ACTION_RESOLVED: true,
      BUSINESS_TARGET_RESOLVED: true,
      OVERLAY_CONTAINMENT_PROVEN: true,
      CURRENT_CANDIDATE_COUNT: 1,
      CURRENT_SEMANTIC_EXECUTION_CONTEXT: {},
      CANDIDATE_DERIVED_LOCATOR: {},
    },
  });
  assert.equal(input.ACTION_DISPATCH_STARTED, false);
  assert.equal(input.ACTION_DISPATCH_SUCCEEDED, false);
  assert.equal(input.RAW_HARNESS_FAILURE, true);
  assert.equal(input.RAW_PHYSICAL_FAILURE_CLASS, "NESTED_SCROLL_OFFSCREEN");
  assert.equal(input.RAW_STABILITY_STATE, offscreenDiagnostic);
});

test("RED-7 a pre-click stability failure cannot become PRODUCT_DEFECT", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    RAW_HARNESS_FAILURE: true,
    ACTIONABILITY_PROVEN: true,
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: false,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
});

test("RED-8 raw HARNESS_FAILURE has precedence over an absent effect", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    RAW_HARNESS_FAILURE: true,
    RAW_FAILURE_REASON: "SEMANTIC_STABILITY_NOT_PROVEN",
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: false,
    EXPECTED_EFFECT_ABSENT: true,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.match(result.REASON_CODE, /RAW_HARNESS_FAILURE/u);
});

test("RED-9 post-action observer is not authoritative without successful dispatch", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    ACTION_DISPATCH_STARTED: false,
    ACTION_DISPATCH_SUCCEEDED: false,
    POST_ACTION_OBSERVER_VALID: true,
    EXPECTED_EFFECT_ABSENT: true,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
});

test("RED-10 successful dispatch plus valid observer can prove PRODUCT_DEFECT", () => {
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    ACTION_ATTEMPTED: false,
    ACTION_DISPATCH_STARTED: true,
    ACTION_DISPATCH_SUCCEEDED: true,
    POST_ACTION_OBSERVER_VALID: true,
    EXPECTED_EFFECT_ABSENT: true,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "PRODUCT_DEFECT");
});

test("RED-11 successful dispatch plus observed effect proves PASS", async () => {
  const lifecycle = { ACTION_DISPATCH_STARTED: false, ACTION_DISPATCH_SUCCEEDED: false, ACTION_DISPATCH_FAILED: false };
  await requiredFunction(runner, "dispatchPlaywrightClick")({
    async click(options) { assert.equal(options.force, false); },
  }, lifecycle);
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({ ACTION_ATTEMPTED: false, ...lifecycle }));
  assert.equal(result.TERMINAL_CLASS, "PASS");
});

test("RED-12 Playwright click rejection is distinct from pre-click geometry failure", async () => {
  const lifecycle = { ACTION_DISPATCH_STARTED: false, ACTION_DISPATCH_SUCCEEDED: false, ACTION_DISPATCH_FAILED: false };
  await assert.rejects(
    () => requiredFunction(runner, "dispatchPlaywrightClick")({
      async click(options) { assert.equal(options.force, false); throw new Error("PLAYWRIGHT_CLICK_REJECTED"); },
    }, lifecycle),
    /PLAYWRIGHT_CLICK_REJECTED/u,
  );
  const result = runner.evaluateRoomTrueOpen54ContractTerminal(terminalInput({
    RAW_HARNESS_FAILURE: true,
    ...lifecycle,
    POST_ACTION_OBSERVER_VALID: false,
    EXPECTED_EFFECT_OBSERVED: false,
  }));
  assert.equal(result.TERMINAL_CLASS, "HARNESS_BLOCK");
  assert.equal(result.REASON_CODE, "ACTION_DISPATCH_FAILED");
});

test("RED-13 nested-scroll preparation preserves authoritative surface containment", () => {
  const plan = requiredFunction(hybrid, "planPreActionGeometryPreparation")({ diagnostic: offscreenDiagnostic });
  assert.equal(plan.preserveAuthoritativeSurface, true);
  assert.equal(plan.scrollContext, "NESTED");
});

test("RED-14 offscreen preparation never introduces force click", () => {
  const plan = requiredFunction(hybrid, "planPreActionGeometryPreparation")({ diagnostic: offscreenDiagnostic });
  assert.equal(plan.forceClick, false);
});

test("RED-15 existing in-viewport PASS-style geometry remains actionable", () => {
  const proven = requiredFunction(hybrid, "deriveHarnessActionabilityProof")({
    visible: true,
    enabled: true,
    overlayContainmentProven: true,
    stabilityDiagnostic: inViewportDiagnostic,
  });
  assert.equal(proven, true);
});

test("RED-16 corrective plan cannot consume or mutate ROOT-HIT190 membership", () => {
  const plan = requiredFunction(hybrid, "planPreActionGeometryPreparation")({ diagnostic: offscreenDiagnostic });
  assert.equal(plan.scope, "CURRENT_CONTRACT_ONLY");
  assert.equal(plan.hitTest190MembershipMutationAllowed, false);
});

let pass = 0;
let fail = 0;
for (const current of cases) {
  try {
    await current.run();
    pass += 1;
    console.log(`PASS ${current.name}`);
  } catch (error) {
    fail += 1;
    console.error(`FAIL ${current.name}: ${error?.message || error}`);
  }
}

console.log(JSON.stringify({
  CORRECTIVE_RED_TEST_COUNT: cases.length,
  CORRECTIVE_TEST_PASS: pass,
  CORRECTIVE_TEST_FAIL: fail,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));
if (fail) process.exitCode = 1;
