import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const context = (role = "COMPANY") => ({
  role,
  currentDomain: "OPERATIONS",
  currentSurface: { path: `/${role.toLowerCase()}/operations` },
  evidence: { product: true },
});

const relation = (featureKind, value = featureKind.replace(/_RELATION$/u, ""), quality = "HIGH") => ({
  featureKind,
  value,
  sourceSpan: { start: 0, end: 5 },
  normalizationForm: "TURKISH_LOWERCASE_NFC",
  producer: "micro-check-structural-fixture",
  supportOrContradiction: "SUPPORT",
  quality,
});

const domain = (kind, value) => ({
  kind,
  value,
  sourceSpan: { start: 0, end: 5 },
  normalizationForm: "TURKISH_LOWERCASE_NFC",
  producer: "micro-check-structural-fixture",
  supportOrContradiction: "SUPPORT",
  quality: "HIGH",
});

const fixture = ({ key, kind, order = false, tokens = [{ normalized: "hangi", lemmaCandidates: ["hangi"] }], extra = {} }) => {
  const keys = ["actorObject", "ownership", "process", "assignment", "inclusion", "exclusion", "purpose", "orientation", "startingGuidance", "boundary", "limitation", "verbNoun", "local"];
  const relations = Object.fromEntries(keys.map((name) => [name, []]));
  if (key) relations[key] = [relation(kind || `${key.toUpperCase()}_RELATION`, key.toUpperCase())];
  return {
    sourceText: "structural micro-check",
    normalizedText: "structural micro-check",
    tokens,
    polarity: { negation: [], modality: [] },
    question: { isQuestion: true, markers: [], form: "STRUCTURAL_MICRO_CHECK" },
    relations,
    temporal: [], order: order ? [relation("ORDER", "SEQUENCE")] : [], priority: [],
    structure: { local: [] },
    featureQuality: { overall: "HIGH", partial: false, bounded: true, recognizedFeatureCount: 1 },
    ...extra,
  };
};

const positiveAspects = [
  ["CAPABILITY", "inclusion", "INCLUSION_RELATION"],
  ["RESPONSIBILITY", "actorObject", "ACTOR_OBJECT_RELATION"],
  ["OWNERSHIP", "ownership", "OWNERSHIP_RELATION"],
  ["DECISION_RESPONSIBILITY", "ownership", "OWNERSHIP_RELATION", true],
  ["PROCESS_RESPONSIBILITY", "process", "PROCESS_RELATION"],
  ["BOUNDARY", "boundary", "BOUNDARY_RELATION"],
  ["LIMITATION", "limitation", "LIMITATION_RELATION"],
  ["ORIENTATION", "orientation", "ORIENTATION_RELATION"],
  ["STARTING_GUIDANCE", "startingGuidance", "STARTING_GUIDANCE_RELATION"],
];

for (const [index, [aspect, key, kind, ordered]] of positiveAspects.entries()) {
  const result = composeSemanticEvidence({ features: fixture({ key, kind, order: ordered }), context: context(index % 2 ? "ROOM" : "COMPANY") });
  assert.equal(result.roleAspect.value, aspect);
  assert.notEqual(result.productHelp.value, "NONE");
  assert.equal(result.requestMode.value, "EXPLAIN");
  assert.equal(result.quality.authorizationEffect, "NONE");
}

const rawStructuralCases = [
  ["İşletme alanımız hangi amaçla sürdürülür?", "purpose"],
  ["Düzenimizi nasıl kavramalıyım?", "orientation"],
  ["Birimimin başlangıç yönü hangisidir?", "startingGuidance"],
  ["Ekibimizin alanı kime aittir?", "ownership"],
  ["Görev düzenini kim yönetmelidir?", "assignment"],
  ["Birim seçimi kapsamımızın dışında mı?", "exclusion"],
];
for (const [text, key] of rawStructuralCases) {
  const result = extractTurkishSemanticFeatures({ text });
  assert.ok(result.relations[key]?.length >= 1, `${key} structural evidence missing`);
  assert.equal(result.featureQuality.bounded, true);
}

const concrete = composeSemanticEvidence({
  features: fixture({ key: "boundary", kind: "BOUNDARY_RELATION", extra: { objectEvidence: [relation("CONCRETE_OBJECT", "FINANCIAL")], domainEvidence: [] } }),
  context: context("ROOM"),
});
assert.equal(concrete.productHelp.value, "NONE");
assert.equal(concrete.object.value, "FINANCIAL");

const oos = composeSemanticEvidence({
  features: fixture({ key: "purpose", kind: "PURPOSE_RELATION", extra: { objectEvidence: [], domainEvidence: [domain("EXTERNAL_DOMAIN", "WEATHER")] } }),
  context: context("SUPER_ADMIN"),
});
assert.equal(oos.productHelp.value, "NONE");
assert.equal(oos.quality.genuineOosEvidence, true);

const entityExplanation = composeSemanticEvidence({
  features: fixture({ key: "orientation", kind: "ORIENTATION_RELATION", extra: { objectEvidence: [relation("CONCRETE_OBJECT", "ENTITY")], domainEvidence: [] } }),
  context: context("COMPANY"),
});
assert.equal(entityExplanation.productHelp.value, "NONE");

const view = composeSemanticEvidence({
  features: fixture({ key: "orientation", kind: "ORIENTATION_RELATION", tokens: [{ normalized: "görüntüle", lemmaCandidates: ["görüntüle"] }], question: { isQuestion: false, markers: [], form: "NONE" } }),
  context: context("COMPANY"),
});
assert.equal(view.requestMode.value, "VIEW");
assert.equal(view.productHelp.value, "NONE");

const navigate = composeSemanticEvidence({
  features: fixture({ key: "startingGuidance", kind: "STARTING_GUIDANCE_RELATION", tokens: [{ normalized: "aç", lemmaCandidates: ["aç"] }], question: { isQuestion: false, markers: [], form: "NONE" } }),
  context: context("COMPANY"),
});
assert.equal(navigate.requestMode.value, "NAVIGATE");
assert.equal(navigate.productHelp.value, "NONE");

const clearUnauthorizedMeaning = composeSemanticEvidence({
  features: fixture({ key: "inclusion", kind: "INCLUSION_RELATION" }),
  context: context("ROOM"),
});
assert.equal(clearUnauthorizedMeaning.quality.authorizationEffect, "NONE");
assert.equal(clearUnauthorizedMeaning.provenance.every((item) => item.authorizationEffect === "NONE"), true);

console.log("status=PASS");
console.log(`positiveAspects=${positiveAspects.length}`);
console.log(`rawStructuralCases=${rawStructuralCases.length}`);
console.log("negativeControls=5");
