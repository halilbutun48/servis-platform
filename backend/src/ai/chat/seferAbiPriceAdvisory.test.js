import test from "node:test";
import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import {
  buildPlatformHistoricalReferenceClosedResponse,
  buildIndependentRouteQuoteDecision,
  buildIndependentRouteMissingCostQuestion,
  buildCommercialReferenceText,
  carryIndependentRouteScenarioContext,
  detectCostAnalysisIntent,
  extractScenarioOverrides,
  materializeIndependentRoutePeriodOverrides,
  buildCompanyPriceBudgetAdvisoryResponse,
  companyPriceBudgetQuestionKind,
  buildUnsupportedFinancialSurfaceResponse,
  resolveSelectedFinancialAgreementId,
  financialSurfaceNavigationAction,
  isPlatformHistoricalAgreementReferenceQuestion,
} from "./seferAbiCostAnalysisAssistant.js";
import { buildCostScenarioPreviewFromBaseline } from "../../routes/costScenario.js";
import { buildRoomFinancialDecisionExplanation } from "./financialScenarioContext.js";
import { resolveAuthorizedScreenContext } from "../jobGuide/screenCatalog.js";

const roomUser = { role: "ROOM", roomId: 20, companyKind: "COMPANY" };
const roomFinance = {
  path: "/room/financial-operations",
  label: "Teklif ve Kârlılık",
  role: "ROOM",
  surfaceRole: "ROOM",
  structuredFacts: {
    financeView: "quote-profitability",
    selectedAgreementId: 207,
    selectedShiftId: 355,
    periodStart: "2026-11-03",
    periodEnd: "2026-11-09",
    roomId: 20,
  },
};

