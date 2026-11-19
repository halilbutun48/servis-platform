import assert from "node:assert/strict";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const ROLES = ["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN"];
const RELATION_KEYS = [
  "actorObject", "ownership", "process", "assignment", "inclusion", "exclusion",
  "purpose", "orientation", "startingGuidance", "boundary", "limitation", "verbNoun", "local",
];

function relation(featureKind, value = featureKind.replace(/_RELATION$/u, "")) {
  return {
    featureKind,
    value,
    sourceSpan: { start: 0, end: 4 },
    normalizationForm: "TURKISH_LOWERCASE_NFC",
    producer: "synthetic-wave-2-contract-fixture",
    supportOrContradiction: "SUPPORT",
    quality: "HIGH",
  };
}

function featuresFor({ relationKey, featureKind, order = false, priority = false } = {}) {
  const relations = Object.fromEntries(RELATION_KEYS.map((key) => [key, []]));
  if (relationKey) relations[relationKey] = [relation(featureKind || `${relationKey.toUpperCase()}_RELATION`, relationKey.toUpperCase())];
  return {
    sourceText: "synthetic structural fixture",
    normalizedText: "synthetic structural fixture",
    tokens: [{ normalized: "hangi", lemmaCandidates: ["hangi"], sourceSpan: { start: 0, end: 5 } }],
    polarity: { negation: [], modality: [] },
    question: { isQuestion: true, markers: [], form: "SYNTHETIC_CONTRACT" },
    relations,
    temporal: [],
    order: order ? [relation("ORDER", "SEQUENCE")] : [],
    priority: priority ? [relation("PRIORITY", "PRIORITY")] : [],
    structure: { local: [] },
    featureQuality: { overall: "HIGH", partial: false, bounded: true, recognizedFeatureCount: 1 },
  };
}

function contextFor(role) {
  return {
    role,
    currentDomain: "OPERATIONS",
    currentSurface: { path: `/${role.toLowerCase()}/operations` },
    evidence: { product: true },
  };
}

function compose(role, fixture) {
  return composeSemanticEvidence({
    features: featuresFor(fixture),
    context: contextFor(role),
    conversationState: {},
    screenContext: { path: `/${role.toLowerCase()}/operations` },
  });
}

const aspectFixtures = [
  ["CAPABILITY", "CAPABILITY_GUIDANCE", { relationKey: "inclusion", featureKind: "INCLUSION_RELATION" }],
  ["RESPONSIBILITY", "RESPONSIBILITY_GUIDANCE", { relationKey: "actorObject", featureKind: "ACTOR_OBJECT_RELATION" }],
  ["OWNERSHIP", "RESPONSIBILITY_GUIDANCE", { relationKey: "ownership", featureKind: "OWNERSHIP_RELATION" }],
  ["DECISION_RESPONSIBILITY", "RESPONSIBILITY_GUIDANCE", { relationKey: "ownership", featureKind: "OWNERSHIP_RELATION", order: true }],
  ["PROCESS_RESPONSIBILITY", "PROCESS_GUIDANCE", { relationKey: "process", featureKind: "PROCESS_RELATION" }],
  ["BOUNDARY", "RESPONSIBILITY_GUIDANCE", { relationKey: "boundary", featureKind: "BOUNDARY_RELATION" }],
  ["LIMITATION", "RESPONSIBILITY_GUIDANCE", { relationKey: "limitation", featureKind: "LIMITATION_RELATION" }],
  ["ORIENTATION", "ORIENTATION", { relationKey: "orientation", featureKind: "ORIENTATION_RELATION" }],
  ["STARTING_GUIDANCE", "ORIENTATION", { relationKey: "startingGuidance", featureKind: "STARTINGGUIDANCE_RELATION" }],
];

let positiveCases = 0;
for (const role of ROLES) {
  for (const [aspect, help, fixture] of aspectFixtures) {
    const result = compose(role, fixture);
    assert.equal(result.subject.value, "ROLE", `${role}/${aspect} subject`);
    assert.equal(result.roleAspect.value, aspect, `${role}/${aspect} structural aspect`);
    assert.equal(result.productHelp.value, help, `${role}/${aspect} structural help`);
    assert.equal(result.requestMode.value, "EXPLAIN", `${role}/${aspect} explain mode`);
    assert.equal(result.object.value, "NONE", `${role}/${aspect} object`);
    assert.equal(result.targetRequest.value, "PRODUCT_AREA", `${role}/${aspect} target`);
    assert.equal(result.quality.roleHelpCandidate, true, `${role}/${aspect} candidate`);
    assert.ok(result.roleAspect.provenance.includes("STRUCTURE"), `${role}/${aspect} structural provenance`);
    assert.equal(result.quality.authorizationEffect, "NONE", `${role}/${aspect} authorization effect`);
    assert.equal(result.provenance.every((entry) => entry.authorizationEffect === "NONE"), true);
    positiveCases += 1;
  }
}

const roleOnly = compose("COMPANY", {});
assert.equal(roleOnly.requestMode.value, "EXPLAIN");
assert.equal(roleOnly.roleAspect.value, "NONE");
assert.equal(roleOnly.productHelp.value, "NONE");
assert.equal(roleOnly.quality.roleHelpCandidate, false);

const view = composeSemanticEvidence({
  features: { ...featuresFor({ relationKey: "orientation", featureKind: "ORIENTATION_RELATION" }), tokens: [{ normalized: "görüntüle", lemmaCandidates: ["görüntüle"] }], question: { isQuestion: false, markers: [], form: "NONE" } },
  context: contextFor("COMPANY"),
});
assert.equal(view.requestMode.value, "VIEW");
assert.equal(view.productHelp.value, "NONE");

const navigate = composeSemanticEvidence({
  features: { ...featuresFor({ relationKey: "startingGuidance", featureKind: "STARTINGGUIDANCE_RELATION" }), tokens: [{ normalized: "aç", lemmaCandidates: ["aç"] }], question: { isQuestion: false, markers: [], form: "NONE" } },
  context: contextFor("COMPANY"),
});
assert.equal(navigate.requestMode.value, "NAVIGATE");
assert.equal(navigate.productHelp.value, "NONE");

const concreteObject = compose("COMPANY", { relationKey: "ownership", featureKind: "OWNERSHIP_RELATION", order: true });
const concreteFeatures = { ...featuresFor({ relationKey: "ownership", featureKind: "OWNERSHIP_RELATION", order: true }), tokens: [
  { normalized: "hangi", lemmaCandidates: ["hangi"], sourceSpan: { start: 0, end: 5 } },
  { normalized: "vardiya", lemmaCandidates: ["vardiya"], sourceSpan: { start: 6, end: 13 } },
] };
const concrete = composeSemanticEvidence({ features: concreteFeatures, context: contextFor("COMPANY") });
assert.equal(concreteObject.productHelp.value, "RESPONSIBILITY_GUIDANCE");
assert.equal(concrete.productHelp.value, "NONE");
assert.ok(concrete.contradictions.some((item) => item.value === "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT"));

console.log("status=PASS");
console.log(`roles=${ROLES.length}`);
console.log(`positiveCases=${positiveCases}`);
console.log(`roleAspects=${aspectFixtures.length}`);
console.log(`productHelpFamilies=${new Set(aspectFixtures.map(([, help]) => help)).size}`);
