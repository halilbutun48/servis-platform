import assert from "node:assert/strict";
import {
  addSemanticEvidence,
  createSemanticEvidence,
  finalizeSemanticEvidence,
} from "../src/ai/chat/semanticEvidence.js";
import * as semanticEvidenceContract from "../src/ai/chat/semanticEvidence.js";

const PROVENANCE = [
  "RAW_TEXT",
  "MORPHOLOGY",
  "STRUCTURE",
  "AUTH_CONTEXT",
  "SURFACE_CONTEXT",
  "ACTIVE_TASK",
  "REFERENCE_HISTORY",
  "INFERENCE",
];

const FORBIDDEN_DECISION_FIELDS = [
  "roleHelp",
  "scope",
  "semanticScope",
  "action",
  "semanticAction",
  "authorization",
  "uiTarget",
  "capability",
  "canonicalRequest",
  "objectClass",
  "route",
];

function assertSourceSpan(item, sourceText) {
  assert.ok(item.sourceSpan);
  assert.equal(Number.isInteger(item.sourceSpan.start), true);
  assert.equal(Number.isInteger(item.sourceSpan.end), true);
  assert.equal(item.sourceSpan.start >= 0, true);
  assert.equal(item.sourceSpan.end >= item.sourceSpan.start, true);
  assert.equal(item.sourceSpan.end <= sourceText.length, true);
  assert.equal(sourceText.slice(item.sourceSpan.start, item.sourceSpan.end), item.sourceText);
}

function assertContextReference(item) {
  assert.ok(item.contextRef);
  assert.equal(typeof item.contextRef, "string");
  assert.ok(item.contextRef.length > 0);
}

function add(evidence, item) {
  return addSemanticEvidence(evidence, item);
}

const sourceText = "Vardiya oluşturmayı bilmiyorum; bu ilişkiyle sınırlı.";
const span = (text) => ({ start: sourceText.indexOf(text), end: sourceText.indexOf(text) + text.length });

function buildEvidence() {
  let evidence = createSemanticEvidence({
    sourceText,
    featureSet: { normalizedText: sourceText.toLocaleLowerCase("tr-TR") },
    contextUsed: [
      { provenance: "AUTH_CONTEXT", contextRef: "auth:user-role:COMPANY" },
      { provenance: "SURFACE_CONTEXT", contextRef: "surface:company-shifts" },
      {
        provenance: "REFERENCE_HISTORY",
        contextRef: { type: "reference", id: "history-1", metadata: { freshness: "FRESH" } },
        value: { referenceId: "history-1" },
      },
    ],
  });

  const sourceItems = [
    ["subject", "ROLE", "RAW_TEXT", "HIGH", "Vardiya"],
    ["roleAspect", "RESPONSIBILITY", "MORPHOLOGY", "MEDIUM", "oluşturmayı"],
    ["requestMode", "EXPLAIN", "STRUCTURE", "HIGH", "bilmiyorum"],
    ["object", "SHIFT", "RAW_TEXT", "HIGH", "Vardiya"],
    ["relation", "ASSIGNMENT", "STRUCTURE", "MEDIUM", "oluşturmayı"],
    ["temporal", "CURRENT", "MORPHOLOGY", "LOW", "ilişki"],
    ["order", "SEQUENCE", "STRUCTURE", "MEDIUM", "oluşturmayı"],
    ["priority", "PRIORITY", "INFERENCE", "LOW", "bilmiyorum"],
    ["targetRequest", "RECORD", "STRUCTURE", "MEDIUM", "Vardiya"],
    ["targetRequest", "SURFACE", "SURFACE_CONTEXT", "MEDIUM", "Vardiya"],
    ["reference", "UNIQUE", "ACTIVE_TASK", "MEDIUM", "Vardiya"],
    ["polarity", "NEGATIVE", "MORPHOLOGY", "HIGH", "bilmiyorum"],
    ["productHelp", "ORIENTATION", "INFERENCE", "LOW", "bilmiyorum"],
    ["provenance", "RAW_TEXT", "RAW_TEXT", "HIGH", "Vardiya"],
    ["quality", "SUPPORT", "INFERENCE", "MEDIUM", "bilmiyorum"],
  ];

  for (const [dimension, value, provenance, quality, source] of sourceItems) {
    evidence = add(evidence, { dimension, value, provenance, quality, sourceSpan: span(source) });
  }

  evidence = add(evidence, {
    dimension: "reference",
    value: "ABSENT",
    provenance: "REFERENCE_HISTORY",
    quality: "HIGH",
    contextRef: "reference:none:current-turn",
  });
  evidence = add(evidence, {
    dimension: "contextUsed",
    value: "AUTH_CONTEXT",
    provenance: "AUTH_CONTEXT",
    quality: "HIGH",
    contextRef: "auth:user-role:COMPANY",
  });

  for (const value of [
    "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT",
    "CONCRETE_REQUEST_MODE_OVERRIDES_BROAD_ROLE_ASPECT",
    "NEGATED_RELATION",
    "LIMITED_RELATION",
  ]) {
    evidence = add(evidence, {
      dimension: "contradictions",
      value,
      provenance: "INFERENCE",
      quality: "CONTRADICTION",
      sourceSpan: span("ilişki"),
    });
  }

  return finalizeSemanticEvidence(evidence);
}