function canonical(message, screenContext = roomFinance) {
  return resolveCanonicalConversationRequest({
    message,
    user: roomUser,
    screenContext,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
}

test("natural route price advice is a canonical read-only financial request", () => {
  const result = canonical("Sefer Abi, bu rota için kaç liradan teklif vereyim?");

  assert.equal(result.request.operation, "ASSESS_CURRENT_RISK");
  assert.equal(result.request.domain, "BUDGET");
  assert.equal(result.request.capability, "RISK");
  assert.equal(result.request.typedEvidence.specificity.independentRouteQuoteAdviceEvidence, true);
  assert.equal(result.request.typedEvidence.specificity.quoteFloorAnalysisEvidence, true);
  assert.equal(result.request.semanticAction.resolutionStatus, "RESOLVED");
  assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE");
});

test("route change price advice does not fall into generic product help", () => {
  const result = canonical("Eski rota değişti, artık 40 km. Yeni fiyat ne?");

  assert.notEqual(result.request.operation, "GENERAL_INFORMATION");
  assert.equal(result.request.operation, "ASSESS_CURRENT_RISK");
  assert.equal(result.request.domain, "BUDGET");
  assert.equal(result.request.typedEvidence.specificity.independentRouteQuoteAdviceEvidence, true);
  assert.equal(result.canonicalShape.generalProductHelpIntent, false);
});

test("price advice stays in the existing cost-analysis family", () => {
  const result = detectCostAnalysisIntent({
    message: "Sefer Abi, bu rota için kaç liradan teklif vereyim?",
    screenContext: roomFinance,
  });

  assert.equal(result.isCostAnalysis, true);
  assert.equal(result.family, "OFFER_PROFITABILITY");
  assert.equal(result.questionIntent, "OFFER_PROFITABILITY");
});

test("company price and budget questions stay in the same Sefer Abi intent with distinct question kinds", () => {
  const companyFinance = {
    path: "/company/financial-operations",
    role: "COMPANY",
    structuredFacts: { financeView: "company-budget", companyId: 1 },
  };
  const fit = detectCostAnalysisIntent({ message: "Bu teklif bütçeme uygun mu?", screenContext: companyFinance });
  const history = detectCostAnalysisIntent({ message: "Geçen yıl benzer servisi kaça almıştık?", screenContext: companyFinance });
  const evidence = detectCostAnalysisIntent({ message: "Bütçem, hakediş, fatura ve ödeme durumum nedir?", screenContext: companyFinance });

  assert.equal(fit.isCostAnalysis, true);
  assert.equal(history.isCostAnalysis, true);
  assert.equal(evidence.isCostAnalysis, true);
  assert.equal(companyPriceBudgetQuestionKind("Bu teklif bütçeme uygun mu?"), "OFFER_BUDGET_FIT");
  assert.equal(companyPriceBudgetQuestionKind("Bu teklif bütçemi aşıyor mu?"), "OFFER_BUDGET_FIT");
  assert.equal(companyPriceBudgetQuestionKind("Bu bütçe için sözleşme #207 taahhüdü bütçeyi aşıyor mu?"), "COMMITMENT_BUDGET_STATUS");
  assert.equal(companyPriceBudgetQuestionKind("Geçen yıl benzer servisi kaça almıştık?"), "HISTORY_PRICE");
  assert.equal(companyPriceBudgetQuestionKind("Bu sözleşmeyi kabul edersem bütçem ne olur?"), "ACCEPTANCE_BUDGET_EFFECT");
  assert.equal(companyPriceBudgetQuestionKind("Benzer anlaşmamız yoksa bu teklif hakkında ne söyleyebilirsin?"), "NO_HISTORY");
  assert.equal(companyPriceBudgetQuestionKind("Bu fiyat önceki anlaşmamıza göre yüksek mi?"), "OFFER_VS_HISTORY");
  assert.equal(companyPriceBudgetQuestionKind("Bütçem, hakediş, fatura ve ödeme durumum nedir?"), "FINANCIAL_EVIDENCE_STATUS");
  assert.equal(companyPriceBudgetQuestionKind("Peki kullanılabilir tutar nedir?"), "FINANCIAL_EVIDENCE_STATUS");
});

test("platform historical agreement reference questions use the cost owner", () => {
  const message = "SeferPakt genelinde benzer işler ortalama kaça anlaşılmış?";
  const canonicalResult = canonical(message);
  const result = detectCostAnalysisIntent({
    message,
    screenContext: roomFinance,
  });

  assert.equal(isPlatformHistoricalAgreementReferenceQuestion(message), true);
  assert.equal(canonicalResult.request.platformHistoricalReferenceIntent, true);
  assert.equal(canonicalResult.request.operation, "ASSESS_CURRENT_RISK");
  assert.equal(canonicalResult.request.domain, "BUDGET");
  assert.equal(result.isCostAnalysis, true);
  assert.equal(result.family, "BUDGET_COST");
});

test("platform historical reference remains fail-closed without policy or sample proof", () => {
  const response = buildPlatformHistoricalReferenceClosedResponse({
    baseResponse: { entityType: "screen", entityId: 0 },
    user: roomUser,
    screenContext: roomFinance,
  });

  assert.equal(response.platformReference.status, "NOT_PROVEN");
  assert.equal(response.platformReference.liveAverageEnabled, false);
  assert.equal(response.platformReference.rawTenantDataExposed, false);
  assert.match(response.reply, /kapalı|göstermiyorum/iu);
  assert.doesNotMatch(response.reply, /\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s*(?:TL|₺)/iu);
  assert.equal(response.writeAction, false);
  assert.equal(response.readOnly, true);
});

test("selected ROOM finance fallback remains read-only when reconciliation evidence is unavailable", () => {
  const response = buildUnsupportedFinancialSurfaceResponse({
    baseResponse: { entityType: "screen", entityId: 0 },
    user: { role: "ROOM", roomId: 21 },
    screenPath: "/room/financial-operations",
    message: "Sözleşmenin hakediş ve fatura durumu nedir?",
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: { financeView: "quote-profitability", selectedAgreementId: 209 },
    },
  });

  assert.equal(response.readOnly, true);
  assert.equal(response.writeAction, undefined);
  assert.match(response.reply, /doğrulanabilir.*hedef|finans.*yüzey/iu);
  assert.equal(response.safety?.noLiveMutation, true);
});

test("explicit ROOM reconciliation questions recover the authorized agreement from finance facts when a shift is selected", () => {
  const agreementId = resolveSelectedFinancialAgreementId({
    baseResponse: { semanticPlan: { canonicalRequest: { candidateEntityRefs: [] } } },
    message: "Sözleşme #209 için hakediş, fatura, tahsilat ve kalan alacak tutarları nedir?",
    screenContext: {
      path: "/room/financial-operations",
      selectedEntityType: "shift",
      selectedEntityId: 371,
      structuredFacts: {
        selectedEntityType: "shift",
        selectedAgreementId: 209,
        selectedShiftId: 371,
      },
    },
  });

  assert.equal(agreementId, 209);
});

test("selected agreement finance answer keeps hakedis, invoice, collection and receivable as separate amounts", () => {
  const response = buildUnsupportedFinancialSurfaceResponse({
    baseResponse: { entityType: "screen", entityId: 0 },
    user: { role: "ROOM", roomId: 21 },
    screenPath: "/room/financial-operations",
    message: "Sözleşme #209 için hakediş, fatura, tahsilat ve kalan alacak tutarları nedir?",
    screenContext: { selectedEntityType: "agreement", selectedEntityId: 209 },
    reconciliationPreview: {
      data: {
        agreement: { id: 209 },
        status: "PARTIAL_OPERATION_EVIDENCE",
        expectedAmount: { amountMinor: 10_000_000, currencyCode: "TRY" },
        invoice: { amountMinor: 10_000_000, currencyCode: "TRY" },
        evidence: { operations: { completedCount: 1, eligibleCount: 5 } },
      },
    },
    collectionSummary: {
      status: "AVAILABLE",
      collectedAmountMinor: 4_000_000,
      receivableAmountMinor: 6_000_000,
      currencyCode: "TRY",
    },
  });

  assert.match(response.reply, /hakediş.*100\.000,00.*fatura.*100\.000,00/iu);
  assert.match(response.reply, /tahsil edilen.*40\.000,00.*kalan alacak.*60\.000,00/iu);
  assert.match(response.reply, /1\/5|1.*5.*tamam/iu);
  assert.equal(response.writeAction, false);
});

test("platform historical reference shows only an explicit controlled DEMO aggregate", () => {
  const response = buildPlatformHistoricalReferenceClosedResponse({
    baseResponse: { entityType: "screen", entityId: 0 },
    user: roomUser,
    screenContext: roomFinance,
    platformReference: {
      available: true,
      state: "AVAILABLE",
      valueMinor: 11_250_000,
      averageAmountMinor: 11_250_000,
      range: { minMinor: 10_000_000, maxMinor: 12_500_000 },
      sampleCount: 6,
      distinctRoomCount: 6,
      controlledDemoOnly: true,
      currencyCode: "TRY",
    },
  });

  assert.equal(response.platformReference.status, "READY");
  assert.equal(response.platformReference.demoAverageEnabled, true);
  assert.equal(response.platformReference.liveAverageEnabled, false);
  assert.match(response.reply, /DEMO/iu);
  assert.match(response.reply, /112\.500/iu);
  assert.match(response.reply, /100\.000.*125\.000/iu);
  assert.equal(response.writeAction, false);
  assert.equal(response.readOnly, true);
});

test("Sefer Abi separates accepted commercial price, negotiation evidence and operational cost", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu anlaşma fiyatı ve maliyet için ne görüyorsun?",
    commercialEvidence: {
      selected: {
        commercialReference: { status: "READY", amountMinor: 1_500_000, currencyCode: "TRY" },
        negotiationEvidence: { status: "PARTIAL" },
        operationalEvidence: { actualCostEvidence: "NOT_PROVEN" },
      },
      comparableHistory: null,
    },
  });

  assert.match(text, /kabul edilmiş sözleşme fiyatı.*₺15\.000,00/iu);
  assert.match(text, /pazarlık adımlarının tamamı kaydedilmedi/iu);
  assert.match(text, /gerçekleşmiş gider veya kesin net kâr değildir/iu);
});

