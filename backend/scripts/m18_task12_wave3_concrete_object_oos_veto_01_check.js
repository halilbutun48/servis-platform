import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const OBJECT_VALUES = new Set([
  "SHIFT", "AGREEMENT", "OFFER", "ROUTE", "FINANCIAL", "SURFACE", "RECORD", "ENTITY",
]);

function evidence(kind, value, sourceSpan = { start: 0, end: 8 }) {
  return {
    kind,
    value,
    sourceSpan,
    normalizationForm: "TURKISH_LOWERCASE_NFC",
    producer: "synthetic-wave-3-contract-fixture",
    supportOrContradiction: "SUPPORT",
    quality: "HIGH",
  };
}

function featuresFor({ tokens = ["hangi", "nasıl"], object, reference, domain, relation = "ownership", order = true, mode = "EXPLAIN" } = {}) {
  const relations = {
    actorObject: [],
    ownership: relation === "ownership" ? [evidence("OWNERSHIP_RELATION", "OWNERSHIP")] : [],
    process: [],
    assignment: [],
    inclusion: [],
    exclusion: [],
    purpose: [],
    orientation: [],
    startingGuidance: [],
    boundary: [],
    limitation: [],
    verbNoun: [],
    local: [],
  };
  return {
    sourceText: "synthetic structural fixture",
    normalizedText: "synthetic structural fixture",
    tokens: tokens.map((normalized, index) => ({
      normalized,
      lemmaCandidates: [normalized],
      sourceSpan: { start: index, end: index + normalized.length },
    })),
    polarity: { negation: [], modality: [] },
    question: { isQuestion: mode === "EXPLAIN", markers: [], form: "SYNTHETIC_CONTRACT" },
    relations,
    temporal: [],
    order: order ? [evidence("ORDER", "SEQUENCE")] : [],
    priority: [],
    structure: { local: [] },
    ...(object ? { objectEvidence: [evidence("CONCRETE_OBJECT", object)] } : {}),
    ...(reference ? { referenceEvidence: [evidence("REFERENCE", reference)] } : {}),
    ...(domain ? { domainEvidence: [evidence(domain.kind, domain.value)] } : {}),
    featureQuality: { overall: "HIGH", partial: false, bounded: true, recognizedFeatureCount: 1 },
  };
}

function context() {
  return {
    role: "COMPANY",
    currentDomain: "OPERATIONS",
    currentSurface: { path: "/company/operations" },
    evidence: { product: true },
  };
}

function compose(features, contextOverride = {}) {
  return composeSemanticEvidence({
    features,
    context: { ...context(), ...contextOverride },
    conversationState: {},
    screenContext: { path: "/company/operations" },
  });
}

const composerSource = await readFile(new URL("../src/ai/chat/semanticEvidenceComposer.js", import.meta.url), "utf8");
assert.equal(/node:(?:fs|http|https|net|child_process)/u.test(composerSource), false, "composer must remain pure");
assert.equal(/\b(?:fetch|XMLHttpRequest|writeFile|appendFile|unlink|rm|exec|spawn)\s*\(/u.test(composerSource), false, "composer must not write or call external systems");

const concreteObject = compose(featuresFor({
  tokens: ["hangi", "mutabakat"],
  object: "AGREEMENT",
  reference: "UNIQUE",
}));
assert.equal(concreteObject.object.value, "AGREEMENT", "typed concrete object must be retained");
assert.equal(concreteObject.reference.value, "UNIQUE", "typed concrete reference must be retained");
assert.equal(concreteObject.productHelp.value, "NONE", "concrete object must veto broad role-help");
assert.equal(concreteObject.quality.roleHelpCandidate, false);
assert.ok(concreteObject.contradictions.some((item) => item.value === "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT"));

const entityExplanation = compose(featuresFor({
  tokens: ["hangi", "kayıt"],
  object: "ENTITY",
  reference: "UNIQUE",
}));
assert.equal(entityExplanation.object.value, "ENTITY");
assert.equal(entityExplanation.requestMode.value, "EXPLAIN");
assert.equal(entityExplanation.productHelp.value, "NONE");

const recordView = compose(featuresFor({ tokens: ["görüntüle"], object: "RECORD", reference: "UNIQUE", mode: "VIEW", order: false }));
assert.equal(recordView.object.value, "RECORD");
assert.equal(recordView.requestMode.value, "VIEW");
assert.equal(recordView.productHelp.value, "NONE");

const surfaceNavigation = compose(featuresFor({ tokens: ["aç"], object: "SURFACE", reference: "UNIQUE", mode: "NAVIGATE", order: false }));
assert.equal(surfaceNavigation.object.value, "SURFACE");
assert.equal(surfaceNavigation.requestMode.value, "NAVIGATE");
assert.equal(surfaceNavigation.productHelp.value, "NONE");

for (const domain of ["FINANCIAL_LIMIT", "DATE_TIME_LIMIT"]) {
  const limited = compose(featuresFor({
    tokens: ["hangi", "sınır"],
    domain: { kind: "CONCRETE_DOMAIN", value: domain },
  }));
  assert.equal(limited.productHelp.value, "NONE", `${domain} must veto broad role-help`);
  assert.equal(limited.quality.roleHelpCandidate, false);
  assert.ok(limited.domainEvidence.some((item) => item.value === domain));
}

const genuineOos = compose(featuresFor({
  tokens: ["hangi", "sonuç"],
  domain: { kind: "EXTERNAL_DOMAIN", value: "UNRELATED_DOMAIN" },
}));
assert.equal(genuineOos.productHelp.value, "NONE");
assert.equal(genuineOos.quality.roleHelpCandidate, false);
assert.equal(genuineOos.quality.genuineOosEvidence, true);
assert.ok(genuineOos.domainEvidence.some((item) => item.value === "UNRELATED_DOMAIN"));

const unknownWithRoleContext = compose(featuresFor({ tokens: ["bunu", "anlat"], relation: "none", order: false }));
assert.equal(unknownWithRoleContext.productHelp.value, "NONE", "role context cannot create role-help");
assert.equal(unknownWithRoleContext.quality.roleHelpCandidate, false);
assert.equal(unknownWithRoleContext.quality.genuineOosEvidence, false, "unknown is not positive OOS evidence");

const genuineRoleHelp = compose(featuresFor({ tokens: ["hangi", "alan"], relation: "ownership", order: true }));
assert.equal(genuineRoleHelp.productHelp.value, "RESPONSIBILITY_GUIDANCE");
assert.equal(genuineRoleHelp.quality.roleHelpCandidate, true);

for (const result of [concreteObject, entityExplanation, recordView, surfaceNavigation, genuineOos, unknownWithRoleContext, genuineRoleHelp]) {
  assert.equal(result.quality.authorizationEffect, "NONE");
  assert.equal(result.provenance.every((item) => item.authorizationEffect === "NONE"), true);
}

assert.deepEqual(compose(featuresFor({ object: "OFFER", reference: "UNIQUE" })), compose(featuresFor({ object: "OFFER", reference: "UNIQUE" })));

assert.ok(OBJECT_VALUES.has(concreteObject.object.value));
console.log("status=PASS");
console.log("syntheticCases=11");
console.log("concreteVetoes=5");
console.log("positiveOosControls=1");
console.log("roleContextOnlyVetoes=1");
