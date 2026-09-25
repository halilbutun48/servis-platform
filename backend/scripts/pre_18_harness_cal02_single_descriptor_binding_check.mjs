/*
 * CAL-02 RED -> GREEN guard.
 *
 * The page double models only the Playwright boundary.  Resolution and binding
 * use the production executor/runner functions; no browser is launched.
 */
import assert from "node:assert/strict";

process.env.WEB_BASE_URL = "http://127.0.0.1:5173";
process.env.API_BASE_URL = "http://127.0.0.1:3000";

const redMode = process.argv.includes("--red");
const runtime = await import(new URL("./pre_18_luna_full_hybrid_surface_state_completion.mjs", import.meta.url));
const hybrid = await import(new URL("./lib/pre_18_hybrid_surface_state_executor.mjs", import.meta.url));

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

function currentCandidate(overrides = {}) {
  const base = {
    action: { role: "button", name: "Maliyet ve operasyon ayrıntıları", expectedEffectClass: "DISCLOSURE_CHANGE", safetyClass: "SAFE" },
    owner: { type: "card", label: "Karşılaştırma, senaryo ve dışa aktarım", boundedOrdinal: null },
    businessTarget: { type: "SCENARIO", id: "financial-1" },
    businessContext: "Karşılaştırma, senaryo ve dışa aktarım",
    overlayScope: "NONE",
    control: { tag: "BUTTON", dataTestId: "financial-details", descriptorOrdinal: 0 },
    visible: true,
    enabled: true,
  };
  return {
    ...base,
    ...overrides,
    action: { ...base.action, ...(overrides.action || {}) },
    owner: { ...base.owner, ...(overrides.owner || {}) },
    businessTarget: overrides.businessTarget === null ? null : { ...base.businessTarget, ...(overrides.businessTarget || {}) },
    control: { ...base.control, ...(overrides.control || {}) },
  };
}

function executionContext() {
  const candidate = currentCandidate();
  const context = hybrid.buildCurrentSemanticExecutionContext({
    action: { ...candidate.action },
    owner: { ...candidate.owner },
    businessTarget: { ...candidate.businessTarget },
    businessContext: candidate.businessContext,
    semanticIdentity: { structuralContext: { formControl: "button" } },
  }, [candidate]);
  assert.ok(context, "production semantic resolution must produce a context");
  return context;
}

function rawProjection(candidate) {
  return {
    action: { ...candidate.action },
    control: { ...candidate.control },
    ownerCandidates: [{
      type: candidate.owner.type,
      semanticLabel: candidate.owner.label,
      businessTarget: candidate.businessTarget,
      businessContext: candidate.businessContext,
      interactiveDescendantCount: 1,
      navigationDescendantCount: 0,
      textLength: candidate.owner.label.length,
      depth: 1,
    }],
    businessContext: candidate.businessContext,
    overlayScope: candidate.overlayScope,
    materialState: {},
    visible: candidate.visible,
    enabled: candidate.enabled,
  };
}

function bindingPage({ canonical = currentCandidate(), legacyName = "Maliyet ve operasyon ayrıntıları 16" } = {}) {
  const handle = {
    async isVisible() { return true; },
    async isDisabled() { return false; },
    async evaluate() { return null; },
  };
  const locator = {
    async isVisible() { return true; },
    async evaluate(callback) {
      // Before CAL-02 the binder owns a separate browser projection and sees
      // this legacy name.  The calibrated path asks for the one shared raw
      // descriptor instead.
      if (String(callback).includes("__pre18ProjectSemanticControl")) return rawProjection(canonical);
      return {
        name: legacyName,
        disabled: false,
        actualRole: canonical.action.role,
        control: { dataTestId: canonical.control.dataTestId, tag: canonical.control.tag },
        ownerCandidates: rawProjection(canonical).ownerCandidates,
        overlayScope: canonical.overlayScope,
        expectedEffectClass: canonical.action.expectedEffectClass,
      };
    },
    async elementHandle() { return handle; },
  };
  return {
    locator() {
      return {
        async count() { return 1; },
        nth() { return locator; },
      };
    },
  };
}

function diagnosticFor(context) {
  return runtime.getLocatorBindingDiagnostics?.(context) || null;
}