test("Sefer Abi current canonical cost and recommended offer stay separate from history", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu anlaşma fiyatı, güncel maliyet ve yeni teklif ne olmalı?",
    currentCanonicalCostMinor: 1_789_322,
    recommendedOfferMinor: 2_348_487,
    commercialEvidence: {
      selected: {
        commercialReference: { status: "READY", amountMinor: 1_500_000, currencyCode: "TRY" },
        negotiationEvidence: { status: "PARTIAL" },
        operationalEvidence: { actualCostEvidence: "NOT_PROVEN" },
      },
      comparableHistory: null,
    },
  });

  assert.match(text, /güncel kanonik maliyet.*₺17\.893,22/iu);
  // The canonical response deliberately labels this as a partial planning
  // preview, not as a definitive recommended offer.
  assert.match(text, /kısmi planlama teklif önizlemesi.*₺23\.484,87/iu);
  assert.match(text, /tam ekonomik kanıt oluşmadı.*kesin teklif tabanı değildir/iu);
  assert.match(text, /kabul edilmiş sözleşme fiyatı.*₺15\.000,00/iu);
});

test("Sefer Abi explains the selected contractless scenario and recorded offer in the same currency", () => {
  const text = buildCommercialReferenceText({
    scope: "ROOM",
    message: "Bu teklif ile planlama maliyeti arasındaki farkı açıklar mısın?",
    currentCanonicalCostMinor: 2_333_803,
    currentCanonicalCostLabel: "Seçili senaryo planlama maliyeti",
    currentOfferMinor: 3_500_000,
    selectedScenarioId: "scn_demo_413",
    selectedScenarioPeriodPlanning: {
      periodStart: "2026-11-17",
      periodEnd: "2026-11-21",
    },
  });

  assert.match(text, /seçili senaryo planlama maliyeti.*₺23\.338,03/iu);
  assert.match(text, /seçili taşımacı teklifi.*₺35\.000,00/iu);
  assert.match(text, /teklif ile planlama maliyeti arasındaki fark.*₺11\.661,97/iu);
  assert.match(text, /kabul edilmiş sözleşme veya gerçekleşmiş net kâr değildir/iu);
  assert.doesNotMatch(text, /2333803|3500000/u);
});

test("Sefer Abi does not expose ROOM commercial reference text on COMPANY scope", () => {
  const text = buildCommercialReferenceText({
    scope: "COMPANY",
    message: "Bu teklif fiyatı ne?",
    commercialEvidence: { selected: { commercialReference: { status: "READY", amountMinor: 1_500_000 } } },
  });

  assert.equal(text, "");
});

