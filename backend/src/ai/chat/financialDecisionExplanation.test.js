import test from "node:test";
import assert from "node:assert/strict";
import { buildRoomFinancialDecisionExplanation } from "./financialScenarioContext.js";

const roomUser = { role: "ROOM", roomId: 20 };

function context(overrides = {}) {
  return {
    path: "/room/financial-operations",
    structuredFacts: {
      financeView: "quote-profitability",
      selectedVehicleId: 1,
      selectedVehicleLabel: "34ABC123",
      selectedAgreementId: 202,
      periodStart: "2026-12-01",
      periodEnd: "2026-12-31",
      roomId: 20,
      sourceEntryIds: [301, 302],
      ...overrides,
    },
  };
}

test("vehicle/month explanation refuses a profit claim when earned revenue is missing", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Bu araç bu ay bana para kazandırdı mı?",
    screenContext: context({ financeView: "vehicle-comparison" }),
    now: new Date("2026-12-15T12:00:00.000Z"),
    decisionLayer: {
      vehicleMonthDecision: {
        status: "NOT_PROVEN",
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        distributedActualCostMinor: 410000,
        earnedRevenueMinor: null,
        activityResultMinor: null,
        blockers: ["VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"],
      },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "NOT_PROVEN");
  assert.match(result.resultText, /34ABC123/iu);
  assert.match(result.resultText, /4\.100,00\s*TL/iu);
  assert.match(result.resultText, /kazanılmış gelir.*kanıt|kâr.*zarar.*hükmü/iu);
  assert.equal(result.evidence.sourceEntryIds.join(","), "301,302");
});

test("KDV sorusu aynı server-owned KDV ayrıştırılmış sonucu açıklar ve vergi tahminini uydurmaz", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Bu ay KDV'yi düşünce ne kadar kâr ettim?",
    screenContext: context({ financeView: "vehicle-comparison" }),
    now: new Date("2026-12-15T12:00:00.000Z"),
    decisionLayer: {
      vehicleMonthDecision: {
        vehicleId: 1,
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        vatAdjustedProfitability: {
          vatAdjustedOperatingProfitMinor: 750000,
          estimatedAfterTaxNetProfitMinor: null,
          profitabilityEvidence: { actualCostSourceIds: [2901], earnedIncomeSourceIds: [1901], blockers: ["VERIFIED_TAX_BASIS_MISSING"] },
        },
      },
    },
  });

  assert.equal(result?.status, "PROVISIONAL_ACTIVITY_RESULT");
  assert.match(result.resultText, /KDV ayrıştırılmış faaliyet kârı 7\.500,00 TL/iu);
  assert.match(result.resultText, /vergi sonrası tahmini net kâr hesaplanamadı/iu);
  assert.deepEqual(result.evidence.sourceEntryIds, [301, 302, 2901, 1901]);
  assert.equal(result.writeAction, false);
});

test("contract/month explanation keeps contract total in minor-unit-safe display and separates earned revenue", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Bu sözleşmeden bu ay kâr mı ettim, zarar mı?",
    screenContext: context(),
    now: new Date("2026-12-15T12:00:00.000Z"),
    commercialContext: { type: "AGREEMENT", id: 202, roomOfferAmount: 120000 },
    decisionLayer: {
      contractMonthDecision: {
        status: "NOT_PROVEN",
        agreementId: 202,
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        contractTotalMinor: 120000,
        earnedRevenueMinor: null,
        plannedCostMinor: null,
        collectedCashMinor: null,
        blockers: ["VAT_UNKNOWN_OR_NET_PROFIT_NOT_PROVEN"],
      },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "NOT_PROVEN");
  assert.match(result.resultText, /Sözleşme #202/iu);
  assert.match(result.resultText, /1\.200,00\s*TL/iu);
  assert.doesNotMatch(result.resultText, /120\.000,00\s*TL/iu);
  assert.match(result.resultText, /kazanılmış gelir|tahsilat/iu);
});

