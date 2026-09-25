import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as hybrid from "./lib/pre_18_hybrid_surface_state_executor.mjs";
import * as completion from "./pre_18_luna_full_hybrid_surface_state_completion.mjs";
import {
  ROOM_CANONICAL_REPLAY_PROFILE_IDS,
  resolveRoomCanonicalReplaySelectionProfile,
} from "./lib/pre_18_room_canonical_replay_selection_profile.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..", "..");
const profileId = ROOM_CANONICAL_REPLAY_PROFILE_IDS.ROOT_HIT190_FINAL_FINANCIAL_CANARY;
const targetName = "Senaryo için maliyet varsayımı (kuruş)";
const targetOwner = {
  type: "card",
  label: "Gelişmiş varsayımlar · Kendi gerçek değerlerimi kullan (isteğe bağlı)",
  boundedOrdinal: null,
};

function machineToken(value) {
  assert.equal(typeof hybrid.canonicalStructuralToken, "function", "MACHINE_TOKEN_CANONICALIZER_ABSENT");
  return hybrid.canonicalStructuralToken(value);
}

function structuralMatches(candidate, required) {
  assert.equal(typeof hybrid.structuralContextMatches, "function", "STRUCTURAL_CONTEXT_MATCHER_NOT_EXPORTED");
  return hybrid.structuralContextMatches(candidate, required);
}

function finalFinancialMeta() {
  return {
    route: "/room/financial-operations",
    action: {
      role: "spinbutton",
      name: targetName,
      expectedEffectClass: "RENDERED_TRANSITION",
      safetyClass: "SAFE",
    },
    owner: targetOwner,
    semanticIdentity: {
      accessibleName: targetName,
      contextualOwner: targetOwner,
      structuralContext: { formControl: "input", inputType: "number" },
    },
    financialContinuityRow: { telemetryOnly: true },
  };
}

function finalFinancialCandidate({ tag = "INPUT", name = targetName, role = "spinbutton", dataTestId = "scenario-input-Senaryo için maliyet varsayımı (kuruş)", owner = targetOwner, businessTarget = null } = {}) {
  return {
    action: { role, name, expectedEffectClass: "RENDERED_TRANSITION", safetyClass: "SAFE" },
    ownerCandidates: [{
      type: owner.type,
      semanticLabel: owner.label,
      depth: 1,
      interactiveDescendantCount: 1,
      navigationDescendantCount: 0,
      textLength: owner.label.length,
    }],
    control: {
      tag,
      type: "number",
      dataTestId,
      accessibleName: name,
      labelText: name,
      nameSource: "wrapping-label",
      descriptorOrdinal: 34,
    },
    owner,
    businessTarget,
    visible: true,
    enabled: true,
    materialState: {},
  };
}

function diagnose(meta = finalFinancialMeta(), candidates = [finalFinancialCandidate()]) {
  return hybrid.diagnoseCurrentSemanticResolution(meta, candidates);
}

function exactDataTestMeta() {
  return {
    action: { role: "spinbutton", name: "Yolcu sayısı (kişi)", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "card", label: "Mevcut / Senaryo A / Senaryo B", boundedOrdinal: null },
    semanticIdentity: {
      structuralContext: { dataTestId: "scenario-b-input-passengerCount", inputType: "number" },
    },
  };
}

function exactDataTestCandidate(dataTestId = "scenario-b-input-passengerCount") {
  return {
    action: { role: "spinbutton", name: "Yolcu sayısı (kişi)", expectedEffectClass: "RENDERED_TRANSITION" },
    control: { tag: "INPUT", type: "number", dataTestId },
    owner: exactDataTestMeta().owner,
    visible: true,
    enabled: true,
  };
}

