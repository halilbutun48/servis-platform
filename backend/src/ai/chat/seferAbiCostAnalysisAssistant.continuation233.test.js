import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSelectedAgreementReconciliationResponse,
  buildUnselectedFinanceReconciliationResponse,
  isCompanySelectedInvoiceFinanceQuestion,
  isRoomSelectedInvoiceAmountQuestion,
  isFinanceReconciliationQuestion,
  isUnselectedFinanceReconciliationQuestion,
} from "./seferAbiCostAnalysisAssistant.js";

const roomUser = { id: 17, role: "ROOM", roomId: 1 };
const roomFinanceScreen = {
  path: "/room/financial-operations",
  selectedEntityType: "screen",
  selectedEntityId: null,
  structuredFacts: {},
};

test("COMPANY selected invoice finance question enters the read-only invoice response path", () => {
  assert.equal(isCompanySelectedInvoiceFinanceQuestion({
    user: { role: "COMPANY", companyId: 7 },
    screenContext: {
      path: "/company/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 14,
      structuredFacts: { selectedInvoiceId: 6, selectedAgreementId: 14 },
    },
    message: "Fatura #6 için kalan borç nedir?",
  }), true);
  assert.equal(isCompanySelectedInvoiceFinanceQuestion({
    user: roomUser,
    screenContext: {
      path: "/company/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 14,
      structuredFacts: { selectedInvoiceId: 6, selectedAgreementId: 14 },
    },
    message: "Fatura #6 için kalan borç nedir?",
  }), false);
});

test("COMPANY selected invoice follow-up is recognized as an invoice finance question", () => {
  assert.equal(isCompanySelectedInvoiceFinanceQuestion({
    user: { role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 14,
      structuredFacts: { selectedAgreementId: 14, selectedInvoiceId: 6 },
    },
    message: "Peki bu faturada ne kadar tahsil edildi?",
  }), true);
});

test("ROOM financial surface recognizes an unselected receivable question", () => {
  assert.equal(isUnselectedFinanceReconciliationQuestion({
    user: roomUser,
    screenContext: roomFinanceScreen,
    message: "Bu ay ne kadar alacağım kaldı?",
  }), true);
});

test("selected ROOM finance questions with collection and receivable terms use reconciliation", () => {
  assert.equal(isFinanceReconciliationQuestion("Bu finans ekranında tahsilat ve kalan alacak özeti nedir?"), true);
  assert.equal(isFinanceReconciliationQuestion("Bağlı fatura ve kalan alacak kayıtlarını nereden görebilirim?"), true);
});

test("ROOM selected invoice amount follow-up stays on the authorized invoice context", () => {
  assert.equal(isRoomSelectedInvoiceAmountQuestion({
    user: roomUser,
    screenContext: {
      path: "/room/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 9,
      structuredFacts: { selectedAgreementId: 9, selectedInvoiceId: 4, selectedHakedisId: 4 },
    },
    message: "Bu ne kadar?",
  }), true);
  assert.equal(isRoomSelectedInvoiceAmountQuestion({
    user: roomUser,
    screenContext: {
      path: "/room/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 9,
      structuredFacts: { selectedAgreementId: 9, selectedInvoiceId: 4, selectedHakedisId: 4 },
    },
    message: "Bu işlem bankadan doğrulanıyor mu?",
  }), true);
  assert.equal(isRoomSelectedInvoiceAmountQuestion({
    user: roomUser,
    screenContext: {
      path: "/room/financial-operations",
      selectedEntityType: "agreement",
      selectedEntityId: 9,
      structuredFacts: { selectedAgreementId: 9, selectedInvoiceId: 4 },
    },
    message: "Bugün ne yapmalıyım?",
  }), false);
});

