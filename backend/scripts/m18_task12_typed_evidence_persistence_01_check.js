import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

function semanticContext(role = "COMPANY") {
  return {
    role,
    currentDomain: "OPERATIONS",
    currentSurface: { path: `/${role.toLowerCase()}/operations` },
    evidence: { product: true },
  };
}

const text = "Şirket yöneticisinin takip etmesi beklenen başlıklar";
const role = "COMPANY";
const features = extractTurkishSemanticFeatures({ text });
const sourceTypedEvidence = composeSemanticEvidence({
  features,
  context: semanticContext(role),
  conversationState: {},
  screenContext: { path: `/${role.toLowerCase()}/operations`, role },
});
const canonical = resolveCanonicalConversationRequest({
  message: text,
  user: { id: 1, role },
  screenContext: { path: `/${role.toLowerCase()}/operations`, role },
  env: { M18_SEMANTIC_AUTHORITY_MODE: "NEW" },
});

assert.equal(sourceTypedEvidence.requestMode.value, "EXPLAIN");
assert.equal(sourceTypedEvidence.quality.authorizationEffect, "NONE");
assert.ok(sourceTypedEvidence.provenance.length > 0);

const persistedTypedEvidence = canonical.request.typedEvidence;
assert.ok(persistedTypedEvidence, "canonical request must persist typedEvidence");
assert.equal(Object.isFrozen(persistedTypedEvidence), true, "persisted typedEvidence must remain immutable");
assert.equal(Object.isFrozen(persistedTypedEvidence.provenance), true, "persisted provenance must remain immutable");
assert.deepEqual(
  Object.keys(persistedTypedEvidence).sort(),
  Object.keys(sourceTypedEvidence).sort(),
  "persistence must not invent or drop typed-evidence dimensions",
);
assert.equal(persistedTypedEvidence.requestMode.value, sourceTypedEvidence.requestMode.value);
assert.equal(persistedTypedEvidence.roleAspect.value, sourceTypedEvidence.roleAspect.value);
assert.deepEqual(persistedTypedEvidence.provenance, sourceTypedEvidence.provenance);
assert.equal(persistedTypedEvidence.quality.authorizationEffect, sourceTypedEvidence.quality.authorizationEffect);
assert.equal(
  persistedTypedEvidence.requestMode.authorizationEffect,
  sourceTypedEvidence.requestMode.authorizationEffect,
);

const sourceKeys = new Set(Object.keys(sourceTypedEvidence));
const syntheticKeys = Object.keys(persistedTypedEvidence).filter((key) => !sourceKeys.has(key));
assert.deepEqual(syntheticKeys, [], "persistence must not synthesize absent evidence fields");

console.log("status=PASS");
console.log("sourceTypedEvidencePresent=YES");
console.log("canonicalTypedEvidencePresent=YES");
console.log("fieldParity=PASS");
console.log("provenanceParity=PASS");
console.log("authorizationEffectParity=PASS");
console.log(`syntheticTypedEvidenceCount=${syntheticKeys.length}`);
