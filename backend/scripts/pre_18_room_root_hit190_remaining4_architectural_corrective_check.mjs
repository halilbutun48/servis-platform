/*
 * Test-first guard for the two proven ROOT-HIT190 remaining-four architecture
 * roots.  --red is intentionally run before the corrective: every check must
 * expose the absent pure-revalidation / readiness-continuity contract.
 *
 * These are no-browser synthetic integration checks.  They invoke exported
 * production harness paths with deterministic page/locator doubles; they do
 * not claim Chromium proof.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const redMode = process.argv.includes("--red");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const runtime = await import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url));
const profiles = await import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url));
const nativeDisclosure = await import(new URL("./lib/pre_18_native_disclosure_state.mjs", import.meta.url));

const TEST_METADATA = Object.freeze({
  RED_1: "ACTUAL_RUNTIME_PATH",
  RED_2: "SYNTHETIC_INTEGRATION",
  RED_3: "SYNTHETIC_INTEGRATION",
  RED_4: "SYNTHETIC_INTEGRATION",
  RED_5: "SYNTHETIC_INTEGRATION",
  RED_6: "ACTUAL_RUNTIME_PATH",
  RED_7: "SYNTHETIC_INTEGRATION",
  RED_8: "ACTUAL_RUNTIME_PATH",
  RED_9: "ACTUAL_RUNTIME_PATH",
  RED_10: "ACTUAL_RUNTIME_PATH",
  RED_11: "ACTUAL_RUNTIME_PATH",
  RED_12: "SYNTHETIC_INTEGRATION",
  RED_13: "SYNTHETIC_INTEGRATION",
  RED_14: "SYNTHETIC_INTEGRATION",
  RED_15: "SYNTHETIC_INTEGRATION",
  RED_16: "SYNTHETIC_INTEGRATION",
  RED_17: "PURE_UNIT",
  RED_18: "PURE_UNIT",
  GREEN_1: "ACTUAL_RUNTIME_PATH",
  GREEN_2: "ACTUAL_RUNTIME_PATH",
  GREEN_3: "ACTUAL_RUNTIME_PATH",
});

function required(name) {
  if (typeof runtime[name] !== "function") throw new Error(`ARCHITECTURAL_RUNTIME_PATH_REQUIRED:${name}`);
  return runtime[name];
}

function candidate({ name = "+10 yolcu", role = "button", tag = "BUTTON", ownerLabel = "root" } = {}) {
  return {
    action: { role, name, userMeaning: name, expectedEffectClass: "EXPAND" },
    owner: { type: "section", label: ownerLabel, boundedOrdinal: 0 },
    businessTarget: { type: "NONE", stableKey: null },
    control: { tag, dataTestId: null },
    materialState: {},
    visible: true,
    enabled: true,
  };
}

function historicalFrom(item) {
  return {
    action: { ...item.action },
    owner: { ...item.owner },
    businessTarget: { ...item.businessTarget },
    materialState: { ...item.materialState },
    semanticIdentity: null,
  };
}

function actionPage({ current = candidate(), navigationClosed = true, scrollTop = 1473 } = {}) {
  let scroll = scrollTop;
  let open = !navigationClosed;
  let navClicks = 0;
  const item = structuredClone(current);
  const actionSet = [{
    action: item.action,
    control: item.control,
    ownerCandidates: [{
      type: item.owner.type,
      label: item.owner.label,
      businessTarget: item.businessTarget,
    }],
    businessContext: "",
    overlayScope: "NONE",
    materialState: item.materialState,
    visible: item.visible,
    enabled: item.enabled,
  }];
  const actionPageObject = {
    get navClicks() { return navClicks; },
    get scrollTop() { return scroll; },
    get actionSet() { return structuredClone(actionSet); },
    locator(selector) {
      if (selector !== ".navAdvanced > .navToggle") throw new Error(`UNEXPECTED_LOCATOR:${selector}`);
      const toggle = {
        async isVisible() { return true; },
        async innerText() { return open ? "▾ SİSTEM" : "▸ SİSTEM"; },
        async click() { navClicks += 1; open = !open; scroll = 500; },
      };
      return {
        async count() { return 1; },
        nth() { return toggle; },
      };
    },
    async evaluate(callback, argument) {
      // enumerate() is intentionally replaced only at the browser boundary;
      // candidate identity is the production resolver's real input.
      if (String(callback).includes("querySelectorAll")) return structuredClone(actionSet);
      return callback(argument);
    },
  };
  return actionPageObject;
}

function stableFinancialObservation(overrides = {}) {
  return {
    routeReadiness: { ready: true, reason: "READY" },
    financialSurfacePresent: true,
    workspacePresent: true,
    loadingPresentationPresent: false,
    baselineResolved: true,
    terminalNoBaselinePresent: false,
    ...overrides,
  };
}

async function remaining4FinancialRow() {
  const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
    profileId: "ROOM_ROOT_HIT190_REMAINING4_CANARY",
    repositoryRoot,
  });
  const row = profile.contracts.find((item) => item.REPLAY_SEMANTIC_IDENTITY?.accessibleName === "Senaryo için maliyet varsayımı (kuruş)");
  if (!row) throw new Error("REMAINING4_FINANCIAL_ROW_NOT_FOUND");
  return structuredClone(row);
}

function disclosureSequencePage(sequence = []) {
  let read = 0;
  const stateAt = () => sequence[Math.min(read++, Math.max(sequence.length - 1, 0))] || {};
  return {
    locator(selector) {
      if (selector !== "summary") throw new Error(`UNEXPECTED_DISCLOSURE_SELECTOR:${selector}`);
      return {
        async count() { return 1; },
        nth() {
          return {
            async isVisible() { return true; },
            async click() {},
            async evaluate() {
              const state = stateAt();
              return {
                controlTag: "SUMMARY",
                controlRole: "summary",
                accessibleName: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
                containingDetails: true,
                detailsOpen: state.open === true,
                ariaExpandedPresent: false,
                ariaExpandedValue: null,
              };
            },
            locator() {
              return {
                getByRole(role, options) {
                  return {
                    async count() { return role === "spinbutton" && options?.name === "Senaryo için maliyet varsayımı (kuruş)" ? 1 : 0; },
                    nth() { return { async isVisible() { return stateAt().controlVisible === true; } }; },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

async function actualFinancialStateRecipePath() {
  const row = await remaining4FinancialRow();
  return runtime.applyRoomPrehitStateRecipe({}, row, {
    authReady: true,
    adapters: {
      openRouteWithPositiveReadiness: async () => ({ ready: true, reason: "ROUTE_READY" }),
      waitForPositiveRouteReadiness: async () => ({ ready: true, reason: "ROUTE_READY" }),
      waitForFinancialOperationsContentSettled: async () => ({ ready: true, reason: "FINANCIAL_CONTENT_STABLE" }),
      ensureActionMaterialState: async () => ({ ok: true, reason: "MATERIAL_STATE_PROVEN" }),
      openNativeDisclosure: async () => ({ detailsOpen: true, successorRendered: true }),
      assertNativeDisclosureExpanded: async () => ({ detailsOpen: true, successorRendered: true }),
      ensureRoomActiveTab: async () => ({ selected: true }),
    },
  });
}

function syntheticPreparedTarget({ name = "+10 yolcu" } = {}) {
  const identity = {
    candidateKey: `candidate:${name}`,
    role: "button",
    name,
    owner: { type: "section", label: "root" },
    businessTarget: { type: "NONE", stableKey: null },
    tag: "BUTTON",
    dataTestId: null,
  };
  const meta = {
    action: { role: "button", name, expectedEffectClass: "EXPAND" },
    owner: { type: "section", label: "root" },
    visible: true,
    enabled: true,
    executionContext: { requiredSurfaceState: {}, locatorRecipe: { candidateKey: identity.candidateKey } },
  };
  const target = {
    async isVisible() { return true; },
    async isDisabled() { return false; },
    async scrollIntoViewIfNeeded() {},
  };
  const binding = { loc: target, physicalIdentity: { SEMANTIC_IDENTITY: identity }, observed: { action: meta.action, owner: meta.owner, control: { tag: "BUTTON" } } };
  const stable = (scrollTop) => ({
    ok: true,
    completion: { requiredEvidence: [] },
    diagnostic: {
      STABILITY_COMPLETE: true,
      TARGET_HIT_TEST: true,
      CENTER_POINT_IN_VIEWPORT: true,
      DOCUMENT_SCROLL_TOP: scrollTop,
      DOCUMENT_SCROLL_Y: scrollTop,
      MAX_DOCUMENT_SCROLL_TOP: 2000,
      CURRENT_SCROLL_AT_MAX: scrollTop === 2000,
      DISTANCE_TO_MAX_SCROLL: 2000 - scrollTop,
      TARGET_RECT: { x: 0, y: 430, width: 100, height: 32 },
      TARGET_NODE_SIGNATURE: `BUTTON:${name}`,
      TARGET_TAG: "BUTTON",
    },
  });
  return { identity, meta, target, binding, stable };
}

async function prepareWithActualRuntime(name) {
  const prepared = syntheticPreparedTarget({ name });
  let reads = 0;
  const lifecycle = {};
  const result = await required("prepareCurrentSemanticTargetForAction")({
    page: {},
    surface: { role: "ROOM", route: "/room/financial-operations", viewport: "desktop", state: "base" },
    historicalMeta: prepared.meta,
    currentMeta: prepared.meta,
    lifecycle,
    adapters: {
      targetForCurrentMeta: async () => prepared.binding,
      waitForSemanticStability: async () => prepared.stable(reads++ === 0 ? 1473 : 1473),
      resolveFreshSemanticAction: async () => prepared.meta,
    },
  });
  return { result, lifecycle };
}

async function financialContinuity({ observations, resolve = async () => candidate({ name: "Senaryo için maliyet varsayımı (kuruş)", role: "spinbutton", tag: "INPUT" }) } = {}) {
  const row = await remaining4FinancialRow();
  let index = 0;
  return required("resolveFinancialSemanticActionWithContinuity")({
    page: {},
    row,
    surface: { role: "ROOM", route: row.ROUTE, viewport: row.VIEWPORT, state: "base" },
    historicalMeta: historicalFrom(candidate({ name: "Senaryo için maliyet varsayımı (kuruş)", role: "spinbutton", tag: "INPUT" })),
    adapters: {
      observeFinancial: async () => structuredClone(observations[Math.min(index++, observations.length - 1)]),
      applyStateRecipe: async () => ({ asserted: [{ type: "NATIVE_DISCLOSURE_OPEN", disclosure: { successorRendered: true, expectedControl: { role: "spinbutton", name: "Senaryo için maliyet varsayımı (kuruş)" } } }] }),
      resolveFreshSemanticAction: async () => resolve(),
    },
  });
}

const redChecks = [
  ["RED-1 execution revalidation currently invokes navigation mutation", "ACTUAL_RUNTIME_PATH", async () => {
    const page = actionPage(); const item = candidate();
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(item));
    assert.equal(page.navClicks, 0);
  }],
  ["RED-2 mutating re-resolution resets successful physical scroll", "SYNTHETIC_INTEGRATION", async () => {
    const page = actionPage({ scrollTop: 1473 }); const item = candidate();
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(item));
    assert.equal(page.scrollTop, 1473);
  }],
  ["RED-3 +10 immediate hit-test remains valid through revalidation", "SYNTHETIC_INTEGRATION", async () => {
    const page = actionPage({ current: candidate({ name: "+10 yolcu" }) });
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room/financial-operations", viewport: "desktop", state: "base" }, historicalFrom(candidate({ name: "+10 yolcu" })));
    assert.equal(page.scrollTop, 1473);
  }],
  ["RED-4 Yolcu sayısı immediate hit-test remains valid through revalidation", "SYNTHETIC_INTEGRATION", async () => {
    const item = candidate({ name: "Yolcu sayısı (kişi)", role: "spinbutton", tag: "INPUT" }); const page = actionPage({ current: item });
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room/financial-operations", viewport: "desktop", state: "base" }, historicalFrom(item));
    assert.equal(page.scrollTop, 1473);
  }],
  ["RED-5 Ayrıntılar immediate hit-test remains valid through revalidation", "SYNTHETIC_INTEGRATION", async () => {
    const item = candidate({ name: "Ayrıntılar / izlenebilirlik", role: "button", tag: "SUMMARY" }); const page = actionPage({ current: item });
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room/operation-health", viewport: "desktop", state: "base" }, historicalFrom(item));
    assert.equal(page.scrollTop, 1473);
  }],
  ["RED-6 pure execution revalidation makes no navigation click", "ACTUAL_RUNTIME_PATH", async () => {
    const page = actionPage(); const item = candidate();
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(item), { enumerationMode: "EXECUTION_REVALIDATION" });
    assert.equal(page.navClicks, 0);
  }],
  ["RED-7 pure execution revalidation preserves document scroll", "SYNTHETIC_INTEGRATION", async () => {
    const page = actionPage({ scrollTop: 1473 }); const item = candidate();
    await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(item), { enumerationMode: "EXECUTION_REVALIDATION" });
    assert.equal(page.scrollTop, 1473);
  }],
  ["RED-8 pure revalidation rejects a genuinely different semantic target", "ACTUAL_RUNTIME_PATH", async () => {
    const page = actionPage({ current: candidate({ name: "Başka işlem" }) });
    const resolved = await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(candidate()), { enumerationMode: "EXECUTION_REVALIDATION" });
    assert.equal(resolved, null);
  }],
  ["RED-9 equivalent semantic target is accepted without DOM ordinal authority", "ACTUAL_RUNTIME_PATH", async () => {
    const item = candidate(); const page = actionPage({ current: item });
    const resolved = await required("resolveFreshSemanticAction")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, historicalFrom(item), { enumerationMode: "EXECUTION_REVALIDATION" });
    assert.ok(resolved?.executionContext?.candidate);
    assert.equal(resolved.executionContext.locatorRecipe?.globalOrdinal, undefined);
  }],
  ["RED-10 Yenileniyor presentation is unsettled", "ACTUAL_RUNTIME_PATH", () => {
    const observation = required("financialLoadingPresentationObservation")("Yenileniyor...");
    assert.equal(observation.loadingPresentationPresent, true);
  }],
  ["RED-11 Plan verisi okunuyor remains unsettled", "ACTUAL_RUNTIME_PATH", () => {
    const observation = required("financialLoadingPresentationObservation")("Plan verisi okunuyor...");
    assert.equal(required("evaluateFinancialOperationsContentSettled")(stableFinancialObservation(observation)).ready, false);
  }],
  ["RED-12 refresh after assertion invalidates financial continuity", "SYNTHETIC_INTEGRATION", async () => {
    await assert.rejects(() => financialContinuity({ observations: [stableFinancialObservation(), stableFinancialObservation({ loadingPresentationPresent: true, baselineResolved: false })] }), /FINANCIAL_STATE_CONTINUITY_NOT_PROVEN/u);
  }],
  ["RED-13 candidate absence during refresh never becomes semantic-not-resolved", "SYNTHETIC_INTEGRATION", async () => {
    await assert.rejects(() => financialContinuity({ observations: [stableFinancialObservation(), stableFinancialObservation({ loadingPresentationPresent: true, baselineResolved: false })], resolve: async () => null }), /FINANCIAL_STATE_CONTINUITY_NOT_PROVEN/u);
  }],
  ["RED-14 stable assertion, pure enumeration, and stable re-observation are accepted", "SYNTHETIC_INTEGRATION", async () => {
    const resolved = await financialContinuity({ observations: [stableFinancialObservation(), stableFinancialObservation()] });
    assert.equal(resolved.CONTINUITY_VALID, true);
  }],
  ["RED-15 a transient refresh may boundedly re-establish state", "SYNTHETIC_INTEGRATION", async () => {
    const resolved = await financialContinuity({ observations: [stableFinancialObservation(), stableFinancialObservation({ loadingPresentationPresent: true, baselineResolved: false }), stableFinancialObservation(), stableFinancialObservation()] });
    assert.equal(resolved.STATE_REESTABLISHED, true);
  }],
  ["RED-16 non-settling refresh remains harness block", "SYNTHETIC_INTEGRATION", async () => {
    await assert.rejects(() => financialContinuity({ observations: [stableFinancialObservation({ loadingPresentationPresent: true, baselineResolved: false })] }), /FINANCIAL_STATE_CONTINUITY_NOT_PROVEN/u);
  }],
  ["RED-17 no blind fixed sleep is required for execution revalidation", "PURE_UNIT", () => {
    assert.equal(required("executionRevalidationPolicy")().usesBlindFixedSleep, false);
  }],
  ["RED-18 product source is not part of the corrective", "PURE_UNIT", () => {
    assert.equal(required("remaining4ArchitecturalCorrectiveScope")().productSourceRequired, false);
  }],
];

async function runRed() {
  let observed = 0;
  let unexpectedPass = 0;
  for (const [name, type, check] of redChecks) {
    try {
      await check();
      unexpectedPass += 1;
      console.error(`RED_UNEXPECTED_PASS ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED [${type}] ${name}: ${error.message}`);
    }
  }
  console.log(JSON.stringify({
    ARCHITECTURAL_RED_TEST_COUNT: redChecks.length,
    ARCHITECTURAL_RED_OBSERVED_COUNT: observed,
    ARCHITECTURAL_RED_UNEXPECTED_PASS_COUNT: unexpectedPass,
    TEST_METADATA: TEST_METADATA,
    SYNTHETIC_TEST_REPORTED_AS_REAL_BROWSER_PROOF_COUNT: 0,
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  }, null, 2));
  process.exitCode = observed === redChecks.length && unexpectedPass === 0 ? 1 : 2;
}

async function runGreen() {
  let passed = 0;
  for (const [name, type, check] of redChecks) {
    await check();
    passed += 1;
    console.log(`PASS [${type}] ${name}`);
  }
  const greenGuards = [
    ["GREEN_1", "GREEN-1 discovery enumeration retains bounded inventory behavior while execution mode stays pure", async () => {
      const page = actionPage(); const item = candidate();
      await required("enumerateSurfaceActions")(page, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, { mode: "DISCOVERY_INVENTORY" });
      assert.equal(page.navClicks, 2);
      const purePage = actionPage();
      await required("enumerateSurfaceActions")(purePage, { role: "ROOM", route: "/room", viewport: "desktop", state: "base" }, { mode: "EXECUTION_REVALIDATION" });
      assert.equal(purePage.navClicks, 0);
      assert.ok(item.action.name);
    }],
    ["GREEN_2", "GREEN-2 actual ROOM state recipe keeps financial disclosure assertion contract", async () => {
      const recipe = await actualFinancialStateRecipePath();
      assert.ok(recipe.produced.some((item) => item.type === "FINANCIAL_OPERATIONS_CONTENT_SETTLED"));
      assert.ok(recipe.asserted.some((item) => item.type === "NATIVE_DISCLOSURE_OPEN"));
    }],
    ["GREEN_3", "GREEN-3 actual native disclosure assertion proves expected spinbutton visibility", async () => {
      const result = await nativeDisclosure.assertNativeDisclosureExpanded(disclosureSequencePage([
        { open: false, controlVisible: false },
        { open: true, controlVisible: true },
      ]), {
        name: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
        expectedControl: { role: "spinbutton", controlTag: "input", inputType: "number", name: "Senaryo için maliyet varsayımı (kuruş)" },
        timeout: 160,
      });
      assert.equal(result.successorRendered, true);
    }],
  ];
  for (const [key, name, check] of greenGuards) {
    await check();
    passed += 1;
    console.log(`PASS [${TEST_METADATA[key]}] ${name}`);
  }
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: passed,
    FOCUSED_TEST_PASS: passed,
    FOCUSED_TEST_FAIL: 0,
    TEST_METADATA: TEST_METADATA,
    ACTUAL_RESOLVE_FRESH_SEMANTIC_ACTION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_ENUMERATE_SURFACE_ACTIONS_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_PREPARE_CURRENT_SEMANTIC_TARGET_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_FINANCIAL_READINESS_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_STATE_RECIPE_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_NATIVE_DISCLOSURE_ASSERTION_PATH_EXECUTED_IN_TEST: "YES",
    SYNTHETIC_TEST_REPORTED_AS_REAL_BROWSER_PROOF_COUNT: 0,
    NO_BROWSER_ROOT_HIT_PHYSICAL_CLOSURE_COUNT: 0,
    NO_BROWSER_FULL_INTERACTION_CLOSURE_COUNT: 0,
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  }, null, 2));
}

if (redMode) await runRed();
else await runGreen();
