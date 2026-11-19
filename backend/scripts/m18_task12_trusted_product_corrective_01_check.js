import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

function context(role = "COMPANY") {
  return {
    role,
    currentDomain: "OPERATIONS",
    currentSurface: { path: `/${role.toLowerCase()}/operations` },
    evidence: { product: true },
  };
}

function evidenceFor(text, role = "COMPANY") {
  const features = extractTurkishSemanticFeatures({ text });
  return composeSemanticEvidence({
    features,
    context: context(role),
    conversationState: {},
    screenContext: { path: `/${role.toLowerCase()}/operations` },
  });
}

function canonicalFor(text, role = "COMPANY", conversationState = null) {
  return resolveCanonicalConversationRequest({
    message: text,
    user: { id: 1, role },
    conversationState,
    screenContext: { path: `/${role.toLowerCase()}/operations`, role },
    env: { M18_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
}

const nominalRoleHelp = evidenceFor("Şirket yöneticisinin takip etmesi beklenen başlıklar");
assert.equal(nominalRoleHelp.requestMode.value, "EXPLAIN", "nominal role-help must have canonical explain mode");
assert.equal(nominalRoleHelp.quality.roleHelpCandidate, true, "nominal role-help must compose as a candidate");

const roleHelpWithMentionedSurface = evidenceFor("Planlama ekranında karar verirken hangi ölçütlere dikkat etmeliyim?");
assert.equal(roleHelpWithMentionedSurface.requestMode.value, "EXPLAIN");
assert.equal(roleHelpWithMentionedSurface.quality.roleHelpCandidate, true, "mentioned surface is context, not the requested object");
assert.equal(roleHelpWithMentionedSurface.targetRequest.value, "PRODUCT_AREA");

const create = evidenceFor("Yeni bir anlaşma oluştur.");
assert.equal(create.requestMode.value, "CREATE", "creation is a typed request mode");
assert.equal(create.object.value, "AGREEMENT", "agreement is a concrete object");
assert.equal(create.quality.roleHelpCandidate, false, "creation cannot promote role-help");

const compare = evidenceFor("İki teklif arasındaki farkları karşılaştır.");
assert.equal(compare.requestMode.value, "COMPARE", "comparison is a typed request mode");
assert.equal(compare.quality.roleHelpCandidate, false);

const view = evidenceFor("Vardiyalar ekranını önüme getir.", "ROOM");
assert.equal(view.requestMode.value, "VIEW", "surface presentation is a view request");
assert.equal(view.quality.roleHelpCandidate, false);

const entityExplanation = evidenceFor("Seçili anlaşmanın durumunu anlat.");
assert.equal(entityExplanation.requestMode.value, "EXPLAIN");
assert.equal(entityExplanation.object.value, "AGREEMENT", "selected agreement must outrank role context");
assert.equal(entityExplanation.quality.roleHelpCandidate, false);

const createCanonical = canonicalFor("Yeni bir anlaşma oluştur.");
assert.equal(createCanonical.request.semanticAction.actionClass, "CREATE");
assert.equal(createCanonical.request.semanticAction.objectClass, "AGREEMENT");
assert.notEqual(createCanonical.request.semanticScope.class, "UNRESOLVED");

const viewCanonical = canonicalFor("Vardiyalar ekranını önüme getir.", "ROOM");
assert.equal(viewCanonical.request.semanticAction.actionClass, "VIEW");

const entityCanonical = canonicalFor("Seçili anlaşmanın durumunu anlat.");
assert.equal(entityCanonical.request.semanticScope.class, "PRODUCT_AMBIGUOUS");
assert.equal(entityCanonical.request.semanticAction.actionClass, "NONE");
assert.equal(entityCanonical.request.semanticAction.objectClass, null);
assert.equal(entityCanonical.request.typedEvidence.reference.value, "UNRESOLVED");
assert.equal(entityCanonical.request.semanticAction.resolutionStatus, "UNRESOLVED");
assert.equal(entityCanonical.request.operation, "CLARIFY_SEMANTIC_REQUEST");
assert.equal(entityCanonical.canonicalShape.taskType, "CLARIFY");
assert.equal(entityCanonical.canonicalShape.roleHelpIntent, false);

const entityCanonicalWithReferent = canonicalFor(
  "Seçili anlaşmanın durumunu anlat.",
  "COMPANY",
  { uniqueDiscourseReferent: { type: "AGREEMENT", id: 42 } },
);
assert.equal(entityCanonicalWithReferent.request.semanticScope.class, "PRODUCT_EXPLICIT");
assert.equal(entityCanonicalWithReferent.request.semanticAction.actionClass, "EXPLAIN");
assert.equal(entityCanonicalWithReferent.request.semanticAction.objectClass, "AGREEMENT");
assert.equal(entityCanonicalWithReferent.request.typedEvidence.reference.value, "UNIQUE");
assert.equal(entityCanonicalWithReferent.request.semanticAction.resolutionStatus, "RESOLVED");
assert.equal(entityCanonicalWithReferent.request.operation, "LOOK_UP_FIELD");
assert.equal(entityCanonicalWithReferent.canonicalShape.taskType, "FIELD_LOOKUP");
assert.equal(entityCanonicalWithReferent.canonicalShape.roleHelpIntent, false);

const financialExplanation = canonicalFor("Ödeme tutarı için üst limit nedir.", "SUPER_ADMIN");
assert.equal(financialExplanation.request.semanticAction.actionClass, "EXPLAIN");
assert.equal(financialExplanation.request.semanticAction.objectClass, "RECORD", "generic financial field queries use the canonical readable RECORD target");
assert.equal(financialExplanation.request.typedEvidence.reference.value, "ABSENT");
assert.equal(financialExplanation.request.semanticAction.resolutionStatus, "RESOLVED");
assert.equal(financialExplanation.canonicalShape.taskType, "FIELD_LOOKUP");
assert.equal(financialExplanation.request.operation, "LOOK_UP_FIELD");
assert.notEqual(financialExplanation.validation.status, "SEMANTIC_UNRESOLVED");

const selectedFinancialWithoutReferent = canonicalFor(
  "Seçili sözleşmenin ödeme üst limiti nedir.",
  "COMPANY",
);
assert.equal(selectedFinancialWithoutReferent.request.semanticScope.class, "PRODUCT_AMBIGUOUS");
assert.equal(selectedFinancialWithoutReferent.request.semanticAction.actionClass, "NONE");
assert.equal(selectedFinancialWithoutReferent.request.semanticAction.objectClass, null);
assert.equal(selectedFinancialWithoutReferent.request.typedEvidence.reference.value, "UNRESOLVED");
assert.equal(selectedFinancialWithoutReferent.request.semanticAction.resolutionStatus, "UNRESOLVED");
assert.equal(selectedFinancialWithoutReferent.canonicalShape.taskType, "CLARIFY");
assert.equal(selectedFinancialWithoutReferent.request.operation, "CLARIFY_SEMANTIC_REQUEST");

const selectedFinancialWithReferent = canonicalFor(
  "Seçili sözleşmenin ödeme üst limiti nedir.",
  "COMPANY",
  { uniqueDiscourseReferent: { type: "AGREEMENT", id: 42 } },
);
assert.equal(selectedFinancialWithReferent.request.semanticScope.class, "PRODUCT_EXPLICIT");
assert.equal(selectedFinancialWithReferent.request.semanticAction.actionClass, "EXPLAIN");
assert.equal(selectedFinancialWithReferent.request.semanticAction.objectClass, "AGREEMENT");
assert.equal(selectedFinancialWithReferent.request.typedEvidence.reference.value, "UNIQUE");
assert.equal(selectedFinancialWithReferent.request.semanticAction.resolutionStatus, "RESOLVED");
assert.equal(selectedFinancialWithReferent.canonicalShape.taskType, "FIELD_LOOKUP");
assert.equal(selectedFinancialWithReferent.request.operation, "LOOK_UP_FIELD");

for (const result of [nominalRoleHelp, roleHelpWithMentionedSurface, create, compare, view, entityExplanation]) {
  assert.equal(result.quality.authorizationEffect, "NONE");
  assert.equal(result.provenance.every((entry) => entry.authorizationEffect === "NONE"), true);
}

console.log("status=PASS");
console.log("structuralCases=9");
console.log("requestModesCovered=EXPLAIN,CREATE,COMPARE,VIEW");
console.log("semanticOverreachControls=2");
console.log("TRUSTED_BATCH_REALIGNMENT_CASE_COUNT=2");
console.log("noReferentControl=PASS");
console.log("validReferentControl=PASS");
console.log("genericFinancialControl=PASS");
console.log("selectedFinancialReferenceControl=PASS");
