/* CAL-03 RED -> GREEN guard: machine tokens are never Turkish linguistic text. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const redMode = process.argv.includes("--red");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const hybrid = await import(new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url));
const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

function descriptor({ overlayScope = "DIALOG" } = {}) {
  return {
    action: { role: "button", name: "Ayrıntılar", expectedEffectClass: "RENDERED_TRANSITION" },
    owner: { type: "card", label: "Kart" },
    businessTarget: { type: "ITEM", id: "1" },
    businessContext: "Kart",
    overlayScope,
    control: { tag: "BUTTON" },
    visible: true,
    enabled: true,
  };
}

test("CAL03-RED-1 uppercase INPUT plus NUMBER derives spinbutton", () => {
  assert.equal(hybrid.deriveImplicitAriaRole({ tag: "INPUT", type: "NUMBER" }), "spinbutton");
});

test("CAL03-RED-2 uppercase BUTTON derives button", () => {
  assert.equal(hybrid.deriveImplicitAriaRole({ tag: "BUTTON" }), "button");
  // BUTTON happens to survive Turkish lower-casing by accident. The branch
  // still must not retain a linguistic-token dependency.
  return fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8")
    .then((source) => assert.equal(source.includes("canonicalText(tag)"), false));
});

test("CAL03-RED-3 uppercase explicit machine role preserves ASCII I", () => {
  assert.equal(hybrid.deriveImplicitAriaRole({ explicitRole: "MENUITEM" }), "menuitem");
});

test("CAL03-RED-4 collapsible structure kind is a locale-independent machine token", () => {
  assert.equal(hybrid.normalizeCollapsibleSectionSemanticName("Başlık 16 Alt", {
    kind: "COLLAPSIBLE_SECTION",
    title: "Başlık",
    subtitle: "Alt",
  }), "başlik alt");
  return fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8")
    .then((source) => assert.equal(source.includes("canonicalText(structure?.kind)"), false));
});

test("CAL03-RED-5 ITEM business-target type remains identical across casing", () => {
  const result = hybrid.diagnoseCurrentSemanticResolution({
    action: { role: "button", name: "Ayrıntılar" },
    owner: { type: "card", label: "Kart" },
    businessTarget: { type: "ITEM", id: "1" },
    businessContext: "Kart",
  }, [descriptor({ overlayScope: "NONE" })]);
  assert.ok(result.candidate);
  return fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8")
    .then((source) => assert.equal(source.includes("canonicalText(left.type)"), false));
});

test("CAL03-RED-6 MULTIPLE physical scroll enum retains nested classification", () => {
  const diagnostic = hybrid.buildSemanticStabilityDiagnostic({
    targetOverlayScope: "NONE",
    observed: { targetHitTest: false },
    target: {
      TARGET_RECT: { width: 10, height: 10 },
      CENTER_POINT_IN_VIEWPORT: false,
      SCROLL_CONTAINER_TYPE: "MULTIPLE",
    },
  });
  assert.equal(diagnostic.PHYSICAL_FAILURE_CLASS, "NESTED_SCROLL_OFFSCREEN");
  return fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8")
    .then((source) => assert.equal(source.includes("return canonicalText(value).toUpperCase()"), false));
});

test("CAL03-RED-7 overlay scope comparison is locale independent", () => {
  const context = {
    currentOwner: { type: "card", label: "Kart" },
    locatorRecipe: {
      candidateKey: null,
      role: "button",
      name: "Ayrıntılar",
      overlayScope: "DIALOG",
      businessTarget: null,
      structuralContext: { formControl: "button" },
    },
  };
  const observed = descriptor({ overlayScope: "dialog" });
  const first = hybrid.validateCandidateDerivedLocator(context, observed);
  context.locatorRecipe.candidateKey = JSON.stringify({
    role: observed.action.role,
    name: observed.action.name,
    businessContext: observed.businessContext,
    businessTarget: observed.businessTarget,
    ownerType: observed.owner.type,
    ownerLabel: observed.owner.label,
    overlayScope: "NONE",
    expectedEffect: observed.action.expectedEffectClass,
  });
  assert.equal(first.overlayMatches, true);
});

test("CAL03-RED-8 pointer recovery compares overlay machine scope without linguistic casing", () => {
  const recovery = hybrid.planPointerInterceptionRecovery({
    message: "drawer intercepts pointer events",
    interceptedOverlay: { type: "dialog", title: "Kart" },
    executionContext: { overlayScope: "DIALOG", targetRequiresOverlay: true },
  });
  assert.equal(recovery.strategy, "RERESOLVE_INSIDE_REQUIRED_OVERLAY");
  return fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8")
    .then((source) => assert.equal(source.includes("canonicalText(executionContext.overlayScope)"), false));
});

test("CAL03-RED-9 owner type comparison has no Turkish linguistic token path", async () => {
  const source = await fs.readFile(path.join(root, "backend/scripts/lib/pre_18_hybrid_surface_state_executor.mjs"), "utf8");
  assert.equal(source.includes("canonicalText(owner.type)"), false);
});

test("CAL03-RED-10 Turkish visible semantic text remains linguistic while INPUT is machine-normalized", () => {
  assert.deepEqual([
    hybrid.normalizeActionSemanticName("İŞLEMLER"),
    hybrid.deriveImplicitAriaRole({ tag: "INPUT", type: "TEXT" }),
  ], ["işlemler", "textbox"]);
});

let failures = 0;
let passes = 0;
for (const item of cases) {
  try {
    await item.fn();
    passes += 1;
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${item.name}: ${error.message}`);
  }
}

if (redMode) {
  console.log(JSON.stringify({ CAL03_RED_TEST_COUNT: cases.length, CAL03_RED_OBSERVED_COUNT: failures, CAL03_RED_UNEXPECTED_PASS_COUNT: passes }));
  if (failures !== cases.length) process.exitCode = 1;
} else if (failures) {
  console.log(`PRE_18_HARNESS_CAL03_MACHINE_NORMALIZATION_CHECK=RED (${failures}/${cases.length})`);
  process.exitCode = 1;
} else {
  console.log("PRE_18_HARNESS_CAL03_MACHINE_NORMALIZATION_CHECK=PASS");
}
