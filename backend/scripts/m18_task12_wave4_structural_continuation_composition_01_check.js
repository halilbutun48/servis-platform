import assert from "node:assert/strict";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const user = { id: 990604, role: "COMPANY", companyKind: "COMPANY", companyId: 1, sessionVersion: 1 };
const screenContext = { id: 604, path: "/company/vardiyalar", label: "synthetic surface", role: "COMPANY" };

function spanEvidence(featureKind, value) {
  return {
    featureKind,
    value,
    sourceSpan: { start: 0, end: 6 },
    normalizationForm: "TURKISH_LOWERCASE_NFC",
    producer: "synthetic-wave-4-structural-fixture",
    supportOrContradiction: "SUPPORT",
    quality: "HIGH",
  };
}

function continuationFeatures({ explicitObject = false } = {}) {
  const relations = {
    actorObject: [],
    ownership: [],
    process: [spanEvidence("PROCESS_RELATION", "PROCESS")],
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
    sourceText: "synthetic structural continuation",
    normalizedText: "synthetic structural continuation",
    tokens: [{ normalized: explicitObject ? "bak" : "devam", lemmaCandidates: [explicitObject ? "bak" : "devam"], sourceSpan: { start: 0, end: 6 } }],
    polarity: { negation: [], modality: [spanEvidence("MODALITY", "CONTINUATION")] },
    question: { isQuestion: !explicitObject, markers: [], form: "SYNTHETIC_CONTINUATION" },
    relations,
    temporal: [],
    order: [],
    priority: [],
    structure: { local: [] },
    referenceEvidence: [spanEvidence("REFERENCE", "UNIQUE")],
    ...(explicitObject ? { objectEvidence: [spanEvidence("CONCRETE_OBJECT", "AGREEMENT")] } : {}),
    featureQuality: { overall: "HIGH", partial: false, bounded: true, recognizedFeatureCount: 2 },
  };
}

function activeContinuationState() {
  return {
    activeDomain: "SHIFTS",
    activeGuidedTask: {
      taskId: "synthetic-active-task",
      screenPath: screenContext.path,
      semanticPlan: { family: "UI_GUIDANCE", workflowIntent: "CREATE_SHIFT" },
      taskState: { status: "ACTIVE" },
    },
    uniqueDiscourseReferent: { type: "SHIFT", id: 61, source: "REFERENCE_HISTORY" },
  };
}

function canonicalContext(message, conversationState) {
  return buildCanonicalSemanticContext({ message, user, screenContext, conversationState });
}

function compose(features, context, conversationState) {
  return composeSemanticEvidence({
    features,
    context,
    conversationState,
    screenContext,
  });
}

const activeState = activeContinuationState();
const activeContext = canonicalContext("devam", activeState);
assert.equal(activeContext.continuity.continuation.status, "VALID", "active continuation provenance is valid");
assert.equal(activeContext.contextUsed.some((entry) => entry.source === "ACTIVE_TASK" && entry.used), true, "active-task provenance is transported");
assert.equal(activeContext.contextUsed.some((entry) => entry.source === "REFERENCE_HISTORY" && entry.used), true, "reference provenance is transported");

// The typed reference is evidence for the continuation fixture; no concrete
// record/object is authored, so responsibility composition remains eligible.
const activeEvidenceContext = {
  ...activeContext,
  referenceState: { ...activeContext.referenceState, uniqueReferent: null },
};
const activeResult = compose(continuationFeatures(), activeEvidenceContext, {
  ...activeState,
  uniqueDiscourseReferent: null,
});
assert.equal(activeResult.requestMode.value, "CONTINUE", "valid active task composes continuation mode");
assert.equal(activeResult.roleAspect.value, "PROCESS_RESPONSIBILITY", "structural process evidence composes responsibility aspect");
assert.equal(activeResult.productHelp.value, "PROCESS_GUIDANCE", "continuation composes into the existing responsibility help family");
assert.equal(activeResult.targetRequest.value, "PRODUCT_AREA", "continuation keeps the existing product-area target");
assert.equal(activeResult.quality.roleHelpCandidate, true, "valid continuation is a role-help candidate");
assert.ok(activeResult.requestMode.provenance.includes("ACTIVE_TASK"), "continuation retains active-task provenance");
assert.ok(activeResult.reference.provenance.includes("STRUCTURE"), "continuation retains typed reference provenance");

const explicitContext = canonicalContext("Yeni sözleşmeye bak", activeState);
assert.equal(explicitContext.continuity.precedence, "EXPLICIT_INPUT", "explicit new intent outranks active task");
assert.equal(explicitContext.contextUsed.some((entry) => entry.source === "ACTIVE_TASK"), false, "overridden task is not context-used");
const explicitResult = compose(continuationFeatures({ explicitObject: true }), explicitContext, activeState);
assert.equal(explicitResult.requestMode.value, "VIEW", "explicit new action wins over continuation state");
assert.equal(explicitResult.productHelp.value, "NONE", "explicit concrete object is not role-help");
assert.equal(explicitResult.quality.roleHelpCandidate, false);

const staleState = {
  ...activeState,
  activeGuidedTask: {
    ...activeState.activeGuidedTask,
    taskState: { status: "STALE" },
  },
  uniqueDiscourseReferent: { ...activeState.uniqueDiscourseReferent, stale: true },
};
const staleContext = canonicalContext("devam", staleState);
assert.equal(staleContext.continuity.continuation.status, "REJECTED_STALE", "stale continuation is rejected by context owner");
assert.equal(staleContext.contextUsed.some((entry) => entry.source === "ACTIVE_TASK"), false, "stale task is not context-used");
const staleResult = compose(continuationFeatures(), staleContext, staleState);
assert.notEqual(staleResult.requestMode.value, "CONTINUE", "stale state cannot provide continuation mode");
assert.equal(staleResult.productHelp.value, "NONE", "stale state cannot resurrect role-help");
assert.equal(staleResult.quality.roleHelpCandidate, false);

for (const result of [activeResult, explicitResult, staleResult]) {
  assert.equal(result.quality.authorizationEffect, "NONE", "semantic evidence never authorizes");
  assert.equal(result.provenance.every((entry) => entry.authorizationEffect === "NONE"), true, "provenance has no authorization effect");
}

console.log("status=PASS");
console.log("syntheticCases=3");
console.log("continuationResponsibilityCompositions=1");
console.log("precedenceControls=2");
console.log("authorizationEffects=0");