test("new-offer explanation reports the server-owned quote floor without recalculating it", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Yeni bir anlaşmayı hangi fiyatla yapmalıyım?",
    screenContext: context(),
    decisionLayer: {
      newOfferDecision: {
        status: "READY_FOR_REVIEW",
        baselineOperationalCostMinor: 410000,
        riskAdjustedCostMinor: 430500,
        targetContributionBps: 2000,
        riskReserveBps: 500,
        quoteFloorMinor: 538125,
        scenarioOfferMinor: 15000000,
        scenarioActivityResultMinor: 14590000,
        scenarioContributionMarginBps: 9727,
        offerSubmissionAllowed: false,
      },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "READY_FOR_REVIEW");
  assert.match(result.resultText, /5\.381,25\s*TL/iu);
  assert.match(result.resultText, /%20|20,00%/iu);
  assert.match(result.resultText, /%5|5,00%/iu);
  assert.equal(result.evidence.calculationSource, "SERVER_OWNED_DECISION_LAYER");
  assert.equal(result.writeAction, false);
  assert.equal(result.evidence.offerSubmissionAllowed, false);
});

test("offer explanation can read the canonical finance preview without creating a second calculation", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Yeni bir anlaşmayı hangi fiyatla yapmalıyım?",
    screenContext: context(),
    financePreview: {
      currencyCode: "TRY",
      quoteFloor: {
        baselineOperationalCostMinor: 410000,
        riskAdjustedCostMinor: 430500,
        targetContributionBps: 2000,
        riskReserveBps: 500,
        quoteFloorMinor: 538125,
      },
    },
  });

  assert.equal(result?.status, "READY_FOR_REVIEW");
  assert.match(result.resultText, /5\.381,25\s*TL/iu);
  assert.equal(result.evidence.baselineOperationalCostMinor, 410000);
  assert.equal(result.evidence.quoteFloorMinor, 538125);
  assert.equal(result.evidence.calculationSource, "SERVER_OWNED_DECISION_LAYER");
});

test("bu ay does not silently reuse a December context for October", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Bu araç bu ay bana para kazandırdı mı?",
    screenContext: context(),
    now: new Date("2026-10-25T12:00:00.000Z"),
    decisionLayer: {
      vehicleMonthDecision: {
        status: "NOT_PROVEN",
        periodStart: "2026-12-01",
        periodEnd: "2026-12-31",
        distributedActualCostMinor: 410000,
      },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "NOT_PROVEN");
  assert.match(result.resultText, /Ekim 2026/iu);
  assert.match(result.resultText, /Aralık 2026/iu);
  assert.doesNotMatch(result.resultText, /4\.100,00\s*TL/iu);
});

test("non-ROOM or cross-room context fails closed without financial detail", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: { role: "COMPANY", roomId: 20 },
    message: "Yeni bir anlaşmayı hangi fiyatla yapmalıyım?",
    screenContext: context({ roomId: 999 }),
    decisionLayer: {
      newOfferDecision: { status: "READY_FOR_REVIEW", quoteFloorMinor: 538125 },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "SECURITY_BLOCK");
  assert.doesNotMatch(result.resultText, /5\.381,25|538\.125/iu);
  assert.equal(result.writeAction, false);
});

test("decision questions without a selected vehicle do not expose the default preview amount", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Bu araç bu ay bana para kazandırdı mı?",
    screenContext: {
      path: "/room/financial-operations?view=overview",
      structuredFacts: { roomId: 20, periodStart: "2026-12-01", periodEnd: "2026-12-31" },
    },
    financePreview: {
      roomProfitability: { actualOperationalCostMinor: 410000 },
    },
    now: new Date("2026-12-15T12:00:00.000Z"),
  });

  assert.equal(result?.status, "NOT_PROVEN");
  assert.match(result.resultText, /seçili kayıt|seçili araç/iu);
  assert.doesNotMatch(result.resultText, /4\.100,00|4100/iu);
  assert.equal(result.writeAction, false);
});

test("general ROOM finance question separates provisional gap from confirmed net profit", () => {
  const result = buildRoomFinancialDecisionExplanation({
    user: roomUser,
    message: "Geçici gelir-gider farkı kesin net kâr mı?",
    screenContext: {
      path: "/room/financial-operations?view=overview",
      structuredFacts: { roomId: 20, financeView: "overview" },
    },
  });

  assert.equal(result?.handled, true);
  assert.equal(result?.status, "NOT_PROVEN");
  assert.match(result.resultText, /geçici gelir.?gider farkı.*kesin net kâr değildir/iu);
  assert.match(result.resultText, /kesin net kâr.*hesaplanmadı/iu);
  assert.equal(result.evidence.confirmedNetProfitMinor, null);
  assert.equal(result.writeAction, false);
});
