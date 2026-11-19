import test from "node:test";
import assert from "node:assert/strict";
import { hasSelectedFinancialMetricQuestion, isRoomFinancialVehicleRiskIntent, shouldRoutePlatformHistoricalReferenceBeforeFinancialRisk } from "../service.js";
import { buildFuelCostAnswer, detectCostAnalysisIntent, financialSurfaceNavigationAction } from "./seferAbiCostAnalysisAssistant.js";
import { inferCanonicalSemanticRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { executeSemanticQueryPlan } from "../../services/queryPlanExecutor.js";
import { buildAuthorizedProductAwarenessAnswer, buildVehicleToShiftNavigationTarget, isUnselectedShiftRecordLookup } from "../../services/authorizedProductAwareness.js";

const serviceCostContext = {
  path: "/room/financial-operations",
  selectedEntityId: 257,
  structuredFacts: { selectedAgreementId: 195, selectedShiftId: 257 },
  uiHints: {
    visibleSuggestions: [
      "Bu servisin maliyeti ne?",
      "Bu rakam nereden geliyor?",
      "Bu vardiyanın kilometresi neden eksik?",
      "Bu bilgiyi nereden tamamlayabilirim?",
    ],
  },
};

test("platform geçmiş anlaşma sorusu genel finansal risk cevabından önce kapalı gate'e yönlenir", () => {
  assert.equal(shouldRoutePlatformHistoricalReferenceBeforeFinancialRisk({
    semanticPlan: { canonicalRequest: { platformHistoricalReferenceIntent: true } },
    authorizationStatus: "ALLOW",
    roleScopedTargetDenied: false,
  }), true);
  assert.equal(shouldRoutePlatformHistoricalReferenceBeforeFinancialRisk({
    semanticPlan: { canonicalRequest: { platformHistoricalReferenceIntent: true } },
    authorizationStatus: "DENY",
    roleScopedTargetDenied: false,
  }), false);
});

test("vehicle-to-shift guidance keeps the resolved shift selected when opening Vardiyalar", () => {
  assert.deepEqual(buildVehicleToShiftNavigationTarget(296), {
    path: "/room/shifts",
    label: "Vardiyalar",
    purpose: "Seçili araca bağlı yetkili operasyon kaydını aç.",
    routeParams: { focusShiftId: 296 },
    recordType: "SHIFT",
    recordId: 296,
  });
});

test("ROOM vehicle-to-shift guidance resolves an authorized upcoming shift", async () => {
  const result = await buildAuthorizedProductAwarenessAnswer({
    // Use the existing canonical DEMO relation instead of the retired
    // E2EUSAGE123 fixture. This test is read-only and must not seed data.
    user: { role: "ROOM", roomId: 1, id: 3 },
    message: "34ABC126 aracının bağlı olduğu vardiyayı göster.",
    screenContext: {
      path: "/room/vehicles",
      selectedEntityType: "vehicle",
      selectedEntityId: 2,
      selectedLabel: "34ABC126",
      selectedEntity: { type: "VEHICLE", id: 2, label: "34ABC126" },
      structuredFacts: {},
    },
    conversationState: null,
  });
  assert.equal(result.domain, "RELATION_LOOKUP");
  assert.equal(result.count, 1);
  const resolvedShiftId = Number(result.navigationTarget?.recordId || 0);
  assert.ok(resolvedShiftId > 0, "authorized relation must resolve a concrete shift");
  assert.deepEqual(result.records, [`Vardiya #${resolvedShiftId}`]);
  assert.match(result.reply, new RegExp(`Vardiya #${resolvedShiftId}\\b`, "iu"));
  assert.deepEqual(result.navigationTarget, buildVehicleToShiftNavigationTarget(resolvedShiftId));
  assert.equal(
    result.retrievedFacts.some((fact) => /^vehicle\.plate=34\s*ABC\s*126$/iu.test(fact)),
    true,
  );
  assert.equal(result.retrievedFacts.includes(`shift.id=${resolvedShiftId}`), true);
});

test("ROOM vehicle-to-shift guidance does not fall back to its own vehicle for an unauthorized plate", async () => {
  const result = await buildAuthorizedProductAwarenessAnswer({
    user: { role: "ROOM", roomId: 1, id: 3 },
    message: "E2EUSAGE123 aracının bağlı olduğu vardiyayı göster.",
    screenContext: {
      path: "/room/vehicles",
      selectedEntityType: "vehicle",
      selectedEntityId: 1,
      selectedLabel: "34ABC123",
      selectedEntity: { type: "VEHICLE", id: 1, label: "34ABC123" },
      structuredFacts: {},
    },
    conversationState: null,
  });
  assert.equal(result.domain, "RELATION_LOOKUP");
  assert.equal(result.count, 0);
  assert.match(result.reply, /yetkili.*(görünmüyor|doğrulanamadı)|başka.*aitmiş gibi göstermiyorum/iu);
  assert.doesNotMatch(result.reply, /34ABC123|Vardiya #296/iu);
  assert.equal(result.navigationTarget, null);
});

test("explicit alphanumeric vehicle requests do not inherit the selected vehicle", () => {
  const plan = resolveSemanticIntent({
    message: "E2EUSAGE123 aracının GPS durumunu açıkla",
    user: { role: "ROOM" },
    screenContext: {
      path: "/room/vehicles",
      selectedEntityType: "vehicle",
      selectedEntityId: 1,
      selectedLabel: "34ABC123",
    },
    conversationState: null,
  });
  assert.equal(plan.entities.some((entity) => entity.type === "vehicle" && entity.plate === "E2EUSAGE123" && entity.source === "EXPLICIT_QUERY"), true);
  assert.equal(plan.entities.some((entity) => entity.type === "vehicle" && Number(entity.id) === 1 && entity.source === "SCREEN_RECORD"), false);
});

test("unselected shift lookup asks for a record instead of pretending the screen is a result", () => {
  assert.equal(isUnselectedShiftRecordLookup({
    user: { role: "ROOM" },
    message: "Vardiyayı göster",
    screenContext: { path: "/room/shifts", selectedEntityId: null },
  }), true);
  assert.equal(isUnselectedShiftRecordLookup({
    user: { role: "ROOM" },
    message: "Vardiyayı göster",
    screenContext: { path: "/room/shifts", selectedEntityId: 296 },
  }), false);
});

test("selected finance starter stays on the cost-analysis owner", () => {
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Bu rakam nereden geliyor?",
    screenContext: serviceCostContext,
  }), true);
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Bu vardiyanın kilometresi neden eksik?",
    screenContext: serviceCostContext,
  }), true);
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Hangi araç daha uygun?",
    screenContext: serviceCostContext,
  }), true);
});

