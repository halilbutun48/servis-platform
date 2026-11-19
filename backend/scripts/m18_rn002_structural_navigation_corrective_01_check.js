import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const COMPANY_CONTEXT = {
  role: "COMPANY",
  currentDomain: "OPERATIONS",
  currentSurface: { path: "/company/operations" },
  evidence: { product: true },
};
const COMPANY_SCREEN = { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" };

function evidence(text, context = COMPANY_CONTEXT, screenContext = COMPANY_SCREEN) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context,
    conversationState: {},
    screenContext,
  });
}

function canonical(text, role = "COMPANY") {
  return resolveCanonicalConversationRequest({
    message: text,
    user: { id: 910002, role, companyId: 1 },
    conversationState: {},
    screenContext: COMPANY_SCREEN,
    env: { SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "OLD" },
  });
}

const navigationPositives = [
  ["direct", "Anlaşma bölümüne git."],
  ["polite", "Teklif bölümüne gider misin?"],
  ["inflected-polite", "Teklif alanına beni götürür müsün?"],
  ["destination-case", "Rota ekranına geçer misin?"],
  ["product-surface", "Operasyon paneline ulaşabilir misin?"],
  ["plural-guidance", "Anlaşma özetine gidelim."],
  ["supported-object", "Güzergah alanına beni götürür müsün?"],
  ["no-workflow", "Teklif alanına ilerleyebilir misin?"],
];

for (const [label, text] of navigationPositives) {
  const result = evidence(text);
  assert.equal(result.requestMode.value, "NAVIGATE", `${label}: structural navigation mode`);
  assert.equal(result.requestMode.provenance.includes("RAW_TEXT"), true, `${label}: raw provenance`);
  assert.notEqual(result.object.value, "NONE", `${label}: concrete object remains observable`);
}

const canonicalNavigation = canonical("Teklif alanına beni götürür müsün?");
assert.equal(canonicalNavigation.request.semanticScope.class, "PRODUCT_EXPLICIT", "canonical navigation scope");
assert.equal(canonicalNavigation.request.semanticAction.actionClass, "NAVIGATE", "canonical navigation action");
assert.equal(canonicalNavigation.request.semanticAction.objectClass, "OFFER", "canonical navigation object");
assert.equal(canonicalNavigation.request.semanticAction.resolutionStatus, "RESOLVED", "canonical navigation resolution");
assert.equal(canonicalNavigation.request.operation, "NAVIGATE_AUTHORIZED_SURFACE", "canonical navigation operation");

const explain = evidence("Anlaşma bölümünün işleyişini açıklar mısın?");
assert.equal(explain.requestMode.value, "EXPLAIN", "explanation remains explanation");

const view = evidence("Anlaşma kaydını görüntüle.");
assert.equal(view.requestMode.value, "VIEW", "record view remains view");

const create = evidence("Yeni anlaşma kaydı oluştur.");
assert.equal(create.requestMode.value, "CREATE", "create remains create");

const update = evidence("Anlaşma kaydını güncelle.");
assert.equal(update.requestMode.value, "UPDATE", "update remains update");

const ambiguous = canonical("Beni oraya götürür müsün?");
assert.notEqual(ambiguous.request.semanticAction.actionClass, "NAVIGATE", "unresolved deictic target is not promoted to navigation");
assert.notEqual(ambiguous.request.semanticAction.resolutionStatus, "RESOLVED", "unresolved deictic target remains unresolved");

const outOfScope = evidence("Yarın kıyıda rüzgar şiddetlenir mi?");
assert.equal(outOfScope.requestMode.value, "GENUINE_OOS", "genuine off-topic remains out of scope");

const roleOnly = evidence("Şirket operasyonları.");
assert.notEqual(roleOnly.requestMode.value, "NAVIGATE", "role context alone does not synthesize navigation");

const objectOnly = evidence("Anlaşma özetini anlatır mısın?");
assert.equal(objectOnly.requestMode.value, "EXPLAIN", "object alone remains explanation");

const unauthorizedSemanticMeaning = canonical("Anlaşma alanına gider misin?", "ROOM");
assert.equal(unauthorizedSemanticMeaning.request.semanticAction.actionClass, "NAVIGATE", "authorization does not erase semantic navigation");

console.log("status=PASS");
console.log(`navigationPositiveCases=${navigationPositives.length}`);
console.log("negativeControls=10");