test("financial navigation keeps COMPANY on its authorized surface", () => {
  const companyAction = financialSurfaceNavigationAction({
    role: "COMPANY",
    message: "Finansal ayrıntıyı aç",
    screenPath: "/company/agreements",
  });
  const roomAction = financialSurfaceNavigationAction({
    role: "ROOM",
    message: "Finansal ayrıntıyı aç",
    screenPath: "/room/agreements",
  });

  assert.equal(companyAction?.path, "/company/financial-operations");
  assert.equal(roomAction?.path, "/room/financial-operations");
  assert.notEqual(companyAction?.path, "/room/financial-operations");
  assert.equal(companyAction?.writeAction, false);
});

test("COMPANY finance guidance stays within budget and service-cost vocabulary", () => {
  const companyScreen = resolveAuthorizedScreenContext(
    { role: "COMPANY", companyKind: "COMPANY", companyId: 1 },
    { path: "/company/financial-operations" },
  );
  const roomScreen = resolveAuthorizedScreenContext(
    { role: "ROOM", companyKind: "COMPANY", roomId: 20 },
    { path: "/room/financial-operations" },
  );

  assert.equal(companyScreen?.status, "FOUND");
  assert.equal(roomScreen?.status, "FOUND");
  assert.deepEqual(companyScreen.screen.stepByStep, [
    "Bütçe veya servis maliyeti kartını seç.",
    "Bütçe ve servis maliyeti önizlemesini oku.",
    "Gerekirse aynı şirketin vardiya, sözleşme veya operasyon ekranına geç.",
  ]);
  assert.doesNotMatch(companyScreen.screen.stepByStep.join(" "), /kârlılık|quote floor|teklif alt sınırı/iu);
  assert.match(roomScreen.screen.stepByStep.join(" "), /quote floor|teklif|maliyet/iu);
});

test("company advisory response explains budget impact without turning an offer into spend", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "OFFER_BUDGET_FIT",
    advisory: {
      budgetEffect: {
        budgetAmountMinor: 300000,
        committedAmountMinor: 1500000,
        remainingBudgetMinor: -1200000,
        currencyCode: "TRY",
        budgetStatus: "DRAFT",
        status: "OVER_BUDGET",
      },
      offerEffect: {
        status: "NOT_PROVEN",
        amountMinor: 15000,
        currencyCode: "TRY",
        possibleRemainingBudgetMinor: null,
        isActualSpend: false,
        reason: "Teklifin kapsamı tam doğrulanmadı.",
      },
      historyComparison: { status: "NOT_PROVEN", reason: "Karşılaştırılabilir geçmiş kayıt yok." },
    },
  });

  assert.match(response.resultText, /3\.000,00\s*TL/iu);
  assert.match(response.resultText, /15\.000,00\s*TL/iu);
  assert.match(response.resultText, /12\.000,00\s*TL/iu);
  assert.match(response.resultText, /olası|kesin taahhüt|gerçekleşmiş harcama değildir/iu);
  assert.match(response.resultText, /taslak/iu);
  assert.match(response.resultText, /salt okunur|kayıt.*değiştirilmedi/iu);
  assert.equal(response.writeAction, false);
  assert.equal(response.noRoomInternalCost, true);
});

test("company advisory response explains a selected commitment overrun without inventing spend", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "COMMITMENT_BUDGET_STATUS",
    advisory: {
      budgetEffect: {
        budgetAmountMinor: 300000,
        committedAmountMinor: 1500000,
        remainingBudgetMinor: -1200000,
        currencyCode: "TRY",
        budgetStatus: "DRAFT",
        status: "OVER_BUDGET",
      },
      offerEffect: { status: "NOT_PROVEN", amountMinor: null, currencyCode: "TRY", isActualSpend: false },
      historyComparison: { status: "NOT_PROVEN", reason: "Karşılaştırılabilir geçmiş kayıt yok." },
    },
  });

  assert.match(response.resultText, /taahh(?:üt|üdü).*15\.000,00\s*TL/iu);
  assert.match(response.resultText, /12\.000,00\s*TL.*a[çc]ık|a[çc]ık.*12\.000,00\s*TL/iu);
  assert.match(response.resultText, /gerçekleşmiş zarar|ödeme|harcama değildir/iu);
  assert.equal(response.writeAction, false);
  assert.equal(response.noRoomInternalCost, true);
});

test("company advisory response refuses incomparable purchase history", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "HISTORY_PRICE",
    advisory: {
      budgetEffect: { budgetAmountMinor: 15000000, committedAmountMinor: 15000000, remainingBudgetMinor: 0, currencyCode: "TRY", budgetStatus: "DRAFT", status: "WITHIN_BUDGET" },
      offerEffect: { status: "CONFIRMED_AGREEMENT", amountMinor: null, currencyCode: null, isActualSpend: false },
      historyComparison: { status: "NOT_PROVEN", reason: "Aynı hizmet kapsamını doğrulayan karşılaştırılabilir kayıt bulunamadı." },
    },
  });

  assert.match(response.resultText, /karşılaştırılabilir.*kayıt|fiyat karşılaştırması yapılmadı/iu);
  assert.doesNotMatch(response.resultText, /piyasa ortalaması/iu);
  assert.equal(response.writeAction, false);
});

