import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { buildSeferAbiCostAnalysisResponse } from "../src/ai/chat/seferAbiCostAnalysisAssistant.js";
import { buildConversationRoutingResponse } from "../src/ai/chat/conversationRouting.js";
import { buildRoomSelectedAgreementNextActionResponse } from "../src/ai/service.js";
import { getCanonicalConversationState } from "../src/ai/chat/canonicalConversationState.js";

const user = { role: "ROOM", roomId: 1 };
const screenContext = {
  path: "/room/financial-operations",
  label: "Finansal Operasyonlar",
  role: "ROOM",
};
const env = { ...process.env, AI_SEMANTIC_AUTHORITY_MODE: "NEW" };

function resolve(message, conversationState = null) {
  return resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    conversationState,
    env,
  });
}

function assertRoomCommercialFinanceOwnership() {
  const commercialScreen = {
    path: "/room/commercial-flow",
    label: "Ticari Çalışma Alanı",
    role: "ROOM",
    selectedEntityType: "shift",
    selectedEntityId: 210,
    selectedEntitySet: [{ type: "shift", id: 210, source: "LIVE_CONTEXT_CANDIDATE" }],
  };
  const prompts = [
    "Bu hakediş neden hazır değil?",
    "Ödeme hesabı eksik mi?",
    "Ödeme hazırlığı hangi aşamada?",
    "Bu ödemenin hazırlık durumu nedir?",
  ];
  for (const message of prompts) {
    const result = resolveCanonicalConversationRequest({
      message,
      user,
      screenContext: commercialScreen,
      env,
    });
    assert.equal(result.request.domain, "FINANCE", `${message} must remain in the financial domain`);
    assert.equal(result.request.operation, "ASSESS_CURRENT_RISK", `${message} must use the read-only financial assessment owner`);
    assert.equal(result.canonicalShape?.taskType, "RISK", `${message} must outrank selected-record context`);
    assert.equal(result.canonicalShape?.targetEntityType, null, `${message} must not treat a selected shift as a payment record`);
  }
  const noSelectionResult = resolveCanonicalConversationRequest({
    message: "Ödeme hazırlığı hangi aşamada?",
    user,
    screenContext: { ...commercialScreen, selectedEntityType: "", selectedEntityId: null, selectedEntitySet: [] },
    env,
  });
  assert.equal(noSelectionResult.request.operation, "ASSESS_CURRENT_RISK", "reference-less financial readiness must stay with the read-only financial owner");
  assert.equal(noSelectionResult.canonicalShape?.targetEntityType, null, "reference-less financial readiness must not invent a payment record");
  assert.equal(noSelectionResult.canonicalShape?.scopeTarget, "CURRENT_SCREEN", "reference-less financial readiness stays surface-scoped");
  return commercialScreen;
}

function assertFinancialProcessRouting() {
  const result = resolve("Fatura mutabakatını nereden takip edebilirim?");
  assert.equal(result.request.typedEvidence?.object?.value, "FINANCIAL");
  assert.equal(result.request.typedEvidence?.relation?.value, "PROCESS");
  assert.equal(result.request.domain, "FINANCE", "financial reconciliation must stay in the FINANCE domain");
  assert.notEqual(result.request.operation, "GENERAL_INFORMATION", "financial reconciliation must not fall into generic product help");
  assert.notEqual(result.canonicalShape?.primaryTask, "ROLE_EXPLANATION_HELP");
  return result;
}

function assertFinancialDeicticHandling() {
  const result = resolve("Bu tutarın kaynağı nedir?");
  assert.equal(result.request.typedEvidence?.object?.value, "FINANCIAL");
  assert.equal(result.request.ambiguity?.status, "UNRESOLVED", "unresolved financial deictic must remain safe to clarify");
  assert.equal(result.request.operation, "CLARIFY_SEMANTIC_REQUEST");
  assert.notEqual(result.request.domain, "PRODUCT");

  const visibleClarification = buildConversationRoutingResponse({
    route: "UNCLEAR_OR_AMBIGUOUS",
    message: "Bu tutarın kaynağı nedir?",
    semanticPlan: {
      canonicalRequest: result.request,
    },
    routingReason: "CANONICAL_SCOPE_REQUIRES_CLARIFICATION",
  });
  assert.match(visibleClarification, /planlanan teklif/iu);
  assert.match(visibleClarification, /tahmini maliyet/iu);
  assert.match(visibleClarification, /teklif taban[ıi]/iu);
  assert.match(visibleClarification, /kâr|kar/iu);
}

