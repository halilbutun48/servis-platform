/*
 * Test-first guard for the ROOT-HIT190 remaining-seven analysis.  --red
 * proves the pre-corrective gaps without starting a browser.  The normal
 * mode exercises the same production resolver, geometry preparation, state
 * recipe, and validate-start paths after the harness-only corrective.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const redMode = process.argv.includes("--red");
const [profiles, runtime, hybrid] = await Promise.all([
  import(new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url).href),
  import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url).href),
  import(new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url).href),
]);

const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
  profileId: "ROOM_ROOT_HIT190",
  repositoryRoot,
});
const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const byDigest = new Map(profile.contracts.map((row) => [sha256(row.ACTION_CONTRACT_ID), row]));
const established = [
  "db7967f307be2dfd8d348fd12e205098a02373c2373fe706e3172a7ec135002c",
  "cd2a4cad42f80179f9ff385042c9438f7133fb6958966c4e50e83792b5776119",
  "386ad00269789d4dfe65ce1994039733acbe50ff6fda134ab54ce7585eb1c7d1",
].map((digest) => {
  const row = byDigest.get(digest);
  assert.ok(row, `frozen established PASS contract unavailable: ${digest}`);
  return row;
});
const financialDigest = "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a";
const financial = byDigest.get(financialDigest);
assert.ok(financial, "frozen advanced financial contract unavailable");

function candidateFor(row, { badge = null } = {}) {
  const name = badge == null
    ? row.ACTION_NAME.replace(/\s+(?:\d+\s+sekme|0)\s+(?=[^]*$)/u, " ")
    : row.ACTION_NAME;
  const isCollapsible = /rehberi/iu.test(row.ACTION_NAME);
  const parts = isCollapsible
    ? row.ACTION_NAME.includes("Sözleşme / vardiya")
      ? { kind: "COLLAPSIBLE_SECTION", title: "Sözleşme / vardiya rehberi", subtitle: "Kapanması uygun ikincil açıklamalar", badge: badge ?? "0" }
      : { kind: "COLLAPSIBLE_SECTION", title: "Sekme rehberi", subtitle: "Hangi bölümde ne beklenir?", badge: badge ?? "6 sekme" }
    : null;
  const semanticStructure = parts && typeof runtime.extractCollapsibleSectionSemanticStructure === "function"
    ? runtime.extractCollapsibleSectionSemanticStructure(parts)
    : parts;
  return {
    action: { role: row.ACTION_ROLE, name, expectedEffectClass: row.EXPECTED_EFFECT_CLASS },
    control: { tag: "BUTTON", semanticStructure },
    owner: { type: row.CONTEXTUAL_OWNER_TYPE, label: row.CONTEXTUAL_OWNER_LABEL },
    visible: true,
    enabled: true,
  };
}

function historicalFor(row) {
  return {
    action: { role: row.ACTION_ROLE, name: row.ACTION_NAME, expectedEffectClass: row.EXPECTED_EFFECT_CLASS },
    owner: { type: row.CONTEXTUAL_OWNER_TYPE, label: row.CONTEXTUAL_OWNER_LABEL },
    semanticIdentity: row.REPLAY_SEMANTIC_IDENTITY || null,
  };
}

const offscreenDiagnostic = {
  STABILITY_COMPLETE: false,
  FAILED_STABILITY_COMPONENT: "CENTER_OUTSIDE_VIEWPORT",
  PHYSICAL_FAILURE_CLASS: "DOCUMENT_SCROLL_OFFSCREEN",
  TARGET_HIT_TEST: false,
  CENTER_POINT_IN_VIEWPORT: false,
  RECT_INTERSECTS_VIEWPORT: false,
  SCROLL_CONTAINER_TYPE: "DOCUMENT",
  TARGET_RECT: { x: 32, y: 1400, width: 160, height: 44 },
  VIEWPORT: { width: 1440, height: 900 },
  DOCUMENT_SCROLL_Y: 500,
  SCROLL_ANCESTOR_SCROLL_TOP: null,
};
const inViewportDiagnostic = {
  ...offscreenDiagnostic,
  STABILITY_COMPLETE: true,
  FAILED_STABILITY_COMPONENT: null,
  PHYSICAL_FAILURE_CLASS: "TARGET_HIT_CONFIRMED",
  TARGET_HIT_TEST: true,
  CENTER_POINT_IN_VIEWPORT: true,
  RECT_INTERSECTS_VIEWPORT: true,
  TARGET_RECT: { x: 32, y: 420, width: 160, height: 44 },
  DOCUMENT_SCROLL_Y: 1460,
};

function preparationFixture({ finalDiagnostic = offscreenDiagnostic } = {}) {
  const lifecycle = {};
  const events = [];
  const first = { id: "before", executionContext: { overlayScope: "NONE" } };
  const fresh = { id: "after", executionContext: { overlayScope: "NONE" } };
  const target = { async scrollIntoViewIfNeeded(options) { events.push({ type: "scroll", options }); } };
  let stabilityCalls = 0;
  return {
    lifecycle,
    events,
    args: {
      page: {},
      surface: { route: "/room/financial-operations" },
      historicalMeta: { action: { role: "button", name: "+10 yolcu" }, materialState: {} },
      currentMeta: first,
      lifecycle,
      adapters: {
        async targetForCurrentMeta(_page, meta) {
          return {
            loc: target,
            observed: { id: meta.id },
            physicalIdentity: {
              SEMANTIC_IDENTITY: {
                candidateKey: "remaining7-preparation-fixture",
                role: "button",
                name: "+10 yolcu",
                owner: { type: "card", label: "fixture" },
                dataTestId: "fixture-target",
                tag: "BUTTON",
              },
            },
          };
        },
        async waitForSemanticStability() {
          stabilityCalls += 1;
          return stabilityCalls === 1
            ? { ok: false, diagnostic: offscreenDiagnostic, completion: { requiredEvidence: ["TARGET_HIT_TEST"] } }
            : { ok: finalDiagnostic.STABILITY_COMPLETE, diagnostic: finalDiagnostic, completion: { requiredEvidence: ["TARGET_HIT_TEST"] } };
        },
        async resolveFreshSemanticAction() { return fresh; },
      },
    },
  };
}

async function validationSummary() {
  return runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190", validateStart: true });
}

const checks = [
  ["RED-1 frozen 6-sekme collapsible identity resolves against a badge-free current label", () => assert.ok(runtime.resolveRoomReplaySemanticCandidate(historicalFor(established[0]), [candidateFor(established[0])]))],
  ["RED-2 frozen zero-badge collapsible identity resolves against a badge-free current label", () => assert.ok(runtime.resolveRoomReplaySemanticCandidate(historicalFor(established[1]), [candidateFor(established[1])]))],
  ["RED-3 structural badge normalization preserves legitimate numeric title text", () => {
    assert.equal(typeof hybrid.normalizeCollapsibleSectionSemanticName, "function");
    assert.equal(hybrid.normalizeCollapsibleSectionSemanticName("Hat 12 Durum", { kind: "COLLAPSIBLE_SECTION", title: "Hat 12", subtitle: "Durum" }), "hat 12 durum");
  }],
  ["RED-4 db7967 established PASS identity has current semantic resolution", () => assert.ok(runtime.resolveRoomReplaySemanticCandidate(historicalFor(established[0]), [candidateFor(established[0])]))],
  ["RED-5 cd2a4c established PASS identity has current semantic resolution", () => assert.ok(runtime.resolveRoomReplaySemanticCandidate(historicalFor(established[1]), [candidateFor(established[1])]))],
  ["RED-6 386ad0 established PASS identity has current semantic resolution", () => assert.ok(runtime.resolveRoomReplaySemanticCandidate(historicalFor(established[2]), [candidateFor(established[2])]))],
  ["RED-7 unchanged scroll state cannot be preparation success", async () => {
    const fixture = preparationFixture();
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args));
    assert.equal(fixture.lifecycle.SCROLL_PREPARATION_COMPLETED, false);
    assert.equal(fixture.lifecycle.SCROLL_PRIMITIVE_RESOLVED_NO_EFFECT, true);
  }],
  ["RED-8 invalid final center cannot be preparation success", async () => {
    const fixture = preparationFixture();
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args));
    assert.equal(fixture.lifecycle.SCROLL_SUCCESS_WITH_INVALID_FINAL_CENTER, false);
  }],
  ["RED-9 failed final hit test cannot be preparation success", async () => {
    const fixture = preparationFixture();
    await assert.rejects(() => runtime.prepareCurrentSemanticTargetForAction(fixture.args));
    assert.equal(fixture.lifecycle.SCROLL_SUCCESS_WITH_FAILED_FINAL_HIT_TEST, false);
  }],
  ["RED-10 successful scroll/actionability path records proven preparation", async () => {
    const fixture = preparationFixture({ finalDiagnostic: inViewportDiagnostic });
    await runtime.prepareCurrentSemanticTargetForAction(fixture.args);
    assert.equal(fixture.lifecycle.SCROLL_PREPARATION_SUCCEEDED, true);
  }],
  ["RED-11 document scrolling element is classified as document owner", () => {
    assert.equal(typeof runtime.classifyScrollOwnerTelemetry, "function");
    assert.equal(runtime.classifyScrollOwnerTelemetry({ scrollableAncestors: [{ tag: "HTML", documentScrollingElement: true }], documentScrollable: true }).SCROLL_CONTAINER_TYPE, "DOCUMENT");
  }],
  ["RED-12 genuine nested scroll owner remains nested", () => {
    assert.equal(typeof runtime.classifyScrollOwnerTelemetry, "function");
    assert.equal(runtime.classifyScrollOwnerTelemetry({ scrollableAncestors: [{ tag: "DIV" }], documentScrollable: true }).SCROLL_CONTAINER_TYPE, "NESTED");
  }],
  ["RED-13 null semantic resolution retains raw filter diagnostics", () => {
    assert.equal(typeof runtime.resolveFreshSemanticActionWithDiagnostics, "function");
    const record = runtime.resolveFreshSemanticActionWithDiagnostics(historicalFor(financial), []);
    assert.equal(record.currentMeta, null);
    assert.equal(record.resolutionDiagnostics.ENUMERATED_CANDIDATE_COUNT, 0);
  }],
  ["RED-14 null semantic resolution produces a durable rejection stage", () => {
    assert.equal(typeof runtime.resolveFreshSemanticActionWithDiagnostics, "function");
    const record = runtime.resolveFreshSemanticActionWithDiagnostics(historicalFor(financial), []);
    assert.equal(record.resolutionDiagnostics.REJECTION_STAGE, "ROLE_NAME");
  }],
  ["RED-15 advanced financial disclosure asserts the expected input", () => {
    const nested = financial.STATE_RECIPE.assert.find((step) => step.summary === financial.REPLAY_SEMANTIC_IDENTITY.requiredState.nativeDisclosureSummary);
    assert.deepEqual(nested.expectedControl, {
      role: "spinbutton",
      controlTag: "input",
      inputType: "number",
      name: financial.REPLAY_SEMANTIC_IDENTITY.accessibleName,
    });
  }],
  ["RED-16 expected-control assertion cannot become a semantic resolution shortcut", () => {
    const nested = financial.STATE_RECIPE.assert.find((step) => step.summary === financial.REPLAY_SEMANTIC_IDENTITY.requiredState.nativeDisclosureSummary);
    assert.ok(nested.expectedControl);
    assert.equal(runtime.resolveRoomReplaySemanticCandidate(historicalFor(financial), []), null);
  }],
  ["RED-17 actual validate-start reports safe scroll primitive and no direct click fallback", async () => {
    const summary = await validationSummary();
    assert.equal(summary.SCROLL_PREPARATION_METHOD, "PLAYWRIGHT_SCROLL_INTO_VIEW_IF_NEEDED");
    assert.equal(summary.JAVASCRIPT_DIRECT_CLICK_INTRODUCED, "NO");
    assert.equal(summary.FORCE_CLICK_INTRODUCED, "NO");
  }],
  ["RED-18 actual validate-start declares no ROOT-HIT physical closure without browser evidence", async () => {
    const summary = await validationSummary();
    assert.equal(summary.NO_BROWSER_ROOT_HIT_PHYSICAL_CLOSURE_COUNT, 0);
    assert.equal(summary.NO_BROWSER_FULL_INTERACTION_CLOSURE_COUNT, 0);
  }],
];

let passed = 0;
let failed = 0;
for (const [name, check] of checks) {
  if (redMode) {
    try {
      await check();
      passed += 1;
      console.error(`RED_UNEXPECTED_PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`RED_OBSERVED ${name}: ${error.message}`);
    }
  } else {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  }
}

const report = redMode
  ? {
    CORRECTIVE_RED_TEST_COUNT: checks.length,
    CORRECTIVE_RED_OBSERVED_COUNT: failed,
    CORRECTIVE_RED_UNEXPECTED_PASS_COUNT: passed,
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  }
  : {
    FOCUSED_TEST_TOTAL: checks.length,
    FOCUSED_TEST_PASS: passed,
    FOCUSED_TEST_FAIL: 0,
    ACTUAL_ROOT_HIT190_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
    ACTUAL_SEMANTIC_RESOLVER_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_COLLAPSIBLE_NAME_EXTRACTION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_GEOMETRY_PREPARATION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_NULL_RESOLUTION_DIAGNOSTIC_PATH_EXECUTED_IN_TEST: "YES",
    REAL_BROWSER_RUN_STARTED: "NO",
    CHROMIUM_PROCESS_STARTED: "NO",
    PLAYWRIGHT_BROWSER_CONNECTED: "NO",
  };
console.log(JSON.stringify(report, null, 2));
if (redMode) process.exitCode = failed === checks.length && passed === 0 ? 1 : 2;
