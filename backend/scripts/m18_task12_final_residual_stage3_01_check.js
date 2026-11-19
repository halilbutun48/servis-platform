import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const context = {
  role: "ORGANIZATION",
  currentDomain: "OPERATIONS",
  currentSurface: { path: "/organization/operations" },
  evidence: { product: true },
};
const screenContext = { path: context.currentSurface.path, label: "OPERATIONS", role: context.role };
const user = { id: 1, role: context.role, organizationId: 1 };

function evidence(text, evidenceContext = context, evidenceScreenContext = screenContext) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: evidenceContext,
    conversationState: {},
    screenContext: evidenceScreenContext,
  });
}

function canonical(text) {
  return resolveCanonicalConversationRequest({
    message: text,
    user,
    conversationState: {},
    screenContext,
    env: { SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
}

const externalWeather = evidence("Yarın kıyıda rüzgar şiddetlenir mi?");
assert.equal(externalWeather.requestMode.value, "GENUINE_OOS", "bounded weather-domain evidence is positive genuine-OOS evidence");
assert.equal(externalWeather.quality.roleHelpCandidate, false, "external-domain evidence vetoes role-context promotion");
assert.equal(canonical("Yarın kıyıda rüzgar şiddetlenir mi?").request.semanticScope.class, "OFF_TOPIC_GENUINE", "canonical V3 preserves genuine-OOS evidence");

const unknown = evidence("Bu konuda ne olabilir?");
assert.notEqual(unknown.requestMode.value, "GENUINE_OOS", "unknown language is not automatically off-topic");
assert.equal(unknown.quality.genuineOosEvidence, false, "unknown language has no positive external-domain evidence");

const productProcess = evidence("Operasyon akışında izlenecek ilk görev nedir?");
assert.equal(productProcess.quality.roleHelpCandidate, true, "product-grounded process guidance remains role help");

const productResponsibility = evidence("Planlama döngüsünde bana verilen görevler nelerdir?");
assert.equal(productResponsibility.quality.roleHelpCandidate, true, "actor-assignment responsibility remains role help");

const productEntity = evidence("Taşıt kapasitesinin açıklaması nedir?");
assert.equal(productEntity.object.value, "ENTITY", "product entity explanation retains concrete object evidence");
assert.equal(productEntity.quality.roleHelpCandidate, false, "entity explanation is not broadened into role help");

const numericComparison = evidence("Kayıt 31 ile 47 arasındaki değişimi çıkar.");
assert.equal(numericComparison.requestMode.value, "COMPARE", "a two-reference delta request is a comparison without a literal compare verb");
assert.equal(canonical("Kayıt 31 ile 47 arasındaki değişimi çıkar.").request.semanticAction.actionClass, "COMPARE", "canonical action preserves structural comparison evidence");
assert.equal(evidence("İki teklif kaydını karşılaştır.").requestMode.value, "COMPARE", "an explicit two-offer comparison remains compare");
assert.equal(evidence("Hangi teklif daha uygundur?").requestMode.value, "COMPARE", "a product comparative question is a comparison request");
assert.equal(evidence("Kayıt 31 ile 47 arasındaki fark nedir?").requestMode.value, "EXPLAIN", "a comparison question remains an explanation rather than an imperative comparison");
assert.equal(evidence("Kayıt 31 ile 47 arasındaki kaydı aç.").requestMode.value, "VIEW", "two references alone do not overpromote a direct record view to comparison");
assert.equal(evidence("Teklif kaydının koşullarını açıkla.").requestMode.value, "EXPLAIN", "an explanation about one offer is not comparison");
assert.equal(evidence("Teklif kaydına git.").requestMode.value, "NAVIGATE", "navigation to an offer is not comparison");
assert.notEqual(evidence("Dosya ile klasörü aç.").requestMode.value, "COMPARE", "a generic conjunction is not comparison");
assert.equal(evidence("İki bölgede yağmur ölçümünü karşılaştır.").requestMode.value, "GENUINE_OOS", "a genuine off-topic comparison remains off-topic");

const genericProcess = evidence("Yarın ben okula gider miyim?", { role: context.role }, {});
assert.equal(genericProcess.quality.roleHelpCandidate, false, "generic actor/process evidence without a product anchor is insufficient");

console.log("status=PASS");
console.log("structuralCases=17");