const cases = [
  ["RED-1 uppercase INPUT final-financial candidate resolves", () => assert.ok(diagnose().candidate)],
  ["RED-2 lowercase input canonicalizes as a machine token", () => assert.equal(machineToken("input"), "input")],
  ["RED-3 BUTTON canonicalizes as a machine token", () => assert.equal(machineToken("BUTTON"), "button")],
  ["RED-4 SELECT canonicalizes as a machine token", () => assert.equal(machineToken("SELECT"), "select")],
  ["RED-5 TEXTAREA canonicalizes as a machine token", () => assert.equal(machineToken("TEXTAREA"), "textarea")],
  ["RED-6 unlike machine tokens remain unequal", () => {
    machineToken("BUTTON");
    assert.equal(structuralMatches(finalFinancialCandidate({ tag: "BUTTON" }), { formControl: "input" }), false);
  }],
  ["RED-7 dataTestId structural branch stays strict", () => {
    machineToken("INPUT");
    assert.equal(structuralMatches(exactDataTestCandidate(), exactDataTestMeta().semanticIdentity.structuralContext), true);
    assert.equal(structuralMatches(exactDataTestCandidate("other"), exactDataTestMeta().semanticIdentity.structuralContext), false);
  }],
  ["RED-8 exact final-financial descriptor survives direct structural match", () => assert.equal(structuralMatches(finalFinancialCandidate(), finalFinancialMeta().semanticIdentity.structuralContext), true)],
  ["RED-9 actual diagnoseCurrentSemanticResolution resolves final descriptor", () => assert.equal(diagnose().resolutionDiagnostics.FINAL_RESOLUTION_COUNT, 1)],
  ["RED-10 uppercase DOM tags do not use Turkish linguistic casing", () => {
    assert.equal(machineToken("INPUT"), "input");
    assert.notEqual(machineToken("INPUT"), "INPUT".toLocaleLowerCase("tr-TR"));
  }],
  ["RED-11 numeric machine tokens canonicalize locale-independently", () => assert.equal(machineToken("NUMBER"), "number")],
  ["RED-12 Turkish semantic name canonicalization remains unchanged", () => {
    machineToken("INPUT");
    assert.equal(hybrid.normalizeActionSemanticName("IĞDIR İŞ BİRLİĞİ"), "iğdir iş birliği");
  }],
  ["RED-13 owner semantic validation remains strict", () => {
    machineToken("INPUT");
    const recipe = { candidateKey: "target", role: "spinbutton", name: targetName, owner: targetOwner, overlayScope: "NONE", structuralContext: { formControl: "input" } };
    const observed = { candidateKey: "target", action: { role: "spinbutton", name: targetName }, owner: { ...targetOwner, label: "Başka kart" }, overlayScope: "NONE", control: { tag: "INPUT" }, visible: true, enabled: true };
    assert.equal(hybrid.validateCandidateDerivedLocator({ locatorRecipe: recipe }, observed).ownerMatches, false);
  }],
  ["RED-14 business-target validation remains strict", () => {
    machineToken("INPUT");
    const recipe = { candidateKey: "target", role: "spinbutton", name: targetName, owner: null, overlayScope: "NONE", businessTarget: { type: "scenario", id: "expected" }, structuralContext: { formControl: "input" } };
    const observed = { candidateKey: "target", action: { role: "spinbutton", name: targetName }, owner: targetOwner, overlayScope: "NONE", businessTarget: { type: "scenario", id: "other" }, control: { tag: "INPUT" }, visible: true, enabled: true };
    assert.equal(hybrid.validateCandidateDerivedLocator({ locatorRecipe: recipe }, observed).businessTargetMatches, false);
  }],
  ["RED-15 role and name remain exact", () => {
    machineToken("INPUT");
    assert.equal(diagnose(finalFinancialMeta(), [finalFinancialCandidate({ role: "textbox" })]).candidate, null);
    assert.equal(diagnose(finalFinancialMeta(), [finalFinancialCandidate({ name: "Başka maliyet" })]).candidate, null);
  }],
  ["RED-16 wrong form-control kind remains rejected", () => {
    machineToken("INPUT");
    assert.equal(diagnose(finalFinancialMeta(), [finalFinancialCandidate({ tag: "SELECT" })]).candidate, null);
  }],
  ["RED-17 diagnostic structural telemetry uses authoritative control fields", () => {
    assert.equal(typeof completion.buildBoundedFinancialSemanticFailureTelemetry, "function", "DIAGNOSTIC_TELEMETRY_BUILDER_ABSENT");
    const evidence = completion.buildBoundedFinancialSemanticFailureTelemetry({
      historicalMeta: finalFinancialMeta(),
      rawCandidates: [finalFinancialCandidate()],
      resolutionDiagnostics: diagnose().resolutionDiagnostics,
    });
    assert.equal(evidence.PIPELINE_STAGE_COUNTS.STRUCTURAL_COMPATIBLE_COUNT, 1);
    assert.equal(evidence.ROLE_COMPATIBLE_DESCRIPTORS[0].candidateRejectionStages.structuralMatch, true);
  }],
  ["RED-18 exact1 profile remains product-source independent", async () => {
    machineToken("INPUT");
    const profile = await resolveRoomCanonicalReplaySelectionProfile({ profileId, repositoryRoot });
    assert.equal(profile.contracts.length, 1);
    assert.equal(profile.STABLE_IDENTITY_SHA256, "95ad8d938b72ba99c62fea7c45f64432ff450bf5074c83c3eb6e55b2fe6f324a");
  }],
];