test("natural vehicle recommendation keeps the selected service cost owner", () => {
  const intent = detectCostAnalysisIntent({
    message: "Hangi araç daha uygun?",
    screenContext: serviceCostContext,
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.questionIntent, "VEHICLE_RECOMMENDATION");
});

test("vehicle alternatives keep mixed route-and-cost questions on the vehicle-plan owner", () => {
  const intent = detectCostAnalysisIntent({
    message: "25 kişi için iki minibüs ile tek midibüs arasındaki rota farkını ve maliyet kanıtını karşılaştır",
    screenContext: serviceCostContext,
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.questionIntent, "VEHICLE_RECOMMENDATION");
});

test("COMPANY budget overview routes natural vehicle questions to the selected cost owner", () => {
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Hangi araç seçeneği mantıklı, kaç araç gerekir?",
    screenContext: {
      path: "/company/financial-operations",
      role: "COMPANY",
      selectedEntityId: 2118,
      structuredFacts: {
        screenType: "COMPANY_FINANCIAL_OPERATIONS",
        financeView: "overview",
        selectedBudgetPlanId: 4,
      },
    },
  }), true);
});

test("natural vehicle recommendation exposes a same-context comparison target", () => {
  const action = financialSurfaceNavigationAction({
    message: "Hangi araç daha uygun?",
    screenPath: "/room/financial-operations",
    financeView: "service-cost",
    focusVehicleId: 1,
    focusShiftId: 257,
    focusAgreementId: 195,
  });
  assert.equal(action?.actionKind, "OPEN_ROUTE");
  assert.equal(action?.label, "Araç Karşılaştır ekranını aç");
  assert.equal(action?.path, "/room/financial-operations?view=vehicle-comparison&focusVehicleId=1&focusShiftId=257&focusAgreementId=195");
});

test("natural earnings question stays on quote profitability", () => {
  const intent = detectCostAnalysisIntent({
    message: "Bu hizmetten ne kadar kazanıyorum?",
    screenContext: { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "quote-profitability" } },
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.family, "OFFER_PROFITABILITY");
  assert.equal(intent.questionIntent, "OFFER_PROFITABILITY");
});

test("contract month loss question enters the server-owned financial decision route", () => {
  const intent = detectCostAnalysisIntent({
    message: "Bu sözleşmeden bu ay zarar mı ediyorum?",
    screenContext: { ...serviceCostContext, path: "/room/financial-operations", structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "vehicle-comparison" } },
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.questionIntent, "CONTRACT_PROFITABILITY");
});

