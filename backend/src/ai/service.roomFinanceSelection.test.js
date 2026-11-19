import test from "node:test";
import assert from "node:assert/strict";
import {
  isRoomFinancialScreenSummaryIntent,
  isRoomCostScenarioSurfaceQuestion,
  isCompanyBudgetDraftEvidenceFollowUp,
} from "./service.js";

const summaryPlan = {
  canonicalRequest: {
    operation: "ASSESS_CURRENT_RISK",
    domain: "FINANCE",
    candidateEntityRefs: [],
  },
};

test("ROOM finans ekranı özeti seçili kayıt bağlamını tüketmez", () => {
  assert.equal(isRoomFinancialScreenSummaryIntent({
    semanticPlan: summaryPlan,
    screenContext: {
      path: "/room/agreements",
      selectedEntityType: "agreement",
      selectedEntityId: 195,
    },
    message: "Sözleşme #195 için hakediş ve fatura mutabakatı ne durumda?",
  }), false);
});

test("ROOM finans ekranı özeti seçili kayıt yokken çalışır", () => {
  assert.equal(isRoomFinancialScreenSummaryIntent({
    semanticPlan: summaryPlan,
    screenContext: { path: "/room/financial-operations" },
    message: "Hakediş ve fatura riskleri neler?",
  }), true);
});

test("ROOM maliyet senaryosu sorusu görünür önizleme bağlamına bağlanır", () => {
  assert.equal(isRoomCostScenarioSurfaceQuestion({
    user: { role: "ROOM" },
    screenContext: { path: "/room/cost-scenarios" },
    message: "Bu senaryo gerçekleşmiş ödeme veya kesin kâr mı?",
  }), true);
});

test("ROOM maliyet senaryosu semantiği başka rol veya yüzeye taşmaz", () => {
  assert.equal(isRoomCostScenarioSurfaceQuestion({
    user: { role: "COMPANY" },
    screenContext: { path: "/room/cost-scenarios" },
    message: "Bu maliyet senaryosu nedir?",
  }), false);
  assert.equal(isRoomCostScenarioSurfaceQuestion({
    user: { role: "ROOM" },
    screenContext: { path: "/room/financial-operations" },
    message: "Bu maliyet senaryosu nedir?",
  }), false);
});

test("COMPANY draft budget evidence follow-up stays on the selected financial context", () => {
  assert.equal(isCompanyBudgetDraftEvidenceFollowUp({
    user: { role: "COMPANY" },
    screenContext: {
      path: "/company/financial-operations",
      structuredFacts: { selectedBudgetPlanId: 1, budgetStatus: "DRAFT" },
    },
    message: "Peki gerçekleşen harcama var mı?",
  }), true);
  assert.equal(isCompanyBudgetDraftEvidenceFollowUp({
    user: { role: "ROOM" },
    screenContext: {
      path: "/company/financial-operations",
      structuredFacts: { selectedBudgetPlanId: 1, budgetStatus: "DRAFT" },
    },
    message: "Peki gerçekleşen harcama var mı?",
  }), false);
});