test("company advisory response carries separate canonical financial evidence", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "OFFER_BUDGET_FIT",
    advisory: {
      budgetEffect: {
        budgetAmountMinor: 20000000,
        committedAmountMinor: 15000000,
        remainingBudgetMinor: 5000000,
        currencyCode: "TRY",
        budgetStatus: "DRAFT",
      },
      offerEffect: { status: "READY", amountMinor: 12500000, currencyCode: "TRY", possibleRemainingBudgetMinor: 7500000 },
      historyComparison: { status: "READY", comparableCount: 6 },
    },
    commitmentSummary: {
      financialEvidence: [{ status: "MATCHED" }],
      evidenceTotals: {
        hakedisAmountMinor: 14000000,
        invoiceAmountMinor: 14000000,
        paidAmountMinor: 8000000,
      },
      serviceEvidence: { eligibleCount: 1, completedCount: 1 },
    },
  });

  assert.match(response.resultText, /hakediş 140\.000(?:,00)?\s*TL/iu);
  assert.match(response.resultText, /fatura 140\.000(?:,00)?\s*TL/iu);
  assert.match(response.resultText, /ödenen 80\.000(?:,00)?\s*TL/iu);
  assert.match(response.resultText, /ikinci kez eklenmez/iu);
});

test("COMPANY financial evidence question does not invent a selected offer", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "FINANCIAL_EVIDENCE_STATUS",
    advisory: {
      budgetEffect: { budgetAmountMinor: 20000000, committedAmountMinor: 15000000, remainingBudgetMinor: 5000000, currencyCode: "TRY", budgetStatus: "DRAFT" },
      offerEffect: { status: "NOT_PROVEN", reason: "Seçili teklif bulunamadı." },
      historyComparison: { status: "READY", comparableCount: 1 },
    },
    commitmentSummary: {
      financialEvidence: [{ status: "MATCHED" }],
      evidenceTotals: { hakedisAmountMinor: 14000000, invoiceAmountMinor: 14000000, paidAmountMinor: 8000000 },
    },
  });

  assert.match(response.resultText, /hakediş 140\.000(?:,00)?\s*TL/iu);
  assert.doesNotMatch(response.resultText, /Seçili teklif tutarı doğrulanamadı/iu);
});

test("school financial questions use the same historical evidence wording as the buyer surface", () => {
  assert.equal(
    companyPriceBudgetQuestionKind("Bu okulun bütçesi ve öğrenci taşıma hizmeti maliyeti nedir?"),
    "FINANCIAL_EVIDENCE_STATUS",
  );
});

test("company advisory response explains a matched historical period when no budget plan is selected", () => {
  const response = buildCompanyPriceBudgetAdvisoryResponse({
    kind: "FINANCIAL_EVIDENCE_STATUS",
    advisory: {
      budgetEffect: { budgetAmountMinor: null, committedAmountMinor: null, remainingBudgetMinor: null, currencyCode: "TRY" },
      offerEffect: { status: "NOT_PROVEN", reason: "Seçili teklif bulunamadı." },
      historyComparison: { status: "NOT_PROVEN", reason: "Karşılaştırılabilir geçmiş satın alma kaydı bulunamadı." },
    },
    historicalFinancialEvidence: [{
      agreementId: 198,
      period: { start: "2026-09-01", end: "2026-09-30" },
      serviceEvidence: { eligibleCount: 1, completedCount: 1 },
      hakedis: { amountMinor: 10000000 },
      invoice: { amountMinor: 10000000 },
      payment: { amountMinor: 5000000 },
    }],
  });

  assert.match(response.resultText, /tamamlanmış.*01\.09\.2026.*30\.09\.2026/iu);
  assert.match(response.resultText, /hakediş 100\.000,00\s*TL.*fatura 100\.000,00\s*TL.*ödenen 50\.000,00\s*TL/iu);
  assert.match(response.resultText, /ikinci kez eklenmez/iu);
  assert.equal(response.writeAction, false);
});

test("independent route advice uses the canonical scenario cost only when the full scenario is ready", () => {
  const ready = buildIndependentRouteQuoteDecision({
    scenarioPreview: {
      status: "READY",
      scenario: { costMinor: 500000 },
      costCoverage: { scenario: { status: "COMPLETE" } },
    },
    quoteFloor: { targetContributionBps: 2000, riskReserveBps: 500 },
  });
  assert.equal(ready.status, "READY_FOR_REVIEW");
  assert.equal(ready.baselineOperationalCostMinor, 500000);
  assert.equal(ready.quoteFloorMinor, 656250);

  const incomplete = buildIndependentRouteQuoteDecision({
    scenarioPreview: {
      status: "READY",
      scenario: { costMinor: 500000 },
      costCoverage: { scenario: { status: "PARTIAL" } },
    },
    quoteFloor: { targetContributionBps: 2000, riskReserveBps: 500 },
  });
  assert.equal(incomplete.status, "NOT_PROVEN");
  assert.equal(incomplete.quoteFloorMinor, null);
});