test("actual-versus-estimate question reports separate canonical amounts", () => {
  const intent = detectCostAnalysisIntent({
    message: "Gerçekleşen giderle tahmin arasındaki fark ne?",
    screenContext: { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "quote-profitability" } },
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.questionIntent, "ACTUAL_VS_ESTIMATE");
});

test("vehicle-type replacement is treated as a planning scenario", () => {
  const intent = detectCostAnalysisIntent({
    message: "Midibüs yerine otobüs kullansam ne değişir?",
    screenContext: { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "vehicle-comparison" } },
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.family, "WHAT_IF_SCENARIO");
  assert.equal(intent.questionIntent, "WHAT_IF_SCENARIO");
});

test("fuel increase question is not misclassified as profitability", () => {
  const intent = detectCostAnalysisIntent({
    message: "Yakıt fiyatı artarsa maliyet ne olur?",
    screenContext: { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "vehicle-comparison" } },
  });
  assert.equal(intent.isCostAnalysis, true);
  assert.equal(intent.family, "WHAT_IF_SCENARIO");
  assert.equal(intent.questionIntent, "WHAT_IF_SCENARIO");
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Yakıt fiyatı artarsa ne olur?",
    screenContext: { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "vehicle-comparison" } },
  }), true);
  const answer = buildFuelCostAnswer({
    message: "Yakıt fiyatı artarsa ne olur?",
    financePreview: {
      baselineOperationalCostMinor: 2390000,
      fuelCalculation: { actualAmountMinor: 240000, estimatedAmountMinor: 12701, fuelTypeStatus: "UNKNOWN", missing: [] },
    },
    scenarioPreview: { fuelComparison: { actualLedgerMinor: 240000, estimatedBaselineMinor: 12701, scenarioEstimateMinor: null } },
  });
  assert.match(answer?.resultText || "", /artış yüzdesi belirtilmediği için yeni senaryo tutarı hesaplamıyorum/iu);
});

test("vehicle comparison risk starter stays on the selected financial risk owner", () => {
  assert.equal(isRoomFinancialVehicleRiskIntent({
    user: { role: "ROOM" },
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: { financeView: "vehicle-comparison" },
    },
    message: "Riskleri sırala",
    semanticPlan: { authorizationDecision: { status: "ALLOW" } },
  }), true);
  assert.equal(isRoomFinancialVehicleRiskIntent({
    user: { role: "ROOM" },
    screenContext: {
      path: "/room/financial-operations",
      structuredFacts: { financeView: "expenses" },
    },
    message: "Riskleri sırala",
    semanticPlan: { authorizationDecision: { status: "ALLOW" } },
  }), false);
});

test("pending agreement suggestion is a collection status query without a selected agreement", () => {
  const plan = resolveSemanticIntent({
    message: "İnceleme bekleyen sözleşmem var mı?",
    user: { role: "ROOM" },
    screenContext: { path: "/room/agreements" },
    conversationState: null,
  });
  assert.equal(plan.collectionStatusDistributionIntent, true);
  assert.equal(plan.scopeTarget, "CURRENT_SCREEN");
  assert.deepEqual(plan.requestedDomains, ["AGREEMENTS"]);
});

test("pending agreement collection answer reports the pending count, not a generic distribution", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      normalizedText: "inceleme bekleyen sozlesmem var mi?",
      requestedDomains: ["AGREEMENTS"],
      entities: [],
      intentFamily: "COUNT",
      answerMode: "SUMMARY",
      typedRequest: {
        collectionSummaryIntent: true,
        collectionStatusDistributionIntent: true,
        countTarget: { targetEntityType: "AGREEMENT" },
      },
    },
    readDomain: async () => ({
      count: 2,
      facts: [
        { status: "ACTIVE", text: "Aktif sözleşme" },
        { status: "REQUESTED", text: "İnceleme bekleyen sözleşme" },
      ],
    }),
  });
  assert.match(result.reply, /İnceleme bekleyen 1 yetkili sözleşme kaydı var/iu);
});

test("step-by-step guidance stays on the live ROOM shifts surface", () => {
  const plan = resolveSemanticIntent({
    message: "Adım adım anlat.",
    user: { role: "ROOM" },
    screenContext: { path: "/room/shifts", label: "Vardiyalar" },
    conversationState: null,
  });
  assert.notEqual(plan.family, "ROLE_EXPLANATION_HELP");
  assert.equal(plan.scopeTarget, "CURRENT_SCREEN");
});