test("CAL02-RED-1 a divergent legacy binder projection cannot discard resolver success", async () => {
  const binding = await runtime.matchingLocator(bindingPage({}), executionContext());
  assert.ok(binding?.loc);
});

test("CAL02-RED-2 binder records consumption of the authoritative descriptor", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({}), context);
  assert.equal(diagnosticFor(context)?.AUTHORITATIVE_DESCRIPTOR_CONSUMED, true);
});

test("CAL02-RED-3 same current node binds through one canonical descriptor truth", async () => {
  const context = executionContext();
  const binding = await runtime.matchingLocator(bindingPage({ legacyName: "Maliyet ve operasyon ayrıntıları" }), context);
  assert.equal(Boolean(binding?.physicalIdentity?.SEMANTIC_IDENTITY?.candidateKey), true);
  assert.equal(diagnosticFor(context)?.BINDER_INDEPENDENT_SEMANTIC_TRUTH_CREATED, false);
});

test("CAL02-RED-4 equivalent rerender replacement retains the canonical identity", async () => {
  const context = executionContext();
  const binding = await runtime.matchingLocator(bindingPage({}), context);
  assert.equal(binding?.bindingTelemetry?.POST_RERENDER_IDENTITY_REVALIDATED, true);
});

test("CAL02-RED-5 wrong role exposes role as the first strict binding mismatch", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ action: { role: "link" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "ROLE");
});

test("CAL02-RED-6 wrong exact name exposes name as the first strict binding mismatch", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ action: { name: "Başka ayrıntı" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "NAME");
});

test("CAL02-RED-7 wrong structural identity remains rejected with structural telemetry", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ control: { tag: "INPUT" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "STRUCTURE");
});

test("CAL02-RED-8 wrong owner remains rejected with owner telemetry", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ owner: { label: "Başka kart" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "OWNER");
});

test("CAL02-RED-9 wrong business target remains rejected with target telemetry", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ businessTarget: { id: "financial-2" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "BUSINESS_TARGET");
});

test("CAL02-RED-10 wrong overlay containment remains rejected with containment telemetry", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ overlayScope: "DRAWER" }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "SURFACE_CONTAINMENT");
});

test("CAL02-RED-11 post-scroll replacement with a wrong canonical key remains rejected", async () => {
  const context = executionContext();
  await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ action: { expectedEffectClass: "RENDERED_TRANSITION" } }) }), context);
  assert.equal(diagnosticFor(context)?.FIRST_BINDING_MISMATCH_DIMENSION, "CANDIDATE_KEY");
});

test("CAL02-RED-12 binding diagnostics expose every bounded mismatch fact without deciding acceptance", async () => {
  const context = executionContext();
  const binding = await runtime.matchingLocator(bindingPage({ canonical: currentCandidate({ owner: { label: "Başka kart" } }) }), context);
  assert.equal(binding, null);
  const diagnostic = diagnosticFor(context);
  for (const field of ["AUTHORITATIVE_DESCRIPTOR_KEY", "BINDER_CURRENT_NODE_DESCRIPTOR_KEY", "ROLE_MATCH", "NAME_MATCH", "STRUCTURE_MATCH", "OWNER_MATCH", "BUSINESS_TARGET_MATCH", "SURFACE_CONTAINMENT_MATCH", "CANDIDATE_KEY_MATCH", "FIRST_BINDING_MISMATCH_DIMENSION"]) assert.ok(Object.hasOwn(diagnostic || {}, field), field);
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
  console.log(JSON.stringify({ CAL02_RED_TEST_COUNT: cases.length, CAL02_RED_OBSERVED_COUNT: failures, CAL02_RED_UNEXPECTED_PASS_COUNT: passes }));
  if (failures !== cases.length) process.exitCode = 1;
} else if (failures) {
  console.log(`PRE_18_HARNESS_CAL02_SINGLE_DESCRIPTOR_BINDING_CHECK=RED (${failures}/${cases.length})`);
  process.exitCode = 1;
} else {
  console.log("PRE_18_HARNESS_CAL02_SINGLE_DESCRIPTOR_BINDING_CHECK=PASS");
}
