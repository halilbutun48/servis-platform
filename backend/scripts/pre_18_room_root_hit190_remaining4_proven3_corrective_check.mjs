/*
 * Test-first guard for the proven ROOT-HIT190 remaining-four harness roots.
 * --red must observe the missing bounded harness behavior before repair.
 * Normal mode verifies the actual shared runtime paths without Chromium.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const redMode = process.argv.includes("--red");
const [profiles, runtime, hybrid, nativeDisclosure] = await Promise.all([
  import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url)),
  import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url)),
  import(new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url)),
  import(new URL("./lib/pre_18_native_disclosure_state.mjs", import.meta.url)),
]);

const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
  profileId: "ROOM_ROOT_HIT190",
  repositoryRoot,
});
const financialInput = profile.contracts.find((row) => row.REPLAY_SEMANTIC_IDENTITY?.accessibleName === "Senaryo için maliyet varsayımı (kuruş)");
assert.ok(financialInput, "frozen advanced financial input contract unavailable");

function required(owner, name) {
  assert.equal(typeof owner[name], "function", `${name} must be implemented by the authoritative harness path`);
  return owner[name];
}

function currentCandidate({ name, tag, dataTestId, ownerLabel }) {
  return {
    action: { role: "button", name, expectedEffectClass: tag === "SUMMARY" ? "DISCLOSURE_CHANGE" : "RENDERED_TRANSITION" },
    owner: { type: "card", label: ownerLabel },
    businessContext: ownerLabel,
    control: { tag, dataTestId },
    overlayScope: "NONE",
    visible: true,
    enabled: true,
  };
}

function executionContext(candidate) {
  return hybrid.buildCurrentSemanticExecutionContext({
    action: candidate.action,
    owner: candidate.owner,
    businessContext: candidate.businessContext,
    route: "/room/financial-operations",
    semanticIdentity: { structuralContext: { dataTestId: candidate.control.dataTestId } },
  }, [candidate]);
}

function fakePhysicalNode({ tag, name, dataTestId, role = "button", ownerLabel, nodeSignature = null }) {
  const info = {
    name,
    disabled: false,
    control: { dataTestId, tag },
    ownerCandidates: [{ type: "card", semanticLabel: ownerLabel, depth: 1 }],
    overlayScope: "NONE",
    expectedEffectClass: tag === "SUMMARY" ? "DISCLOSURE_CHANGE" : "RENDERED_TRANSITION",
  };
  const telemetry = {
    TARGET_TAG: tag,
    TARGET_DATA_TESTID: dataTestId,
    TARGET_ACCESSIBLE_NAME: name,
    TARGET_ROLE: role,
    TARGET_NODE_SIGNATURE: nodeSignature || `${tag}|${dataTestId}|${role}|${name}`,
    TARGET_RECT: { x: 24, y: 1280, width: 180, height: 40, top: 1280, right: 204, bottom: 1320, left: 24 },
    VIEWPORT: { width: 1440, height: 900 },
    RECT_INTERSECTS_VIEWPORT: false,
    TARGET_INTERSECTION: { intersectsViewport: false, ratio: 0 },
    CENTER_POINT: { x: 114, y: 1300 },
    CENTER_POINT_IN_VIEWPORT: false,
    TARGET_HIT_TEST: false,
    DOCUMENT_SCROLL_TOP: 500,
    DOCUMENT_SCROLL_Y: 500,
    DOCUMENT_SCROLL_HEIGHT: 3000,
    DOCUMENT_CLIENT_HEIGHT: 900,
    MAX_DOCUMENT_SCROLL_TOP: 2100,
    CURRENT_SCROLL_AT_MAX: false,
    DISTANCE_TO_MAX_SCROLL: 1600,
    TARGET_CENTER_Y_RELATIVE_TO_VIEWPORT: 1300,
    TARGET_CENTER_Y_RELATIVE_TO_DOCUMENT: 1800,
    ANCESTOR_POSITION_SUMMARY: ["DIV:static"],
    ANCESTOR_TRANSFORM_SUMMARY: ["DIV:none"],
    ANCESTOR_OVERFLOW_SUMMARY: ["DIV:visible/visible"],
    SCROLLABLE_ANCESTORS: [],
    DOCUMENT_SCROLLABLE: true,
    DOCUMENT_SCROLLING_ELEMENT: { tag: "HTML", label: "document", scrollTop: 500, scrollLeft: 0, documentScrollingElement: true },
  };
  const handle = {
    kind: "stable-element-handle",
    async isVisible() { return true; },
    async isDisabled() { return false; },
    async scrollIntoViewIfNeeded() {},
    async click() {},
    async evaluate(_callback, arg) { return arg === undefined ? telemetry : info; },
  };
  return {
    info,
    telemetry,
    handle,
    locator: {
      async isVisible() { return true; },
      async evaluate(_callback, arg) { return arg === undefined ? telemetry : info; },
      async elementHandle() { return handle; },
    },
  };
}

function fakePage(nodes) {
  let current = [...nodes];
  return {
    mutate(next) { current = [...next]; },
    locator() {
      return {
        async count() { return current.length; },
        nth(index) { return current[index]?.locator || { async isVisible() { return false; } }; },
      };
    },
  };
}

function stabilityDiagnostic({ stable = false, nodeSignature = "INPUT|scenario-b-input-passengerCount|spinbutton|Yolcu sayısı (kişi)" } = {}) {
  return {
    STABILITY_COMPLETE: stable,
    FAILED_STABILITY_COMPONENT: stable ? null : "CENTER_OUTSIDE_VIEWPORT",
    PHYSICAL_FAILURE_CLASS: stable ? "TARGET_HIT_CONFIRMED" : "DOCUMENT_SCROLL_OFFSCREEN",
    TARGET_HIT_TEST: stable,
    CENTER_POINT_IN_VIEWPORT: stable,
    RECT_INTERSECTS_VIEWPORT: stable,
    TARGET_TAG: "INPUT",
    TARGET_NODE_SIGNATURE: nodeSignature,
    TARGET_DATA_TESTID: "scenario-b-input-passengerCount",
    TARGET_ACCESSIBLE_NAME: "Yolcu sayısı (kişi)",
    TARGET_ROLE: "spinbutton",
    TARGET_RECT: { x: 24, y: stable ? 240 : 1280, width: 180, height: 40, top: stable ? 240 : 1280, right: 204, bottom: stable ? 280 : 1320, left: 24 },
    TARGET_INTERSECTION: { intersectsViewport: stable, ratio: stable ? 1 : 0 },
    VIEWPORT: { width: 1440, height: 900 },
    DOCUMENT_SCROLL_TOP: stable ? 1540 : 500,
    DOCUMENT_SCROLL_Y: stable ? 1540 : 500,
    DOCUMENT_SCROLL_HEIGHT: 3000,
    DOCUMENT_CLIENT_HEIGHT: 900,
    MAX_DOCUMENT_SCROLL_TOP: 2100,
    CURRENT_SCROLL_AT_MAX: false,
    DISTANCE_TO_MAX_SCROLL: stable ? 560 : 1600,
    TARGET_CENTER_Y_RELATIVE_TO_VIEWPORT: stable ? 260 : 1300,
    TARGET_CENTER_Y_RELATIVE_TO_DOCUMENT: 1800,
    ANCESTOR_POSITION_SUMMARY: ["DIV:static"],
    ANCESTOR_TRANSFORM_SUMMARY: ["DIV:none"],
    ANCESTOR_OVERFLOW_SUMMARY: ["DIV:visible/visible"],
    SCROLL_CONTAINER_TYPE: "DOCUMENT",
  };
}

function preparationFixture({ postIdentity = "same", stable = true } = {}) {
  const lifecycle = {};
  const initialMeta = { id: "before", executionContext: { overlayScope: "NONE" } };
  const freshMeta = { id: "after", executionContext: { overlayScope: "NONE" } };
  const initialBinding = { loc: fakePhysicalNode({ tag: "INPUT", name: "Yolcu sayısı (kişi)", dataTestId: "scenario-b-input-passengerCount", role: "spinbutton", ownerLabel: "Mevcut / Senaryo A / Senaryo B" }).handle, physicalIdentity: { SEMANTIC_IDENTITY: { candidateKey: "passenger", role: "spinbutton", name: "Yolcu sayısı (kişi)", owner: { type: "card", label: "Mevcut / Senaryo A / Senaryo B" }, dataTestId: "scenario-b-input-passengerCount" } } };
  const refreshedBinding = { loc: fakePhysicalNode({ tag: "INPUT", name: postIdentity === "same" ? "Yolcu sayısı (kişi)" : "Başka hedef", dataTestId: postIdentity === "same" ? "scenario-b-input-passengerCount" : "different", role: "spinbutton", ownerLabel: "Mevcut / Senaryo A / Senaryo B" }).handle, physicalIdentity: { SEMANTIC_IDENTITY: { candidateKey: postIdentity === "same" ? "passenger" : "different", role: "spinbutton", name: postIdentity === "same" ? "Yolcu sayısı (kişi)" : "Başka hedef", owner: { type: "card", label: "Mevcut / Senaryo A / Senaryo B" }, dataTestId: postIdentity === "same" ? "scenario-b-input-passengerCount" : "different" } } };
  let stabilityCalls = 0;
  return {
    lifecycle,
    args: {
      page: {},
      surface: { route: "/room/financial-operations" },
      historicalMeta: { action: { role: "spinbutton", name: "Yolcu sayısı (kişi)" }, materialState: {} },
      currentMeta: initialMeta,
      lifecycle,
      adapters: {
        async targetForCurrentMeta(_page, meta) { return meta === initialMeta ? initialBinding : refreshedBinding; },
        async waitForSemanticStability() {
          stabilityCalls += 1;
          return stabilityCalls === 1
            ? { ok: false, diagnostic: stabilityDiagnostic(), completion: { requiredEvidence: ["TARGET_HIT_TEST"] } }
            : { ok: stable, diagnostic: stabilityDiagnostic({ stable }), completion: { requiredEvidence: ["TARGET_HIT_TEST"] } };
        },
        async resolveFreshSemanticAction() { return freshMeta; },
      },
    },
  };
}

function nativeDisclosurePage(record) {
  const details = {
    getByRole(role, options) {
      record.requestedRole = role;
      record.requestedName = options?.name || null;
      return { async count() { return role === "spinbutton" ? 1 : 0; }, nth() { return { async isVisible() { return true; } }; } };
    },
  };
  const summary = {
    async isVisible() { return true; },
    async evaluate() {
      return { controlTag: "SUMMARY", controlRole: "summary", accessibleName: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)", containingDetails: true, detailsOpen: true, ariaExpandedPresent: false, ariaExpandedValue: null };
    },
    locator() { return details; },
  };
  return { locator() { return { async count() { return 1; }, nth() { return summary; } }; } };
}

const checks = [
  ["RED-1 actual matching locator exposes a stable physical-target binding", async () => {
    const match = required(runtime, "matchingLocator");
    const candidate = currentCandidate({ name: "+10 yolcu", tag: "BUTTON", dataTestId: "scenario-quick-passenger", ownerLabel: "Mevcut / Senaryo A / Senaryo B" });
    const target = fakePhysicalNode({ tag: "BUTTON", name: "+10 yolcu", dataTestId: "scenario-quick-passenger", ownerLabel: candidate.owner.label });
    const binding = await match(fakePage([target]), executionContext(candidate));
    assert.equal(binding.loc.kind, "stable-element-handle");
  }],
  ["RED-2 global insertion cannot redirect +10 yolcu physical binding", async () => {
    const match = required(runtime, "matchingLocator");
    const candidate = currentCandidate({ name: "+10 yolcu", tag: "BUTTON", dataTestId: "scenario-quick-passenger", ownerLabel: "Mevcut / Senaryo A / Senaryo B" });
    const target = fakePhysicalNode({ tag: "BUTTON", name: "+10 yolcu", dataTestId: "scenario-quick-passenger", ownerLabel: candidate.owner.label });
    const decoy = fakePhysicalNode({ tag: "INPUT", name: "Yolcu sayısı (kişi)", dataTestId: "scenario-b-input-passengerCount", role: "spinbutton", ownerLabel: candidate.owner.label });
    const page = fakePage([target]); const binding = await match(page, executionContext(candidate)); page.mutate([decoy, target]);
    assert.equal(binding.loc, target.handle);
  }],
  ["RED-3 global reorder cannot redirect the summary physical binding", async () => {
    const match = required(runtime, "matchingLocator");
    const candidate = currentCandidate({ name: "Ayrıntılar / izlenebilirlik", tag: "SUMMARY", dataTestId: "financial-details", ownerLabel: "Karşılaştırma, senaryo ve dışa aktarım" });
    const target = fakePhysicalNode({ tag: "SUMMARY", name: "Ayrıntılar / izlenebilirlik", dataTestId: "financial-details", ownerLabel: candidate.owner.label });
    const decoy = fakePhysicalNode({ tag: "BUTTON", name: "Ayrıntılar / izlenebilirlik", dataTestId: "other-details", ownerLabel: candidate.owner.label });
    const page = fakePage([target]); const binding = await match(page, executionContext(candidate)); page.mutate([decoy, target]);
    assert.equal(binding.loc, target.handle);
  }],
  ["RED-4 post-scroll different semantic target is rejected", async () => {
    const fixture = preparationFixture({ postIdentity: "different" });
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args), /POST_SCROLL_SEMANTIC_TARGET_CHANGED/u);
  }],
  ["RED-5 same semantic target rerender remains valid", async () => {
    const fixture = preparationFixture({ postIdentity: "same" });
    await runtime.prepareCurrentSemanticTargetForAction(fixture.args);
    assert.equal(fixture.lifecycle.POST_SCROLL_SEMANTIC_IDENTITY_MATCH, true);
  }],
  ["RED-6 shared native input role maps number to spinbutton", () => assert.equal(required(hybrid, "deriveImplicitAriaRole")({ tag: "input", type: "number" }), "spinbutton")],
  ["RED-7 shared native input role preserves text input as textbox", () => assert.equal(required(hybrid, "deriveImplicitAriaRole")({ tag: "input", type: "text" }), "textbox")],
  ["RED-8 advanced financial assertion uses spinbutton", () => {
    const step = financialInput.STATE_RECIPE.assert.find((item) => item.expectedControl);
    assert.equal(step.expectedControl.role, "spinbutton");
  }],
  ["RED-9 actual native disclosure assertion requests the shared spinbutton role", async () => {
    const record = {}; const step = financialInput.STATE_RECIPE.assert.find((item) => item.expectedControl);
    await nativeDisclosure.assertNativeDisclosureExpanded(nativeDisclosurePage(record), { name: step.summary, expectedControl: step.expectedControl });
    assert.equal(record.requestedRole, "spinbutton");
  }],
  ["RED-10 actual physical probe captures invocation target identity", async () => {
    const inspect = required(runtime, "inspectTargetHitTest");
    const node = fakePhysicalNode({ tag: "INPUT", name: "Yolcu sayısı (kişi)", dataTestId: "scenario-b-input-passengerCount", role: "spinbutton", ownerLabel: "Mevcut / Senaryo A / Senaryo B" });
    const telemetry = await inspect(node.handle, { semanticIdentity: { candidateKey: "passenger" } });
    assert.equal(telemetry.INVOCATION_TARGET_NODE_SIGNATURE, "INPUT|scenario-b-input-passengerCount|spinbutton|Yolcu sayısı (kişi)");
  }],
  ["RED-11 actual physical probe captures document scroll capacity", async () => {
    const inspect = required(runtime, "inspectTargetHitTest");
    const node = fakePhysicalNode({ tag: "INPUT", name: "Yolcu sayısı (kişi)", dataTestId: "scenario-b-input-passengerCount", role: "spinbutton", ownerLabel: "Mevcut / Senaryo A / Senaryo B" });
    const telemetry = await inspect(node.handle, { semanticIdentity: { candidateKey: "passenger" } });
    assert.equal(telemetry.MAX_DOCUMENT_SCROLL_TOP, 2100);
  }],
  ["RED-12 diagnostic adapter preserves physical invocation and capacity telemetry", () => {
    const diagnostic = hybrid.buildSemanticStabilityDiagnostic({ targetOverlayScope: "NONE", observed: { modalOpen: false, drawerOpen: false, backdropOpen: false, targetHitTest: false }, target: stabilityDiagnostic() });
    assert.equal(diagnostic.INVOCATION_TARGET_NODE_SIGNATURE, "INPUT|scenario-b-input-passengerCount|spinbutton|Yolcu sayısı (kişi)");
    assert.equal(diagnostic.DOCUMENT_SCROLL_HEIGHT, 3000);
    assert.equal(diagnostic.MAX_DOCUMENT_SCROLL_TOP, 2100);
  }],
  ["RED-13 pre-click physical failure retains immediate post-primitive telemetry", async () => {
    const fixture = preparationFixture({ stable: false });
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args));
    assert.equal(fixture.lifecycle.IMMEDIATE_POST_PRIMITIVE_DOCUMENT_SCROLL_TOP, 500);
    assert.equal(fixture.lifecycle.PHYSICAL_FAILURE_WITHOUT_INVOCATION_TARGET_DIAGNOSTIC, 0);
    assert.equal(fixture.lifecycle.PHYSICAL_FAILURE_WITHOUT_SCROLL_CAPACITY_DIAGNOSTIC, 0);
    assert.equal(fixture.lifecycle.PHYSICAL_FAILURE_WITHOUT_IMMEDIATE_POST_PRIMITIVE_STATE, 0);
  }],
  ["RED-14 terminal input retains physical telemetry through HARNESS_BLOCK", () => {
    const raw = hybrid.buildSemanticStabilityDiagnostic({ targetOverlayScope: "NONE", observed: { modalOpen: false, drawerOpen: false, backdropOpen: false, targetHitTest: false }, target: stabilityDiagnostic() });
    const input = runtime.toRoomTrueOpen54TerminalInput({ row: { SAFETY_CLASS: "SAFE", PREHIT_ROOT: "ROOT-HIT-01", VIEWPORT: "desktop", HISTORICAL_ROOT_FAMILY: "ROOT-HIT-01" }, surface: { viewport: "desktop" }, recipe: { routeReadiness: { ready: true }, originalRootInputs: {} }, action: { executionState: "HARNESS_FAILURE", classification: "HARNESS_DEFECT", SEMANTIC_STABILITY_DIAGNOSTIC: raw } });
    assert.equal(input.RAW_STABILITY_STATE.INVOCATION_TARGET_NODE_SIGNATURE, "INPUT|scenario-b-input-passengerCount|spinbutton|Yolcu sayısı (kişi)");
  }],
  ["RED-15 preparation explicitly records that no manual scroll fallback exists", async () => {
    const fixture = preparationFixture({ stable: false });
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args));
    assert.equal(fixture.lifecycle.MANUAL_SCROLL_FALLBACK_INTRODUCED, false);
  }],
  ["RED-16 canonical validate-start exposes immutable corrective telemetry invariants", async () => {
    const cli = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
    const run = spawnSync(process.execPath, [cli, "--validate-start"], { cwd: repositoryRoot, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const summary = JSON.parse(run.stdout);
    assert.equal(summary.LIVE_GLOBAL_NTH_LOCATOR_DRIFT_PHYSICAL_BINDING_ELIMINATED, "YES");
    assert.equal(summary.UNPROVEN_YOLCU_SAYISI_SCROLL_BEHAVIOR_CHANGED, "NO");
  }],
];

let passed = 0;
let observed = 0;
for (const [name, check] of checks) {
  if (redMode) {
    try {
      await check();
      passed += 1;
      console.error(`RED_UNEXPECTED_PASS ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED ${name}: ${error.message}`);
    }
  } else {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  }
}

console.log(JSON.stringify(redMode ? {
  CORRECTIVE_RED_TEST_COUNT: checks.length,
  CORRECTIVE_RED_OBSERVED_COUNT: observed,
  CORRECTIVE_RED_UNEXPECTED_PASS_COUNT: passed,
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
} : {
  FOCUSED_TEST_TOTAL: checks.length,
  FOCUSED_TEST_PASS: passed,
  FOCUSED_TEST_FAIL: 0,
  ACTUAL_ROOT_HIT190_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
  ACTUAL_MATCHING_LOCATOR_PATH_EXECUTED_IN_TEST: "YES",
  ACTUAL_PREPARE_TARGET_PATH_EXECUTED_IN_TEST: "YES",
  ACTUAL_NATIVE_DISCLOSURE_ASSERTION_PATH_EXECUTED_IN_TEST: "YES",
  ACTUAL_SEMANTIC_ROLE_DERIVATION_PATH_EXECUTED_IN_TEST: "YES",
  ACTUAL_PHYSICAL_TELEMETRY_PATH_EXECUTED_IN_TEST: "YES",
  REAL_BROWSER_RUN_STARTED: "NO",
  CHROMIUM_PROCESS_STARTED: "NO",
  PLAYWRIGHT_BROWSER_CONNECTED: "NO",
}, null, 2));

if (redMode) process.exitCode = observed === checks.length && passed === 0 ? 1 : 2;