test("independent route advice explains a current route without treating history as the source", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Sefer Abi, bu rota için kaç liradan teklif vereyim?",
    screenContext: {
      ...roomFinance,
      structuredFacts: { ...roomFinance.structuredFacts, routeDistanceKm: 40 },
    },
    decisionLayer: {
      newOfferDecision: {
        status: "READY_FOR_REVIEW",
        baselineOperationalCostMinor: 500000,
        riskAdjustedCostMinor: 525000,
        targetContributionBps: 2000,
        riskReserveBps: 500,
        quoteFloorMinor: 656250,
        baselineSource: "COST_SCENARIO_FORECAST",
      },
    },
    routeAdvice: {
      independent: true,
      scenarioStatus: "READY",
      scenarioCostCoverage: "COMPLETE",
      routeDistanceKm: 40,
      routeTotalDistanceKm: 968,
      emptyDistanceKm: 4,
      serviceDayCount: 22,
      passengerCount: 16,
      vehicleLabel: "Minibüs",
      shiftCount: 2,
      scenarioCostComponents: [
        { labelTr: "Yakıt", amountMinor: 740256 },
        { labelTr: "Sürücü işçilik maliyeti", amountMinor: 22000000 },
      ],
      confidenceText: "Orta güven",
      economicReliabilityText: "DEMO planlama varsayımı kullanıldı; bu sonuç doğrudan işletme teklifi olarak kullanılmamalı.",
    },
  });

  assert.equal(result.status, "READY_FOR_REVIEW");
  assert.match(result.resultText, /geçmiş anlaşma fiyatı kullanılmadı/iu);
  assert.match(result.resultText, /40 km/iu);
  assert.match(result.resultText, /6\.562,50\s*TL/iu);
  assert.match(result.resultText, /Ana kalemler:.*Yakıt/iu);
  assert.match(result.resultText, /22 hizmet günü/iu);
  assert.match(result.resultText, /Orta güven/iu);
  assert.match(result.resultText, /Ekonomik güvenilirlik: DEMO planlama varsayımı/iu);
  assert.equal(result.evidence.independentRouteQuoteAdvice, true);
  assert.equal(result.writeAction, false);
});

test("incomplete route advice surfaces the single missing cost question in the user-facing result", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Sefer Abi, bu rota için kaç liradan teklif vereyim?",
    screenContext: roomFinance,
    decisionLayer: { newOfferDecision: { status: "NOT_PROVEN" } },
    routeAdvice: {
      independent: true,
      scenarioStatus: "INCOMPLETE",
      scenarioCostCoverage: "PARTIAL",
      missingCostQuestion: "Bu araç için güncel sürücü işveren maliyetini bulamadım. Aylık toplam maliyeti belirtirsen teklif hesabını yalnız bu salt-okunur senaryoda güncelleyebilirim.",
    },
  });

  assert.equal(result.status, "NOT_PROVEN");
  assert.match(result.resultText, /güncel sürücü işveren maliyetini bulamadım/i);
  assert.doesNotMatch(result.resultText, /bakım maliyeti/i);
});

test("complete new-route wording maps absolute passenger, vehicle, distance and service cadence inputs", () => {
  const overrides = extractScenarioOverrides(
    "Geçmiş anlaşması olmayan yeni bir hizmet için günlük toplam 40 km hizmet mesafesi, ayrıca günlük 4 km boş kilometre, 90 dakika toplam sürüş, 16 kişilik minibüsle sabah akşam 22 gün servis yapacağım.",
    {
      passengerCount: 20,
      vehicleCount: 1,
      vehicleCapacity: 29,
      totalDistanceKm: 6.77,
      routeDurationMinutes: 11.65,
      serviceDayCount: 1,
      shiftCount: 1,
    },
  );

  assert.equal(overrides.passengerCount, 16);
  assert.equal(overrides.vehicleType, "MINIBUS");
  assert.equal(overrides.vehicleCapacity, 16);
  assert.equal(overrides.serviceDistanceKm, 40);
  assert.equal(overrides.emptyDistanceKm, 4);
  assert.equal(overrides.totalDistanceKm, 44);
  assert.equal(overrides.routeDurationMinutes, 90);
  assert.equal(overrides.shiftCount, 2);
  assert.equal(overrides.tripCount, 2);
  assert.equal(overrides.serviceDayCount, 22);
});

