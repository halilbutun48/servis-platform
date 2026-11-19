import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";

const feature = extractTurkishSemanticFeatures;

function allFeatureItems(result) {
  return [
    ...Object.values(result.morphology || {}).flat(),
    ...Object.values(result.relations || {}).flat(),
    ...(result.structure?.local || []),
    ...(result.temporal || []),
    ...(result.order || []),
    ...(result.priority || []),
    ...(result.question?.markers || []),
    ...(result.polarity?.negation || []),
    ...(result.polarity?.modality || []),
  ];
}

function assertSpanIntegrity(result) {
  for (const item of allFeatureItems(result)) {
    assert.equal(typeof item.featureKind, "string");
    assert.ok(item.sourceSpan && Number.isInteger(item.sourceSpan.start));
    assert.ok(Number.isInteger(item.sourceSpan.end));
    assert.ok(item.sourceSpan.end > item.sourceSpan.start);
    assert.equal(result.sourceText.slice(item.sourceSpan.start, item.sourceSpan.end).length,
      item.sourceSpan.end - item.sourceSpan.start);
    assert.equal(item.normalizationForm, "TURKISH_LOWERCASE_NFC");
    assert.equal(item.producer, "deterministic-turkish-feature-producer");
    assert.ok(["SUPPORT", "CONTRADICTION", "AMBIGUOUS"].includes(item.supportOrContradiction));
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(item.quality));
  }
}

function assertNoSemanticDecision(result) {
  const forbiddenKeys = new Set([
    "action", "authorization", "canonicalRequest", "capability", "objectClass",
    "productHelp", "roleHelp", "route", "scope", "semanticAction", "semanticScope",
    "uiTarget",
  ]);
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `semantic decision field leaked: ${key}`);
      visit(child);
    }
  };
  visit(result);
  assert.equal(result.authorizationEffect, undefined);
}

function assertBounded(result) {
  for (const [name, values] of Object.entries(result.relations || {})) {
    assert.ok(values.length <= 8, `${name} relation bound`);
  }
  assert.ok((result.structure?.local || []).length <= 5);
  assert.ok((result.structure?.local || []).every((item) => item.sourceSpan.end - item.sourceSpan.start <= 64));
}

const nominal = feature({ text: "Atölye birimimizin görev sınırı nerede biter?" });
assert.equal(nominal.question.isQuestion, true);
assert.ok(nominal.relations.ownership.length >= 1);
assert.ok(nominal.relations.boundary.length >= 1);
assert.ok(nominal.relations.limitation.length >= 1);
assert.ok(nominal.relations.actorObject.length >= 1);
const unitToken = nominal.tokens.find((token) => token.normalized === "birimimizin");
assert.ok(unitToken.morphology.possessive.some((item) => item.value === "FIRST_PLURAL"));
assert.ok(unitToken.morphology.case.some((item) => item.value === "GENITIVE"));

const verbLight = feature({ text: "Kütüphane ekibimizin kayıt düzenini kim yönetmeli?" });
assert.equal(verbLight.question.isQuestion, true);
assert.ok(verbLight.relations.actorObject.length >= 1);
assert.ok(verbLight.relations.process.length >= 1);
assert.ok(verbLight.relations.assignment.length >= 1);
assert.ok(verbLight.polarity.modality.some((item) => item.value === "NECESSITY"));
assert.ok(verbLight.relations.ownership.length >= 1);
const objectToken = verbLight.tokens.find((token) => token.normalized === "düzenini");
assert.ok(objectToken.morphology.case.some((item) => item.value === "ACCUSATIVE"));

const reordered = feature({ text: "Kim yönetmeli kayıt düzenimizi?" });
assert.ok(reordered.relations.actorObject.length >= 1);
assert.ok(reordered.relations.process.length >= 1);
assert.ok(reordered.relations.assignment.length >= 1);

const guidance = feature({ text: "Bu işlem hangi amaçla başlatılır, ilk yön nereden anlaşılır?" });
assert.ok(guidance.relations.purpose.length >= 1);
assert.ok(guidance.relations.orientation.length >= 1);
assert.ok(guidance.relations.startingGuidance.length >= 1);
assert.ok(guidance.relations.process.length >= 1);
assert.ok(guidance.question.isQuestion);
const cueOnly = feature({ text: "Bu düzen hangi amaçla?" });
assert.ok(cueOnly.relations.purpose.length >= 1);
assert.ok(cueOnly.featureQuality.recognizedFeatureCount >= 1);