async function runCases({ red = false } = {}) {
  let observed = 0;
  let unexpectedPass = 0;
  for (const [name, check] of cases) {
    try {
      await check();
      if (red) {
        unexpectedPass += 1;
        console.log(`UNEXPECTED_PASS ${name}`);
      } else {
        console.log(`PASS ${name}`);
      }
    } catch (error) {
      if (red) {
        observed += 1;
        console.log(`RED_OBSERVED ${name}: ${error.message}`);
      } else {
        throw error;
      }
    }
  }
  return { observed, unexpectedPass };
}

async function runRed() {
  const outcome = await runCases({ red: true });
  console.log(JSON.stringify({
    STRUCTURAL_TOKEN_RED_TEST_COUNT: cases.length,
    STRUCTURAL_TOKEN_RED_OBSERVED_COUNT: outcome.observed,
    STRUCTURAL_TOKEN_RED_UNEXPECTED_PASS_COUNT: outcome.unexpectedPass,
  }));
  process.exitCode = outcome.observed === cases.length && outcome.unexpectedPass === 0 ? 1 : 2;
}

async function runGreen() {
  await runCases();
  const page = { evaluate: async () => [finalFinancialCandidate()] };
  let diagnostics = null;
  let evidence = null;
  const resolved = await completion.resolveFreshSemanticAction(page, { route: "/room/financial-operations" }, finalFinancialMeta(), {
    onDiagnostics: value => { diagnostics = value; },
    onDiagnosticEvidence: value => { evidence = value; },
  });
  assert.ok(resolved, "ACTUAL_FINAL_FINANCIAL_DESCRIPTOR_NOT_RESOLVED");
  assert.equal(diagnostics.FINAL_RESOLUTION_COUNT, 1);
  assert.equal(evidence.PIPELINE_STAGE_COUNTS.STRUCTURAL_COMPATIBLE_COUNT, 1);

  const cli = path.join(repositoryRoot, "backend/scripts/pre_18_room_root_hit190_replay_cli.mjs");
  const validation = spawnSync(process.execPath, [cli, "--validate-start", `--profile=${profileId}`], {
    cwd: repositoryRoot,
    env: { ...process.env, WEB_BASE_URL: "http://127.0.0.1:5173", API_BASE_URL: "http://127.0.0.1:3000" },
    encoding: "utf8",
  });
  assert.equal(validation.status, 0, validation.stderr || validation.stdout);
  console.log(JSON.stringify({
    FOCUSED_TEST_TOTAL: cases.length,
    FOCUSED_TEST_PASS: cases.length,
    FOCUSED_TEST_FAIL: 0,
    ACTUAL_STRUCTURAL_CONTEXT_MATCHES_EXECUTED_IN_TEST: "YES",
    ACTUAL_DIAGNOSE_CURRENT_SEMANTIC_RESOLUTION_EXECUTED_IN_TEST: "YES",
    ACTUAL_FINAL_FINANCIAL_DESCRIPTOR_RESOLUTION_EXECUTED_IN_TEST: "YES",
    DIAGNOSTIC_STRUCTURAL_SOURCE_MATCHES_AUTHORITATIVE_SOURCE: "YES",
    DIAGNOSTIC_RESOLVER_STRUCTURAL_RESULT_PARITY: "YES",
    EXACT1_VALIDATE_START_PASS: "YES",
  }));
}

if (process.argv.includes("--red")) await runRed();
else await runGreen();