test("daily route inputs are expanded to the requested service period without losing daily display values", () => {
  const period = materializeIndependentRoutePeriodOverrides({
    serviceDistanceKm: 40,
    emptyDistanceKm: 4,
    totalDistanceKm: 44,
    routeDurationMinutes: 90,
    shiftCount: 2,
    tripCount: 2,
    serviceDayCount: 22,
    dailyServiceScope: "DAILY",
  });

  assert.equal(period.serviceDistanceKm, 880);
  assert.equal(period.emptyDistanceKm, 88);
  assert.equal(period.totalDistanceKm, 968);
  assert.equal(period.routeDurationMinutes, 1980);
  assert.equal(period.shiftCount, 44);
  assert.equal(period.tripCount, 44);
  assert.equal(period.shiftsPerServiceDay, 2);
  assert.equal(period.dailyServiceDistanceKm, 40);
  assert.equal(period.dailyTotalDistanceKm, 44);
});

test("an explicit monthly driver assumption is applied only to the read-only scenario", () => {
  const overrides = extractScenarioOverrides(
    "Bu rota için aylık toplam sürücü işveren maliyeti 220.000 TL olsun.",
    { serviceDayCount: 22, shiftCount: 44 },
  );
  const period = materializeIndependentRoutePeriodOverrides({
    ...overrides,
    serviceDayCount: 22,
    shiftCount: 44,
  });

  assert.equal(period.driverBasePerShiftMinor, 500000);
  assert.equal(period.driverMonthlyCostMinor, undefined);
});

test("a follow-up cost assumption keeps the previously selected independent route scenario", () => {
  const merged = carryIndependentRouteScenarioContext({
    currentOverrides: { driverBasePerShiftMinor: 600000 },
    conversationState: {
      costAnalysisState: {
        lastIndependentScenarioOverrides: {
          serviceDistanceKm: 40,
          totalDistanceKm: 968,
          emptyDistanceKm: 88,
          serviceDayCount: 22,
          shiftCount: 44,
          vehicleType: "MINIBUS",
        },
      },
    },
    isFollowUp: true,
  });

  assert.equal(merged.serviceDistanceKm, 40);
  assert.equal(merged.totalDistanceKm, 968);
  assert.equal(merged.driverBasePerShiftMinor, 600000);
});

test("history-free route advice uses canonical planning components without old actual ledger scope", async () => {
  const preview = await buildCostScenarioPreviewFromBaseline({
    user: roomUser,
    independentRouteQuoteAdvice: true,
    baseline: {
      scope: "ROOM",
      companyKind: "COMPANY",
      tenantScope: "room_test",
      baselineReference: "room_test_baseline",
      baselineDataClass: "INTERNAL_ACTUAL",
      baselineConfidence: { level: "MEDIUM", score: 70 },
      input: {
        currencyCode: "TRY",
        vehicleType: "MIDIBUS",
        vehicleCount: 1,
        vehicleCapacity: 29,
        passengerCount: 20,
        serviceDistanceKm: 6.77,
        totalDistanceKm: 6.77,
        routeDurationMinutes: 11.65,
        serviceDayCount: 1,
        shiftCount: 1,
        tripCount: 1,
        fuelUnitPriceMinor: 9680,
        fuelConsumptionLitersPer100Km: 21,
      },
      source: { type: "SHIFT", shiftId: 261 },
      vehicleCostInputsByType: {
        MINIBUS: {
          input: { vehicleType: "MINIBUS", vehicleCapacity: 16, fuelConsumptionLitersPer100Km: 7.9 },
          planningComponents: {
            vehicle_variable: {
              input: { maintenancePerKmMinor: 9500 },
              evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", source: "canonical-planning-reference" },
            },
            driver_labor: {
              input: { driverBasePerShiftMinor: 500000, driverCompensationMode: "per_shift" },
              evidence: { dataClass: "DEMO_PLANNING_ASSUMPTION", source: "canonical-planning-reference" },
            },
            route_fees: {
              input: { routeFeeMinor: 45000 },
              evidence: { source: "old-shift-actual" },
            },
          },
          source: "INTERNAL_DATA_PLANNING_ESTIMATE",
          sourceLabel: "Kanonik araç planlama varsayımı",
        },
      },
      routeShift: null,
      routeEvidence: null,
      scenarioActualCostInputs: [{ entryId: 345, amountMinor: 45000, recordKind: "ACTUAL" }],
      actualEvidence: { actualCostMinor: 45000, periodStart: null, periodEnd: null },
      planningEvidence: { actualInputs: [{ entryId: 345, amountMinor: 45000, recordKind: "ACTUAL" }] },
      plannedInput: {},
    },
    scenarioOverrides: {
      vehicleType: "MINIBUS",
      vehicleCount: 1,
      vehicleCapacity: 16,
      passengerCount: 16,
      serviceDistanceKm: 40,
      emptyDistanceKm: 4,
      totalDistanceKm: 44,
      routeDurationMinutes: 90,
      shiftCount: 2,
      tripCount: 2,
      serviceDayCount: 22,
    },
  });

  assert.equal(preview.status, "READY");
  // Contractless planning must not inherit the old actual HGS ledger entry.
  // The canonical safety gate therefore remains PARTIAL until fixed vehicle,
  // route-fee and AdBlue evidence is present.
  assert.equal(preview.costCoverage.scenario.status, "PARTIAL");
  assert.deepEqual(
    preview.costCoverage.scenario.missingOptionalCosts.map((item) => item.key).sort(),
    ["adblue", "route_fees", "vehicle_fixed"],
  );
  assert.equal(preview.periodScope.status, "COMPLETE");
  assert.equal(preview.dimensions.totalDistanceKm.scenario, 44);
  assert.equal(preview.dimensions.serviceDayCount.scenario, 22);
  assert.equal(preview.scenario.costBasis, "INTERNAL_DATA_PLANNING_ESTIMATE");
  assert.equal(preview.economicReliability.level, "DEMO_ASSUMPTION");
  assert.match(preview.economicReliability.userMessage, /DEMO|örnek|doğrudan.*teklif/i);
  assert.equal(preview.confidence.level, "MEDIUM");
  assert.match(preview.confidence.reason, /planlama maliyeti kısmi|planlama varsayımı|gerçekleşmiş maliyet değil/i);
  assert.notEqual(preview.scenario.costMinor, null);
  assert.equal(preview.scenario.componentBreakdown.some((item) => item.key === "route_fees" && item.includedInBaseline), false);
});

