import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const context = {
  role: "SCHOOL",
  currentDomain: "OPERATIONS",
  currentSurface: { path: "/school/operations" },
  evidence: { product: true },
};
const screenContext = { path: context.currentSurface.path, label: "OPERATIONS", role: context.role };
const user = { id: 1, role: context.role, schoolId: 1 };

function evidence(text) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context,
    conversationState: {},
    screenContext,
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

assert.equal(evidence("Toplantı kaç dakika sürer?").requestMode.value, "EXPLAIN", "interrogative suffix is not navigation");
assert.equal(evidence("İşlem alanına geç.").requestMode.value, "NAVIGATE", "standalone navigation imperative remains navigation");
assert.equal(evidence("Yöneticinin izlediği işler").requestMode.value, "EXPLAIN", "descriptive participle is not a view imperative");
assert.equal(evidence("Kurulum sırasını açıkla.").requestMode.value, "EXPLAIN", "installation nominal is not a create imperative");
assert.equal(evidence("Günlük kaydı aç.").requestMode.value, "VIEW", "open existing record is view");
assert.equal(evidence("Şunu aç.").requestMode.value, "EXPLAIN", "ambiguous referent is not grounded navigation");
assert.equal(evidence("Yeni yoklama kaydını başlat.").requestMode.value, "CREATE", "creation imperative is structurally specific");
assert.equal(evidence("İki vardiya kaydını kıyasla.").requestMode.value, "COMPARE", "comparison imperative is structurally specific");
assert.equal(evidence("Durak çizelgesini denetle.").requestMode.value, "OTHER_PRODUCT_REQUEST", "unclassified product imperative remains observable");
assert.equal(evidence("Hangi denetim başlıklarını kontrol etmem gerekir?").requestMode.value, "EXPLAIN", "interrogative control relation is not an imperative request");
assert.equal(evidence("Teklifi sorumlu birime ilet.").requestMode.value, "SEND", "send imperative remains distinct from explain");
assert.equal(evidence("Açık vardiya kaydını güncelle.").requestMode.value, "UPDATE", "mutation imperative remains distinct from explain");

const capacityEntity = evidence("Bu taşıt kaç yolcu alır?");
assert.equal(capacityEntity.object.value, "ENTITY", "concrete capacity entity remains observable");
assert.equal(capacityEntity.quality.roleHelpCandidate, false, "concrete capacity entity outranks broad role help");
const businessBoundary = evidence("Şirketin kapasite sınırı nedir?");
assert.equal(businessBoundary.object.value, "ENTITY", "business capacity is a concrete entity");
assert.equal(businessBoundary.quality.roleHelpCandidate, false, "business entity boundary is not role help");

const nominalRoleHelp = evidence("Saha ekibinde bana düşen izleme düzeni");
assert.equal(nominalRoleHelp.requestMode.value, "EXPLAIN", "nominal responsibility relation supplies explain evidence without a default");
assert.equal(nominalRoleHelp.quality.roleHelpCandidate, true, "nominal responsibility relation supports role help");

const nominalControlRoleHelp = evidence("Saha ekibinde bana düşen kontrol düzeni");
assert.equal(nominalControlRoleHelp.requestMode.value, "EXPLAIN", "a nominal control relation is not an imperative action");
assert.equal(nominalControlRoleHelp.quality.roleHelpCandidate, true, "a nominal control relation retains role-help composition");
assert.equal(evidence("Kontrol et.").requestMode.value, "OTHER_PRODUCT_REQUEST", "the explicit control-verb form remains an observable product request");

assert.equal(canonical("Teklifi sorumlu birime ilet.").request.semanticAction.actionClass, "SEND", "canonical action preserves typed send evidence");
assert.equal(canonical("Açık vardiya kaydını güncelle.").request.semanticAction.actionClass, "UPDATE", "canonical action preserves typed mutation evidence");
assert.equal(canonical("Durak çizelgesini denetle.").request.semanticAction.actionClass, "EXPLAIN", "other product request remains non-executing");

console.log("status=PASS");
console.log("structuralCases=16");