const result = buildEvidence();

assert.equal(result.sourceText, sourceText);
assert.equal(Array.isArray(result.items), true);
assert.equal(result.items.length, 21);
assert.equal(result.items.every((item) => item.authorizationEffect === "NONE"), true);
assert.equal(result.items.every((item) => item.dimension && item.value !== undefined), true);
assert.equal(result.items.filter((item) => item.sourceSpan).length >= 16, true);
assert.equal(result.items.filter((item) => item.contextRef).length >= 2, true);
assert.equal(result.contradictions.length, 4);
assert.equal(result.quality.contradictionCount, 4);
assert.deepEqual([...new Set(result.items.map((item) => item.provenance))].sort(), [...PROVENANCE].sort());
assert.equal(semanticEvidenceContract.PROVENANCE_SOURCES, undefined);
assert.deepEqual(result.contextUsed[2].contextRef, {
  id: "history-1",
  metadata: { freshness: "FRESH" },
  type: "reference",
});

for (const item of result.items) {
  assert.ok(PROVENANCE.includes(item.provenance));
  assert.ok(["HIGH", "MEDIUM", "LOW", "CONTRADICTION"].includes(item.quality));
  if (item.sourceSpan) assertSourceSpan(item, sourceText);
  if (item.contextRef) assertContextReference(item);
}

for (const key of FORBIDDEN_DECISION_FIELDS) {
  assert.equal(Object.prototype.hasOwnProperty.call(result, key), false, `forbidden result field: ${key}`);
  for (const item of result.items) {
    assert.equal(Object.prototype.hasOwnProperty.call(item, key), false, `forbidden item field: ${key}`);
  }
}

assert.equal(Object.isFrozen(result), true);
assert.equal(Object.isFrozen(result.items), true);
assert.equal(Object.isFrozen(result.items[0]), true);
assert.equal(Object.isFrozen(result.contradictions), true);
assert.throws(() => result.items.push({}), TypeError);
assert.throws(() => { result.items[0].value = "NONE"; }, TypeError);
assert.throws(() => add(result, {
  dimension: "subject",
  value: "NONE",
  provenance: "RAW_TEXT",
  quality: "HIGH",
  sourceSpan: span("Vardiya"),
}), /finalized/);

assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
  dimension: "requestMode",
  value: "APPROVE",
  provenance: "RAW_TEXT",
  quality: "HIGH",
  sourceSpan: span("Vardiya"),
}), /allowed value/);
assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
  dimension: "subject",
  value: "ROLE",
  provenance: "UNKNOWN",
  quality: "HIGH",
  sourceSpan: span("Vardiya"),
}), /provenance/);
assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
  dimension: "subject",
  value: "ROLE",
  provenance: "RAW_TEXT",
  quality: "HIGH",
}), /sourceSpan or contextRef/);
assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
  dimension: "subject",
  value: "ROLE",
  provenance: "RAW_TEXT",
  quality: "HIGH",
  sourceSpan: span("Vardiya"),
  roleHelp: true,
}), /decision field/);

for (const field of FORBIDDEN_DECISION_FIELDS) {
  assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
    dimension: "subject",
    value: "ROLE",
    provenance: "RAW_TEXT",
    quality: "HIGH",
    sourceSpan: span("Vardiya"),
    [field]: true,
  }), /decision field/);

  assert.throws(() => createSemanticEvidence({
    sourceText,
    featureSet: { metadata: { nested: { [field]: true } } },
    contextUsed: [],
  }), /decision field/);

  assert.throws(() => add(createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] }), {
    dimension: "subject",
    value: "ROLE",
    provenance: "RAW_TEXT",
    quality: "HIGH",
    contextRef: { metadata: { nested: { [field]: true } } },
  }), /decision field/);
}

const tampered = createSemanticEvidence({ sourceText, featureSet: {}, contextUsed: [] });
tampered.featureSet.metadata = { nested: { semanticAction: "VIEW" } };
assert.throws(() => finalizeSemanticEvidence(tampered), /decision field/);

assert.deepEqual(buildEvidence(), result);
assert.equal(JSON.stringify(buildEvidence()), JSON.stringify(result));

console.log("status=PASS");
console.log(`items=${result.items.length}`);
console.log(`dimensions=${new Set(result.items.map((item) => item.dimension)).size}`);
console.log(`provenanceSources=${PROVENANCE.length}`);
console.log(`contradictions=${result.contradictions.length}`);