test("selected controlled DEMO finance evidence explains visible invoice and collection amounts without presenting field proof", () => {
  const response = buildSelectedAgreementReconciliationResponse({
    baseResponse: {},
    screenPath: "/room/financial-operations",
    screenContext: { selectedEntityType: "agreement", selectedEntityId: 9 },
    reconciliationPreview: {
      data: {
        agreement: { id: 9 },
        status: "REVIEW_REQUIRED",
        expectedAmount: { amountMinor: 1000000, currencyCode: "TRY" },
        invoice: { amountMinor: 1000000, currencyCode: "TRY", source: "DEMO_FIXTURE" },
        reasons: [{ label: "Kontrollü DEMO kaydı" }],
        missingData: [{ code: "NON_AUTHORITATIVE_DATA" }],
      },
    },
    collectionSummary: {
      status: "AVAILABLE",
      collectedAmountMinor: 500000,
      receivableAmountMinor: 500000,
      currencyCode: "TRY",
    },
  });

  assert.match(response.reply, /Kontrollü DEMO/iu);
  assert.match(response.reply, /fatura 10\.000,00 ₺/iu);
  assert.match(response.reply, /Tahsil edilen 5\.000,00 ₺, kalan alacak 5\.000,00 ₺/iu);
  assert.match(response.reply, /gerçek saha\/banka kanıtı değildir/iu);
  assert.equal(response.readOnly, true);
});

test("canonical TEST_SIMULATED finance evidence is labeled as controlled DEMO", () => {
  const response = buildSelectedAgreementReconciliationResponse({
    baseResponse: {},
    screenPath: "/room/financial-operations",
    screenContext: { selectedEntityType: "agreement", selectedEntityId: 9 },
    reconciliationPreview: {
      data: {
        agreement: { id: 9 },
        status: "REVIEW_REQUIRED",
        invoice: { amountMinor: null, currencyCode: "TRY", source: "TEST_SIMULATED" },
        reasons: [{ label: "Kontrollü DEMO kaydı" }],
      },
    },
    collectionSummary: {
      status: "AVAILABLE",
      invoiceAmountMinor: 1000000,
      collectedAmountMinor: 500000,
      receivableAmountMinor: 500000,
      currencyCode: "TRY",
    },
  });

  assert.match(response.reply, /Kontrollü DEMO/iu);
  assert.match(response.reply, /fatura 10\.000,00 ₺/iu);
  assert.match(response.reply, /Tahsil edilen 5\.000,00 ₺, kalan alacak 5\.000,00 ₺/iu);
  assert.match(response.reply, /gerçek saha\/banka kanıtı değildir/iu);
});

test("ROOM financial surface does not replace selected agreement finance evidence", () => {
  assert.equal(isUnselectedFinanceReconciliationQuestion({
    user: roomUser,
    screenContext: {
      ...roomFinanceScreen,
      selectedEntityType: "agreement",
      selectedEntityId: 11,
      structuredFacts: { selectedAgreementId: 11 },
    },
    message: "Bu ay ne kadar alacağım kaldı?",
  }), false);
});

test("unselected ROOM receivable response is truthful and read-only", () => {
  const response = buildUnselectedFinanceReconciliationResponse({
    baseResponse: { ok: true, semanticPlan: { authorizationDecision: { status: "ALLOW" } } },
    user: roomUser,
    screenPath: "/room/financial-operations",
    message: "Bu ay ne kadar alacağım kaldı?",
  });

  assert.match(response.reply, /doğrulanmış kalan alacak bilgisi görünmüyor/u);
  assert.match(response.reply, /tutar[\s\S]*uydurmuyorum/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
  assert.equal(response.safety?.noLiveMutation, true);
  assert.equal(response.quickActions?.[0]?.path, "/room/commercial-flow");
  assert.equal(response.quickActions?.[0]?.routeParams?.tab, "settlement");
});

test("COMPANY debt question stays on the buyer finance boundary", () => {
  assert.equal(isUnselectedFinanceReconciliationQuestion({
    user: { id: 2, role: "COMPANY", companyId: 1, companyKind: "COMPANY" },
    screenContext: { path: "/company/financial-operations", structuredFacts: {} },
    message: "Bu ay ne kadar borcum var?",
  }), true);

  const response = buildUnselectedFinanceReconciliationResponse({
    baseResponse: {},
    user: { role: "COMPANY", companyKind: "COMPANY" },
    screenPath: "/company/financial-operations",
    message: "Bu ay ne kadar borcum var?",
  });
  assert.match(response.reply, /Bütçe ve Servis Maliyeti/u);
  assert.match(response.reply, /kalan borç/u);
  assert.doesNotMatch(response.reply, /Taşımacılık Firması/u);
  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, false);
});