test("same scoped actual-derived planning components are marked as economically stronger than DEMO rates", async () => {
  const preview = await buildCostScenarioPreviewFromBaseline({
    user: roomUser,
    independentRouteQuoteAdvice: true,
    baseline: {
      scope: "ROOM",
      companyKind: "COMPANY",
      tenantScope: "room_test",
      baselineReference: "room_test_baseline",
      baselineDataClass: "INTERNAL_ACTUAL",
      input: {
        currencyCode: "TRY",
        vehicleType: "MINIBUS",
        vehicleCount: 1,
        vehicleCapacity: 16,
        passengerCount: 16,
        serviceDistanceKm: 40,
        totalDistanceKm: 44,
        routeDurationMinutes: 90,
        serviceDayCount: 22,
        shiftCount: 44,
        tripCount: 44,
        fuelUnitPriceMinor: 9680,
        fuelConsumptionLitersPer100Km: 7.9,
      },
      source: { type: "SHIFT", shiftId: 261 },
      vehicleCostInputsByType: {
        MINIBUS: {
          input: { vehicleType: "MINIBUS", vehicleCapacity: 16, fuelConsumptionLitersPer100Km: 7.9 },
          planningComponents: {
            vehicle_variable: {
              input: { maintenancePerKmMinor: 9500 },
              evidence: { dataClass: "INTERNAL_ACTUAL_DERIVED", actual: false, sourceEntryIds: [101], periods: ["2026-09-01|2026-09-30"] },
            },
            driver_labor: {
              input: { driverBasePerShiftMinor: 500000, driverCompensationMode: "per_shift" },
              evidence: { dataClass: "INTERNAL_ACTUAL_DERIVED", actual: false, sourceEntryIds: [102], periods: ["2026-09-01|2026-09-30"] },
            },
          },
          source: "ROOM_SCOPED_ACTUAL_DERIVED_PLANNING",
          sourceLabel: "Seçili araç ve dönem gerçek giderlerinden türetilen planlama oranı",
          evidence: { dataClass: "INTERNAL_ACTUAL_DERIVED" },
        },
      },
      routeShift: null,
      routeEvidence: null,
      scenarioActualCostInputs: [],
      actualEvidence: { actualCostMinor: null, periodStart: "2026-09-01", periodEnd: "2026-09-30" },
      planningEvidence: { actualInputs: [] },
      plannedInput: {},
    },
    scenarioOverrides: {
      vehicleType: "MINIBUS",
      vehicleCount: 1,
      vehicleCapacity: 16,
      passengerCount: 16,
      serviceDistanceKm: 40,
      emptyDistanceKm: 4,
      totalDistanceKm: 44,
      routeDurationMinutes: 90,
      shiftCount: 44,
      tripCount: 44,
      serviceDayCount: 22,
    },
  });

  assert.equal(preview.economicReliability.level, "ACTUAL_SCOPED");
  assert.match(preview.economicReliability.userMessage, /aynı.*dönem|doğrulanmış.*gider/i);
  assert.equal(preview.economicReliability.demoAssumptionUsed, false);
});

test("independent route advice asks only the highest-priority missing cost question", () => {
  const question = buildIndependentRouteMissingCostQuestion({
    scenarioPreview: {
      costCoverage: {
        scenario: {
          status: "PARTIAL",
          missingOptionalCosts: [
            { key: "driver", label: "Sürücü maliyeti" },
            { key: "maintenance", label: "Bakım maliyeti" },
          ],
        },
      },
    },
  });

  assert.match(question, /güncel sürücü işveren maliyetini bulamadım/i);
  assert.doesNotMatch(question, /bakım maliyeti/i);
});
