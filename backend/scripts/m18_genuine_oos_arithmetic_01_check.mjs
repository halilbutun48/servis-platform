import assert from "node:assert/strict";

import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const user = { id: 880002, role: "COMPANY", companyKind: "COMPANY", companyId: 1, sessionVersion: 1 };
const screenContext = {
  path: "/company/operations",
  label: "Operasyon Paneli",
  role: "COMPANY",
  uiHints: { foregroundSurface: { key: "company-operations", kind: "SURFACE" } },
};
const context = {
  role: "COMPANY",
  currentDomain: "OPERATIONS",
  currentSurface: { path: "/company/operations", label: "Operasyon Paneli" },
  evidence: { product: true, object: [], action: [], relation: false },
  referenceState: { selectedEntity: null, currentTarget: null, uniqueReferent: null },
  freshness: { currentSurface: true, activeTask: false, target: false },
};

function observe(text) {
  const features = extractTurkishSemanticFeatures({ text });
  const evidence = composeSemanticEvidence({
    features,
    context,
    conversationState: { recentMessages: [], activeGuidedTask: null },
    screenContext,
  });
  const canonical = resolveCanonicalConversationRequest({
    message: text,
    user,
    screenContext,
    conversationState: { recentMessages: [], activeGuidedTask: null },
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  const action = canonical.request.semanticAction;
  return {
    features,
    evidence,
    canonical: {
      scope: canonical.request.semanticScope.class,
      action: action.actionClass,
      object: action.objectClass,
      resolution: action.resolutionStatus,
      requestMode: canonical.request.typedEvidence?.requestMode?.value || null,
    },
  };
}

const arithmeticPositives = [
  ["ARITHMETIC_ADDITION", "2+2 kaç eder?"],
  ["ARITHMETIC_MULTIPLICATION", "7 çarpı 8 nedir?"],
  ["ARITHMETIC_FRACTION", "100'ün yarısı kaç?"],
  ["ARITHMETIC_DIVISION", "12 / 3 kaç olur?"],
];

const nonProductPositives = [
  ["CREATIVE_MUSIC", "Doğum günü için bir müzik listesi hazırlar mısın?"],
  ["CREATIVE_MEAL", "Evde misafirler için bir yemek hazırlar mısın?"],
];

const productNumericNegatives = [
  ["PRODUCT_OFFER_TOTAL", "Bu teklif kaç TL eder?"],
  ["PRODUCT_SHIFT_COST", "Bu vardiyanın toplam maliyeti kaç olur?"],
  ["PRODUCT_PERCENTAGE", "Bu fiyatın yüzde 10 fazlasını göster."],
  ["PRODUCT_CONTRACT_TOTAL", "Bu sözleşmenin aylık toplamını hesapla."],
];

const neutralNumericReferenceNegatives = [
  ["RECORD_ID_REFERENCE", "Vardiya kaydı 2'nin durumunu açıkla."],
  ["NUMERIC_COUNT_REFERENCE", "Toplam 2 kayıt var mı?"],
];

for (const [id, text] of arithmeticPositives) {
  const actual = observe(text);
  assert.ok(
    actual.evidence.domainEvidence.some((entry) => entry.kind === "EXTERNAL_DOMAIN" && entry.value === "ARITHMETIC"),
    `${id} positive arithmetic evidence`,
  );
  assert.equal(actual.canonical.requestMode, "GENUINE_OOS", `${id} request mode`);
  assert.equal(actual.canonical.scope, "OFF_TOPIC_GENUINE", `${id} scope`);
  assert.equal(actual.canonical.action, "NONE", `${id} action`);
  assert.equal(actual.canonical.resolution, "NOT_APPLICABLE", `${id} resolution`);
}

for (const [id, text] of nonProductPositives) {
  const actual = observe(text);
  assert.equal(actual.canonical.scope, "OFF_TOPIC_GENUINE", `${id} scope`);
  assert.equal(actual.canonical.action, "NONE", `${id} action`);
  assert.equal(actual.canonical.resolution, "NOT_APPLICABLE", `${id} resolution`);
}

for (const [id, text] of [...productNumericNegatives, ...neutralNumericReferenceNegatives]) {
  const actual = observe(text);
  assert.notEqual(actual.canonical.scope, "OFF_TOPIC_GENUINE", `${id} must retain product/reference eligibility`);
}

console.log(JSON.stringify({
  status: "PASS",
  arithmeticPositiveCount: arithmeticPositives.length,
  productNumericNegativeCount: productNumericNegatives.length,
  neutralNumericReferenceNegativeCount: neutralNumericReferenceNegatives.length,
}, null, 2));
