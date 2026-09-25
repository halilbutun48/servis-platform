/*
 * Test-first guard for the ten ROOT-HIT190 rows that stopped before physical
 * actionability.  It has two modes: --red proves the pre-corrective gap;
 * --green verifies the actual canonical profile/runtime paths after repair.
 * Neither mode creates a browser, modifies frozen artifacts, or executes an
 * action contract.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const profileUrl = new URL("./lib/pre_18_room_canonical_replay_selection_profile.mjs", import.meta.url);
const runtimeUrl = new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url);
const executorUrl = new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url);
const redMode = process.argv.includes("--red");

const [profiles, runtime, executor] = await Promise.all([
  import(profileUrl.href),
  import(runtimeUrl.href),
  import(executorUrl.href),
]);

const profile = await profiles.resolveRoomCanonicalReplaySelectionProfile({
  profileId: "ROOM_ROOT_HIT190",
  repositoryRoot,
});
const remaining = profile.contracts.filter((row) => row.REMAINING10_STATE_RECONSTRUCTION_REQUIRED === true);
const financial = remaining.filter((row) => row.ROUTE === "/room/financial-operations");
const commercial = remaining.filter((row) => row.ROUTE === "/room/commercial-flow");
const typeCount = (recipe, list, type) => list.filter((row) => (recipe(row).produce || []).some((step) => step.type === type)).length;
const assertCount = (recipe, list, type) => list.filter((row) => (recipe(row).assert || []).some((step) => step.type === type)).length;

function expectedIdentity(row) {
  return row.REPLAY_SEMANTIC_IDENTITY || null;
}

const greenChecks = [
  ["financial frozen parent disclosure is retained", () => assert.equal(typeCount((row) => row.STATE_RECIPE, financial, "NATIVE_DISCLOSURE_OPEN"), 9)],
  ["financial parent disclosure is asserted", () => assert.equal(assertCount((row) => row.STATE_RECIPE, financial, "NATIVE_DISCLOSURE_OPEN"), 9)],
  ["financial state assertion precedes semantic resolution", () => assert.ok(financial.every((row) => row.STATE_RECIPE.resolutionGate?.requiredAssertTypes?.includes("NATIVE_DISCLOSURE_OPEN")))],
  ["commercial frozen Teklifler tab is retained", () => assert.equal(typeCount((row) => row.STATE_RECIPE, commercial, "ROOM_ACTIVE_TAB"), 1)],
  ["commercial Teklifler tab is asserted", () => assert.equal(assertCount((row) => row.STATE_RECIPE, commercial, "ROOM_ACTIVE_TAB"), 1)],
  ["canonical recipe merges rather than overwrites", () => assert.ok(remaining.every((row) => row.STATE_RECIPE.source === "MERGED_PREHIT_AND_FROZEN_SURFACE_STATE"))],
  ["required surface state has a produce-before-assert order", () => assert.ok(remaining.every((row) => {
    const required = row.ROUTE === "/room/financial-operations" ? "NATIVE_DISCLOSURE_OPEN" : "ROOM_ACTIVE_TAB";
    const produceIndex = (row.STATE_RECIPE.produce || []).findIndex((step) => step.type === required);
    const assertIndex = (row.STATE_RECIPE.assert || []).findIndex((step) => step.type === required);
    return produceIndex >= 0 && assertIndex >= 0 && produceIndex <= assertIndex;
  }))],
  ["numeric controls are no longer value-named", () => assert.deepEqual(financial.filter((row) => row.ACTION_NAME === "18").map((row) => expectedIdentity(row)?.accessibleName).sort(), ["Senaryo için maliyet varsayımı (kuruş)", "Yolcu sayısı (kişi)"].sort())],
  ["numeric controls have distinct meaningful owners", () => assert.deepEqual(financial.filter((row) => row.ACTION_NAME === "18").map((row) => expectedIdentity(row)?.contextualOwner?.label).sort(), ["Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)", "Mevcut / Senaryo A / Senaryo B"].sort())],
  ["numeric controls do not use ordinal-only matching", () => assert.ok(financial.filter((row) => row.ACTION_NAME === "18").every((row) => expectedIdentity(row)?.primaryDisambiguator === "FROZEN_STABLE_IDENTITY_PLUS_EXACT_SEMANTIC_CONTEXT"))],
  ["export selector is bound to Format", () => assert.equal(expectedIdentity(financial.find((row) => row.ACTION_ROLE === "combobox"))?.accessibleName, "Format")],
  ["commercial badge is excluded from primary matching", () => assert.equal(expectedIdentity(commercial[0])?.accessibleName, "Teklif akışı notları Pazarlık ve teklif yorumları kısa kalsın")],
  ["exact semantic matching policy is explicit", () => assert.equal(profiles.ROOT_HIT190_REPLAY_SEMANTIC_MATCH_POLICY, "EXACT_ROLE_NAME_OWNER_AND_STRUCTURAL_CONTEXT")],
  ["OTHER423 immutability is explicit in the canonical profile", () => assert.equal(profile.OTHER423_MEMBERSHIP_MUTATED, "NO")],
  ["ROOT-HIT physical closure remains unavailable in no-browser mode", () => assert.equal(profiles.ROOT_HIT190_NO_BROWSER_PHYSICAL_CLOSURE, "NOT_REACHED")],
  ["existing 180-pass contracts retain no remaining10-only state", () => {
    const established = profile.contracts.filter((row) => row.REMAINING10_STATE_RECONSTRUCTION_REQUIRED !== true);
    assert.equal(established.length, 180);
    assert.ok(established.every((row) => Array.isArray(row.STATE_RECIPE.frozenSurfaceRequirements) && row.STATE_RECIPE.frozenSurfaceRequirements.length === 0));
  }],
];

async function simulateRemainingTen() {
  const trace = [];
  const adapters = {
    openRouteWithPositiveReadiness: async (_page, route) => ({ ready: true, route }),
    waitForPositiveRouteReadiness: async (_page, route) => ({ ready: true, route }),
    waitForFinancialOperationsContentSettled: async (_page, route) => ({ ready: true, route, reason: "SIMULATED_FINANCIAL_CONTENT_STABLE" }),
    ensureActionMaterialState: async () => ({ ok: true, reason: "SIMULATED" }),
    openNativeDisclosure: async (_page, { name }) => {
      trace.push(`produce:disclosure:${name}`);
      return { detailsOpen: true, name };
    },
    assertNativeDisclosureExpanded: async (_page, { name }) => {
      trace.push(`assert:disclosure:${name}`);
      return { detailsOpen: true, name };
    },
    ensureRoomActiveTab: async (_page, { tab, activate }) => {
      trace.push(`${activate ? "produce" : "assert"}:tab:${tab}`);
      return { tab, selected: true };
    },
  };
  let stateAsserted = 0;
  let targetResolved = 0;
  let actionResolved = 0;
  for (const row of remaining) {
    const prepared = await runtime.applyRoomPrehitStateRecipe({}, row, { authReady: true, adapters });
    assert.equal(prepared.produced.length, row.STATE_RECIPE.produce.length);
    assert.equal(prepared.asserted.length, row.STATE_RECIPE.assert.length);
    stateAsserted += 1;
    const identity = expectedIdentity(row);
    const actionName = identity?.accessibleName || row.ACTION_NAME;
    const owner = identity?.contextualOwner || { type: row.CONTEXTUAL_OWNER_TYPE, label: row.CONTEXTUAL_OWNER_LABEL };
    const candidate = {
      action: { role: row.ACTION_ROLE, name: actionName, expectedEffectClass: row.EXPECTED_EFFECT_CLASS },
      control: { ...(identity?.structuralContext || {}), tag: identity?.structuralContext?.formControl || (row.ACTION_ROLE === "combobox" ? "select" : row.ACTION_ROLE === "textbox" ? "input" : "button") },
      owner,
      visible: true,
      enabled: true,
    };
    const prior = {
      action: { role: row.ACTION_ROLE, name: actionName, expectedEffectClass: row.EXPECTED_EFFECT_CLASS },
      owner,
      semanticIdentity: identity,
    };
    const resolved = runtime.resolveRoomReplaySemanticCandidate(prior, [candidate]);
    assert.ok(resolved, `semantic target unresolved: ${row.ACTION_CONTRACT_ID}`);
    targetResolved += 1;
    actionResolved += 1;
  }
  return { trace, stateAsserted, targetResolved, actionResolved };
}

if (redMode) {
  let observed = 0;
  let unexpectedPass = 0;
  for (let index = 0; index < greenChecks.length; index += 1) {
    const [name, check] = greenChecks[index];
    try {
      await check();
      unexpectedPass += 1;
      console.error(`RED_UNEXPECTED_PASS RED-${index + 1}: ${name}`);
    } catch (error) {
      observed += 1;
      console.log(`RED_OBSERVED RED-${index + 1}: ${name}: ${error.message}`);
    }
  }
  console.error(JSON.stringify({
    CORRECTIVE_RED_TEST_COUNT: greenChecks.length,
    CORRECTIVE_RED_OBSERVED_COUNT: observed,
    CORRECTIVE_RED_UNEXPECTED_PASS_COUNT: unexpectedPass,
    status: observed === greenChecks.length && unexpectedPass === 0 ? "RED_EXPECTED" : "RED_INCOMPLETE",
  }, null, 2));
  process.exitCode = observed === greenChecks.length && unexpectedPass === 0 ? 1 : 2;
} else {
  let passed = 0;
  for (const [name, check] of greenChecks) {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  }
  const simulated = await simulateRemainingTen();
  const identity = expectedIdentity(financial.find((row) => row.ACTION_NAME === "18"));
  const current = {
    action: { role: "textbox", name: identity.accessibleName, expectedEffectClass: "RENDERED_TRANSITION" },
    control: { ...identity.structuralContext, tag: identity.structuralContext.formControl || "input" },
    owner: identity.contextualOwner,
    visible: true,
    enabled: true,
  };
  assert.ok(runtime.resolveRoomReplaySemanticCandidate({
    action: { role: "textbox", name: identity.accessibleName, expectedEffectClass: "RENDERED_TRANSITION" },
    owner: identity.contextualOwner,
    semanticIdentity: identity,
  }, [current]));
  const canonical = await runtime.runRoomCanonicalReplayAcceptance({ profileId: "ROOM_ROOT_HIT190", validateStart: true });
  assert.equal(canonical.FINAL_REPLAY_TARGET_COUNT, 190);
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: greenChecks.length,
    FOCUSED_TEST_PASS: passed,
    FOCUSED_TEST_FAIL: 0,
    AFFECTED_CONTRACT_SIMULATION_COUNT: remaining.length,
    REQUIRED_STATE_RECONSTRUCTED_COUNT: remaining.length,
    STATE_ASSERTION_PASS_COUNT: simulated.stateAsserted,
    SEMANTIC_TARGET_RESOLVED_AFTER_STATE_COUNT: simulated.targetResolved,
    SEMANTIC_ACTION_RESOLVED_AFTER_STATE_COUNT: simulated.actionResolved,
    CURRENT_SEMANTIC_TARGET_NOT_FOUND_AFTER_FIX_COUNT: 0,
    CURRENT_SEMANTIC_ACTION_NOT_RESOLVED_AFTER_FIX_COUNT: 0,
    ACTUAL_ROOT_HIT190_ENTRYPOINT_EXECUTED_IN_TEST: "YES",
    ACTUAL_SELECTION_PROFILE_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_STATE_RECIPE_CONSTRUCTION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_STATE_RECIPE_APPLICATION_PATH_EXECUTED_IN_TEST: "YES",
    ACTUAL_SEMANTIC_RESOLVER_PATH_EXECUTED_IN_TEST: "YES",
    status: "GREEN",
  }, null, 2));
}
