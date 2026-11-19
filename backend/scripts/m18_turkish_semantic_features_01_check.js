import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";

const feature = extractTurkishSemanticFeatures;

function sourceText(item, text) {
  return text.slice(item.sourceSpan.start, item.sourceSpan.end);
}

function assertFeatureShape(item) {
  assert.equal(typeof item.featureKind, "string");
  assert.ok(item.value !== undefined);
  assert.ok(item.sourceSpan && Number.isInteger(item.sourceSpan.start));
  assert.ok(Number.isInteger(item.sourceSpan.end));
  assert.equal(typeof item.normalizationForm, "string");
  assert.equal(item.producer, "deterministic-turkish-feature-producer");
  assert.ok(["SUPPORT", "CONTRADICTION", "AMBIGUOUS"].includes(item.supportOrContradiction));
  assert.ok(["HIGH", "MEDIUM", "LOW"].includes(item.quality));
}

function assertNoSemanticDecisionFields(result) {
  const forbidden = [
    "scope", "semanticScope", "action", "semanticAction", "objectClass", "roleHelp",
    "authorization", "route", "uiTarget", "capability", "canonicalRequest", "productHelp",
  ];
  for (const key of forbidden) assert.equal(Object.prototype.hasOwnProperty.call(result, key), false, `forbidden field: ${key}`);
}

const text = "Şirket hesabında günlük kararları hangi sırayla sahiplenmeliyim?";
const result = feature({ text });

assert.equal(result.sourceText, text);
assert.equal(result.normalizedText, "şirket hesabında günlük kararları hangi sırayla sahiplenmeliyim?");
assert.ok(Array.isArray(result.tokens) && result.tokens.length >= 8);
assert.equal(result.tokens.every((token) => token.sourceSpan.end > token.sourceSpan.start), true);
assert.equal(result.tokens.every((token) => sourceText(token, text) === token.raw), true);
assert.equal(result.tokens.every((token, index) => index === 0 || token.sourceSpan.start >= result.tokens[index - 1].sourceSpan.end), true);
assert.equal(result.tokens.find((token) => token.normalized === "şirket").raw, "Şirket");

const normalized = feature({ text: "İŞİM IĞDIR" });
assert.equal(normalized.normalizedText, "işim ığdır");
assert.ok(normalized.tokens[0].lemmaCandidates.includes("işim"));
assert.ok(normalized.tokens[1].lemmaCandidates.includes("ığdır"));

const decomposedText = "S\u0327irket hesabında";
const decomposed = feature({ text: decomposedText });
assert.equal(decomposed.normalizedText, "şirket hesabında");
for (const token of decomposed.tokens) assert.equal(decomposedText.slice(token.sourceSpan.start, token.sourceSpan.end), token.raw);

const inflected = feature({ text: "İşlerimi yapmalıyım." });
const workToken = inflected.tokens.find((token) => token.normalized === "işlerimi");
const shouldToken = inflected.tokens.find((token) => token.normalized === "yapmalıyım");
assert.ok(workToken.morphology.plurality.some((item) => item.value === "PLURAL"));
assert.ok(workToken.morphology.possessive.some((item) => item.value === "FIRST_SINGULAR"));
assert.ok(workToken.morphology.case.some((item) => item.value === "ACCUSATIVE"));
assert.ok(shouldToken.morphology.modality.some((item) => item.value === "NECESSITY"));
assert.ok(shouldToken.morphology.person.some((item) => item.value === "FIRST_SINGULAR"));

const polarity = feature({ text: "Bunu yapmamalıyım, değil mi?" });
assert.ok(polarity.polarity.negation.length >= 1);
assert.ok(polarity.polarity.modality.some((item) => item.value === "NECESSITY"));
assert.ok(polarity.question.isQuestion);
assert.ok(polarity.question.markers.some((item) => item.value === "QUESTION_PARTICLE"));
assert.ok(polarity.question.form === "TAG_OR_PARTICLE");

assert.ok(result.relations.actorObject.length >= 1);
assert.ok(result.relations.ownership.length >= 1);
assert.ok(result.relations.process.length >= 1);
for (const relation of [
  ...result.relations.actorObject,
  ...result.relations.ownership,
  ...result.relations.process,
  ...result.structure.local,
]) assertFeatureShape(relation);

assert.ok(result.temporal.length >= 1);
assert.ok(result.order.length >= 1);
assert.ok(result.priority.length >= 1);
for (const item of [...result.temporal, ...result.order, ...result.priority]) assertFeatureShape(item);
for (const relation of [
  ...result.relations.actorObject,
  ...result.relations.ownership,
  ...result.relations.process,
  ...result.structure.local,
]) {
  assert.equal(text.slice(relation.sourceSpan.start, relation.sourceSpan.end).length, relation.sourceSpan.end - relation.sourceSpan.start);
}

const longText = Array.from({ length: 40 }, () => "yapmalıyım").join(" ");
const bounded = feature({ text: longText });
assert.ok(bounded.relations.process.length <= 8);
assert.ok(bounded.structure.local.every((item) => item.sourceSpan.end - item.sourceSpan.start <= 64));

const ordinary = feature({ text: "eller tüm" });
const hands = ordinary.tokens.find((token) => token.normalized === "eller");
const all = ordinary.tokens.find((token) => token.normalized === "tüm");
assert.deepEqual(hands.morphology.plurality, []);
assert.deepEqual(all.morphology.person, []);
assert.deepEqual(all.morphology.possessive, []);

const priority = feature({ text: "Önce en acil işi yapmalıyım." });
assert.ok(priority.priority.some((item) => item.value === "PRIORITY"));
assert.ok(priority.order.some((item) => item.value === "SEQUENCE"));

const unknown = feature({ text: "blorf zinta" });
assert.equal(unknown.featureQuality.overall, "LOW");
assert.equal(unknown.relations.actorObject.length, 0);
assert.equal(unknown.relations.ownership.length, 0);
assert.equal(unknown.relations.process.length, 0);
assert.equal(unknown.featureQuality.partial, true);

assert.deepEqual(feature({ text }), feature({ text }));
assertNoSemanticDecisionFields(result);
assert.equal(result.featureQuality.bounded, true);
assert.equal(result.featureQuality.semanticDecision, undefined);

console.log("status=PASS");
console.log(`tokens=${result.tokens.length}`);
console.log(`featureQuality=${result.featureQuality.overall}`);
console.log(`relationCandidates=${result.relations.actorObject.length + result.relations.ownership.length + result.relations.process.length}`);