const exclusion = feature({ text: "Bu seçim kapsamımızın dışında mı, yoksa dahil mi?" });
assert.ok(exclusion.relations.limitation.length >= 1);
assert.ok(exclusion.relations.boundary.length >= 1);
assert.ok(exclusion.relations.exclusion.length >= 1);
assert.ok(exclusion.relations.inclusion.length >= 1);

const personAndCase = feature({ text: "Görevlerimizi sana devretmeliyiz, ekibimizden bilgi al." });
const duties = personAndCase.tokens.find((token) => token.normalized === "görevlerimizi");
const firstPluralVerb = personAndCase.tokens.find((token) => token.normalized === "devretmeliyiz");
const team = personAndCase.tokens.find((token) => token.normalized === "ekibimizden");
assert.ok(firstPluralVerb.morphology.person.some((item) => item.value === "FIRST_PLURAL"));
assert.ok(duties.morphology.possessive.some((item) => item.value === "FIRST_PLURAL"));
assert.ok(duties.morphology.case.some((item) => item.value === "ACCUSATIVE"));
assert.ok(team.morphology.case.some((item) => item.value === "ABLATIVE"));

const ordinary = feature({ text: "Eller tüm masa durur." });
assert.equal(ordinary.relations.ownership.length, 0);
assert.equal(ordinary.relations.assignment.length, 0);
assert.equal(ordinary.relations.boundary.length, 0);
assert.equal(ordinary.relations.limitation.length, 0);
assert.equal(ordinary.relations.purpose.length, 0);
assert.equal(ordinary.featureQuality.overall === "HIGH", false);

// Stage 1 residual-generalization controls.  These are deliberately new
// structural constructions: they exercise Turkish relation morphology rather
// than any diagnostic corpus utterance or role-specific phrase.
const residualLimitation = feature({ text: "Koordinasyon ekibinde benim dışımda kalan kararlar nelerdir?" });
assert.ok(residualLimitation.relations.limitation.length >= 1, "possessive exclusion yields limitation evidence");
assert.ok(residualLimitation.relations.exclusion.length >= 1, "possessive exclusion is observable independently");

const residualCapability = feature({ text: "Birim hesabıyla hangi iş akışlarına katılabilirim?" });
assert.ok(residualCapability.relations.inclusion.length >= 1, "ability morphology with a scoped actor yields capability evidence");

const residualDecision = feature({ text: "Operasyon kararlarının önceliğini kim belirler?" });
assert.ok(residualDecision.relations.decision.length >= 1, "inflected priority relation yields decision evidence");

const residualPurpose = feature({ text: "Bu çalışma alanının işlevi nedir?" });
assert.ok(residualPurpose.relations.purpose.length >= 1, "functional nominal yields purpose evidence");

const residualAssignment = feature({ text: "Plan izleme görevi hangi aşamada bana ait sayılır?" });
assert.ok(residualAssignment.relations.assignment.length >= 1, "dative first-person actor with ownership predicate yields assignment evidence");

const structuralNegatives = feature({ text: "Dışarıda yağmur başlayabilir." });
assert.equal(structuralNegatives.relations.limitation.length, 0, "ordinary exterior location is not a limitation relation");
assert.equal(structuralNegatives.relations.exclusion.length, 0, "ordinary exterior location is not an exclusion relation");
assert.equal(structuralNegatives.relations.inclusion.length, 0, "unscoped ability is not a role capability relation");

for (const result of [
  nominal, verbLight, reordered, guidance, exclusion, personAndCase, ordinary,
  residualLimitation, residualCapability, residualDecision, residualPurpose,
  residualAssignment, structuralNegatives,
]) {
  assertSpanIntegrity(result);
  assertNoSemanticDecision(result);
  assertBounded(result);
  assert.deepEqual(result, feature({ text: result.sourceText }), `deterministic output: ${result.sourceText}`);
}

assert.equal(nominal.featureQuality.bounded, true);
assert.equal(verbLight.featureQuality.bounded, true);
assert.equal(guidance.featureQuality.bounded, true);

console.log("status=PASS");
console.log("syntheticCases=13");
console.log(`nominalRelations=${Object.values(nominal.relations).flat().length}`);
console.log(`verbLightRelations=${Object.values(verbLight.relations).flat().length}`);
console.log(`guidanceRelations=${Object.values(guidance.relations).flat().length}`);