test("standalone step-by-step guidance wins over retained vehicle lookup context", () => {
  const shape = inferCanonicalSemanticRequest({
    message: "Adım adım anlat.",
    user: { role: "ROOM" },
    screenContext: {
      path: "/room/vehicles",
      label: "Araçlar",
      selectedEntityType: "vehicle",
      selectedEntityId: 1,
      selectedEntity: { type: "VEHICLE", id: 1, label: "34ABC123" },
    },
    conversationState: {
      lastSettledResult: {
        semanticPlan: {
          family: "FIELD_LOOKUP",
          entity: { type: "VEHICLE", id: 1, source: "SELECTED_RECORD" },
        },
      },
    },
  });
  assert.equal(shape.taskType, "SCREEN_CONTEXT");
  assert.equal(shape.scopeTarget, "CURRENT_SCREEN");
  assert.equal(shape.screenKnowledgeKind, "HOW_TO_USE");
});

test("bare back restores the verified live ROOM vehicle guidance step", () => {
  const plan = resolveSemanticIntent({
    message: "Geri.",
    user: { role: "ROOM" },
    screenContext: {
      path: "/room/vehicles",
      selectedEntityType: "vehicle",
      selectedEntityId: 1,
      selectedEntity: { type: "VEHICLE", id: 1, label: "34ABC123" },
    },
    conversationState: {
      lastSettledResult: {
        semanticPlan: {
          family: "FIELD_LOOKUP",
          entity: { type: "VEHICLE", id: 1, source: "SELECTED_RECORD" },
        },
      },
    },
  });
  assert.equal(plan.family, "CONTINUE_CURRENT_REASONING");
  assert.equal(plan.continuationAction, "BACK");
});

test("vehicle back recovery returns to the last verified fact instead of repeating a dead end", async () => {
  const result = await executeSemanticQueryPlan({
    plan: {
      normalizedText: "geri.",
      requestedDomains: ["VEHICLES"],
      entities: [{ type: "vehicle", id: 1 }],
      entity: { type: "vehicle", id: 1 },
      family: "CONTINUE_CURRENT_REASONING",
      intentFamily: "CONTINUE_CURRENT_REASONING",
      continuationOfFamily: "ENTITY_LOOKUP",
      continuationAction: "BACK",
      continuationDepth: 2,
    },
    readDomain: async () => ({
      count: 1,
      facts: [{ id: 1, vehicleId: 1, plate: "34ABC123", text: "Araç 34ABC123 • Konum bilgisi çevrim dışı veya sinyal yok" }],
    }),
  });
  assert.match(result.reply, /bir önceki güvenli adım/i);
  assert.match(result.reply, /34ABC123/);
});

test("route evidence starter is cost-analysis eligible without inventing a metric", () => {
  const intent = detectCostAnalysisIntent({
    message: "Bu vardiyanın kilometresi neden eksik?",
    screenContext: serviceCostContext,
  });
  assert.equal(intent.isCostAnalysis, true);
});

test("canonical finance starters remain selected-record questions after UI hint sanitization", () => {
  const sanitizedContext = {
    path: "/room/financial-operations",
    selectedEntityId: 257,
    structuredFacts: { selectedAgreementId: 195, selectedShiftId: 257 },
  };
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Bu bilgiyi nereden tamamlayabilirim?",
    screenContext: sanitizedContext,
  }), true);
  assert.equal(detectCostAnalysisIntent({
    message: "Bu bilgiyi nereden tamamlayabilirim?",
    screenContext: sanitizedContext,
  }).isCostAnalysis, true);
});

test("selected finance follow-ups preserve the current cost context", () => {
  const context = { ...serviceCostContext, structuredFacts: { ...serviceCostContext.structuredFacts, financeView: "vehicle-comparison" } };
  for (const message of ["Bunu nereden değiştirebilirim?", "Bulamadım.", "Geri."]) {
    assert.equal(hasSelectedFinancialMetricQuestion({ message, screenContext: context }), true, message);
  }
  assert.equal(detectCostAnalysisIntent({
    message: "Geri.",
    screenContext: context,
    conversationState: { costAnalysisState: { lastIntentFamily: "WHAT_IF_SCENARIO" }, recentMessages: [{ role: "user", text: "Yakıt fiyatı artarsa ne olur?" }] },
  }).isCostAnalysis, true);
});

test("independent Giderlerim starters do not inherit a selected service cost", () => {
  const expensesContext = {
    path: "/room/financial-operations",
    selectedEntityId: 279,
    structuredFacts: {
      financeView: "expenses",
      selectedAgreementId: 199,
      selectedShiftId: 279,
    },
    uiHints: { visibleSuggestions: ["Bu ay ne kadar giderim var?", "Hangi giderler dağıtılmamış?"] },
  };
  assert.equal(hasSelectedFinancialMetricQuestion({
    message: "Hangi giderler dağıtılmamış?",
    screenContext: expensesContext,
  }), false);
});