const financialProcessResult = assertFinancialProcessRouting();
const unsupported = await buildSeferAbiCostAnalysisResponse({
  baseResponse: {
    semanticPlan: {
      canonicalRequest: financialProcessResult.request,
      requestedDomains: ["FINANCE"],
    },
    screenPath: screenContext.path,
  },
  user,
  message: "Fatura mutabakatını nereden takip edebilirim?",
  screenContext,
});
assert.match(unsupported.reply, /doğrulanabilir bir liste\/hedef yok/iu);
assertFinancialDeicticHandling();
const commercialScreen = assertRoomCommercialFinanceOwnership();
for (const message of [
  "Bu hakediş neden hazır değil?",
  "Ödeme hesabı eksik mi?",
  "Ödeme hazırlığı hangi aşamada?",
]) {
  const response = await buildSeferAbiCostAnalysisResponse({
    baseResponse: {
      semanticPlan: {
        canonicalRequest: {
          version: "SEFER-ABI-CANONICAL-REQUEST-V3",
          domain: "FINANCE",
          operation: "ASSESS_CURRENT_RISK",
          typedEvidence: { object: { value: "FINANCIAL" } },
        },
        requestedDomains: ["FINANCE", "SHIFTS"],
      },
      screenPath: commercialScreen.path,
    },
    user,
    message,
    screenContext: commercialScreen,
  });
  assert.equal(response.questionType, "FINANCIAL_SURFACE_LIMITATION", `${message} must report the unsupported ROOM payment capability honestly`);
  assert.match(response.reply, /hakediş|ödeme|fatura/iu);
  assert.doesNotMatch(response.reply, /başlangıç|bitiş|araç|sürücü/iu, `${message} must not fall back to selected-shift fields`);
}
const commercialPaymentTabScreen = {
  ...commercialScreen,
  structuredFacts: {
    screenType: "PAYMENT_READINESS",
    activeTab: "settlement",
    selectedRecordType: "shift",
    selectedRecordId: 210,
  },
};
const sanitizedPaymentState = getCanonicalConversationState({
  user,
  screenContext: commercialPaymentTabScreen,
});
assert.equal(sanitizedPaymentState.screenContext.structuredFacts.activeTab, "settlement", "active financial tab must survive canonical context sanitization");
assert.equal(sanitizedPaymentState.screenContext.structuredFacts.screenType, "PAYMENT_READINESS", "financial preview surface type must survive canonical context sanitization");
for (const message of [
  "Bu hakediş neden hazır değil?",
  "Ödeme hesabı eksik mi?",
  "Ödeme hazırlığı hangi aşamada?",
]) {
  const response = await buildSeferAbiCostAnalysisResponse({
    baseResponse: {
      semanticPlan: {
        canonicalRequest: {
          version: "SEFER-ABI-CANONICAL-REQUEST-V3",
          domain: "FINANCE",
          operation: "ASSESS_CURRENT_RISK",
          typedEvidence: { object: { value: "FINANCIAL" } },
        },
        requestedDomains: ["FINANCE", "SHIFTS"],
      },
      screenPath: commercialPaymentTabScreen.path,
    },
    user,
    message,
    screenContext: commercialPaymentTabScreen,
  });
  assert.doesNotMatch(response.reply, /Teklif ve Kârlılık/iu, `${message} must not fall back to the unrelated offer preview on the payment tab`);
  assert.match(response.reply, /Hakediş önizleme|önizleme/iu, `${message} must answer from the visible payment preview`);
  assert.match(response.reply, /ödeme başlatılmaz/iu, `${message} must preserve the read-only payment-preview boundary`);
  assert.notEqual(response.questionType, "FINANCIAL_SURFACE_LIMITATION", `${message} must not collapse a visible payment tab into generic surface limitation`);
  assert.equal(response.safety?.writeAction, false, `${message} must remain read-only on the payment tab`);
}
const selectedAgreementScreen = {
  path: "/room/agreements",
  label: "Sözleşmeler",
  role: "ROOM",
  selectedRecordType: "agreement",
  selectedRecordId: 184,
  structuredFacts: {
    selectedRecordType: "agreement",
    selectedRecordId: 184,
    summary: "Hakediş ve fatura mutabakat önizlemesi Beklenen hakediş: Veri yok Fatura tutarı: Veri yok Fark: Veri yok Sadece önizleme ödeme başlatılmaz",
  },
  uiHints: {
    visibleText: "Hakediş ve fatura mutabakat önizlemesi Beklenen hakediş: Veri yok Fatura tutarı: Veri yok Fark: Veri yok Sadece önizleme ödeme başlatılmaz",
  },
};
for (const message of [
  "Bu hakediş neden hazır değil?",
  "Ödeme hesabı eksik mi?",
  "Ödeme hazırlığı hangi aşamada?",
]) {
  const response = await buildSeferAbiCostAnalysisResponse({
    baseResponse: {
      semanticPlan: {
        canonicalRequest: {
          version: "SEFER-ABI-CANONICAL-REQUEST-V3",
          domain: "FINANCE",
          operation: "ASSESS_CURRENT_RISK",
          typedEvidence: { object: { value: "FINANCIAL" } },
        },
        requestedDomains: ["FINANCE", "AGREEMENTS"],
      },
      screenPath: selectedAgreementScreen.path,
    },
    user,
    message,
    screenContext: selectedAgreementScreen,
  });
  assert.match(response.reply, /Sözleşme #184/iu, `${message} must preserve the selected agreement identity`);
  assert.match(response.reply, /hakediş|fatura|mutabakat/iu, `${message} must answer from the visible financial preview`);
  assert.doesNotMatch(response.reply, /doğrulanabilir bir liste\/hedef yok/iu, `${message} must not deny the existing agreement preview target`);
  assert.equal(response.safety?.writeAction, false, `${message} must remain read-only`);
}
const commercialAgreementScreen = {
  ...selectedAgreementScreen,
  path: "/room/commercial-flow",
  label: "Ticari Çalışma Alanı",
};
for (const message of [
  "Bu hakediş neden hazır değil?",
  "Ödeme hesabı eksik mi?",
  "Ödeme hazırlığı hangi aşamada?",
  "Bu sözleşmenin ödeme hazırlığı neden tamamlanmadı?",
]) {
  const response = await buildSeferAbiCostAnalysisResponse({
    baseResponse: {
      semanticPlan: {
        canonicalRequest: {
          version: "SEFER-ABI-CANONICAL-REQUEST-V3",
          domain: "FINANCE",
          operation: "ASSESS_CURRENT_RISK",
          typedEvidence: { object: { value: "FINANCIAL" } },
        },
        requestedDomains: ["FINANCE", "AGREEMENTS"],
      },
      screenPath: commercialAgreementScreen.path,
    },
    user,
    message,
    screenContext: commercialAgreementScreen,
  });
  assert.match(response.reply, /Sözleşme #184/iu, `${message} must preserve the selected agreement on commercial flow`);
  assert.match(response.reply, /beklenen hakediş|fatura tutarı|fark/iu, `${message} must answer from the commercial-flow financial preview`);
  assert.doesNotMatch(response.reply, /Teklif ve Kârlılık/iu, `${message} must not fall back to the unrelated offer preview`);
  assert.equal(response.safety?.writeAction, false, `${message} must remain read-only on commercial flow`);
}
const selectedAgreementNextAction = buildRoomSelectedAgreementNextActionResponse({
  user: { ...user, companyKind: "DEMO" },
  entityType: "screen",
  entityId: 1106,
  screenContext: {
    path: "/room/agreements",
    label: "Sözleşmeler",
    role: "ROOM",
    selectedEntityType: "agreement",
    selectedEntityId: 184,
    uiHints: {
      visibleButtons: [{
        label: "Detayı aç",
        targetKey: "room:agreements:agreement:184:operation-bridge",
        semanticId: "product:room:agreement:184:operation-bridge",
        identitySource: "CANONICAL",
      }],
    },
  },
  semanticPlan: { family: "UI_GUIDANCE", typedRequest: { taskType: "NEXT_ACTION" } },
});
assert.match(selectedAgreementNextAction?.reply || "", /Sözleşme #184/iu, "selected agreement next action keeps the selected identity");
assert.match(selectedAgreementNextAction?.reply || "", /Detayı aç/iu, "selected agreement next action names the visible target");
assert.equal(selectedAgreementNextAction?.guidedTarget?.targetKey, "room:agreements:agreement:184:operation-bridge", "selected agreement next action carries the bound target");
assert.equal(selectedAgreementNextAction?.safety?.writeAction, false, "selected agreement next action remains read-only");
assert.equal(buildRoomSelectedAgreementNextActionResponse({
  user: { ...user, role: "COMPANY" },
  entityType: "screen",
  entityId: 1106,
  screenContext: { path: "/room/agreements", selectedEntityType: "agreement", selectedEntityId: 184 },
  semanticPlan: { family: "UI_GUIDANCE", typedRequest: { taskType: "NEXT_ACTION" } },
}), null, "wrong role cannot use ROOM selected agreement next action");
assert.equal(buildRoomSelectedAgreementNextActionResponse({
  user,
  entityType: "screen",
  entityId: 1106,
  screenContext: { path: "/room/agreements", selectedEntityType: "", selectedEntityId: null },
  semanticPlan: { family: "UI_GUIDANCE", typedRequest: { taskType: "NEXT_ACTION" } },
}), null, "missing selected agreement fails closed for next action");
console.log("PASS m18 WP06 residual financial semantic contract");
