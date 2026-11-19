import { prisma } from "../../prisma.js";
import {
  buildCompanyBudgetAndServiceCostPreview,
} from "../../finance/companyBudgetAndServiceCost.js";
import {
  buildContractMonthDecisionSummary,
  buildNewOfferDecisionSummary,
  buildRoomProfitabilityAndQuoteFloorPreview,
} from "../../finance/roomProfitabilityAndQuoteFloor.js";
import {
  buildRoomQuoteFloorDraftPreviewInputs,
  buildCompanyBudgetPlanPreviewInputs,
  getCompanyBudgetAgreementEvidence,
  getCompanyHistoricalFinancialEvidence,
  getCompanyBudgetPlanOverview,
  selectCompanyBudgetPlanForPreview,
  getCurrentRoomQuoteFloorDraft,
  resolveRoomQuoteFloorDraftScope,
} from "../../services/financialOperationsLifecycle.js";
import { buildCompanyPriceBudgetAdvisory } from "../../finance/companyPriceBudgetAdvisory.js";
import {
  buildComparableCommercialReference,
} from "../../finance/roomMonthlyPriceReference.js";
import { resolveAgreementCommercialEvidence } from "../../finance/agreementCommercialEvidence.js";
import { buildAgreementReconciliationPreview } from "../../finance/hakedisInvoiceReconciliation.js";
import { buildInvoiceCollectionSummary } from "../../services/invoiceCollectionLedger.js";
import { getFinancialOperationsAccessForRole } from "../../finance/financialOperationsScope.js";
import { getReferenceLayers } from "../../externalCost/externalCostReferenceService.js";
import {
  buildCostScenarioPreviewFromBaseline,
  loadCostScenarioBaselineForUser,
} from "../../routes/costScenario.js";
import { buildRealizedIncomeEvidence } from "../../finance/accountingExportContract.js";
import { buildOperationalCostInputs } from "../../finance/roomCostLedger.js";
import { buildCostAllocationProjection, buildForecastCostAllocationProjection } from "../../finance/roomCostAllocation.js";
import {
  adaptLedgerEntriesToOperationalInputs,
  buildRoomPlanningEvidence,
  mergeOperationalCostInputs,
} from "../../finance/roomCostPreviewAdapter.js";
import { resolveReusableVehiclePlanningProfile } from "../../finance/roomVehiclePlanningEvidence.js";
import {
  buildVehicleMonthDecisionSummary,
  filterServiceCostEntriesForContext,
} from "../../finance/roomServiceCostContext.js";
import { buildRoomFinancialDecisionExplanation } from "./financialScenarioContext.js";

export const SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION = "SEFER-ABI-COST-ANALYSIS-ASSISTANT-01";

const DEFINITIVE_QUOTE_FLOOR_SOURCES = new Set([
  "CANONICAL_PERIOD_PLAN",
  "ROOM_COST_LEDGER_ACTUAL",
  "ACTUAL_LEDGER",
  "COMPLETE",
  "READY",
]);

export function isEconomicallyProvenQuoteFloor(quoteFloorEvidence = null) {
  const source = String(quoteFloorEvidence?.baselineSource || "").trim().toUpperCase().replace(/[- ]+/g, "_");
  const missingFields = Array.isArray(quoteFloorEvidence?.missingFields)
    ? quoteFloorEvidence.missingFields.filter(Boolean)
    : [];
  const periodPlanning = quoteFloorEvidence?.periodPlanning;
  const periodReady = !periodPlanning
    || (periodPlanning.periodCostReady === true && periodPlanning.comparisonAllowed === true);
  return quoteFloorEvidence?.computed === true
    && missingFields.length === 0
    && DEFINITIVE_QUOTE_FLOOR_SOURCES.has(source)
    && periodReady;
}

export function buildRoomQuoteFloorInputsForSelectedContext({
  selectedShiftId = null,
  selectedVehicleId = null,
  selectedAgreementId = null,
  structuredFacts = {},
  quoteDraft = null,
} = {}) {
  const scopedDraft = resolveRoomQuoteFloorDraftScope(quoteDraft, {
    shiftId: selectedShiftId,
    vehicleId: selectedVehicleId,
    agreementId: selectedAgreementId,
  });
  const saved = scopedDraft.compatible ? scopedDraft.inputs : {};
  const liveCanonicalBaselineMinor = finiteNumber(structuredFacts.plannedCostMinor);
  const draftHasExplicitManualBaseline = scopedDraft.draft?.manualBaselineOperationalCostMinor !== null
    && scopedDraft.draft?.manualBaselineOperationalCostMinor !== undefined;
  const draftHasStaleComputedBaseline = String(scopedDraft.draft?.baselineSource || "").trim().toLowerCase() === "incomplete"
    && !draftHasExplicitManualBaseline
    && liveCanonicalBaselineMinor !== null;
  const savedManualBaseline = draftHasStaleComputedBaseline
    ? null
    : saved.manualBaselineOperationalCostMinor;
  return {
    ...saved,
    currencyCode: "TRY",
    manualBaselineOperationalCostMinor: structuredFacts.manualBaselineOperationalCostMinor
      ?? savedManualBaseline
      ?? null,
    targetContributionBps: structuredFacts.targetContributionBps
      ?? saved.targetContributionBps
      ?? null,
    riskReserveBps: structuredFacts.riskReserveBps
      ?? saved.riskReserveBps
      ?? null,
    quoteScenarioAmountMinor: structuredFacts.quoteScenarioAmountMinor
      ?? saved.quoteScenarioAmountMinor
      ?? null,
  };
}

const COMPUTED_ROOM_QUOTE_FIELDS = new Set([
  "manualBaselineOperationalCostMinor",
  "baselineOperationalCostMinor",
  "quoteFloorMinor",
  "quoteFloorPerPassengerMinor",
  "baselineSource",
]);

const ROOM_OWNERSHIP_INPUT_FIELDS = new Set([
  "vehicleLeaseMonthlyMinor",
  "vehicleDepreciationMonthlyMinor",
  "insuranceMonthlyMinor",
  "taxAndLicenseMonthlyMinor",
  "fixedVehicleCostMonthlyMinor",
]);

/**
 * Carry reusable planning inputs from the selected draft into Sefer Abi's
 * canonical cost owner without allowing a stale computed draft amount to
 * become a new manual baseline.  The ROOM financial route uses the same
 * distinction: fuel/vehicle assumptions are inputs; baseline/quote amounts
 * are outputs of the canonical calculation.
 */
export function mergeRoomCanonicalPlanningInputs({
  baselineInput = {},
  quoteFloorInputs = {},
  reusableProfileInputs = {},
  canonicalRouteInputs = {},
} = {}) {
  const planningInputs = Object.fromEntries(
    Object.entries(quoteFloorInputs || {}).filter(([key]) => !COMPUTED_ROOM_QUOTE_FIELDS.has(key)),
  );
  const hasExplicitOwnership = [...ROOM_OWNERSHIP_INPUT_FIELDS].some((field) => {
    const value = planningInputs[field];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
  const effectiveProfileInputs = { ...(reusableProfileInputs || {}) };
  if (hasExplicitOwnership) {
    for (const field of ROOM_OWNERSHIP_INPUT_FIELDS) delete effectiveProfileInputs[field];
  }
  return {
    ...(baselineInput || {}),
    ...(canonicalRouteInputs || {}),
    ...planningInputs,
    ...effectiveProfileInputs,
  };
}

export function buildRoomCanonicalRoutePlanningInputs(routeShift = null) {
  const distanceKm = Number(routeShift?.routeSnapshotDistanceM) > 0
    ? Number((Number(routeShift.routeSnapshotDistanceM) / 1000).toFixed(2))
    : null;
  if (distanceKm === null) return {};
  const totalDistanceKm = routeShift?.emptyDistanceKm != null
    && routeShift?.emptyDistanceEvidenceRef
    && routeShift?.emptyDistanceReason
    ? Number((distanceKm + Number(routeShift.emptyDistanceKm)).toFixed(2))
    : distanceKm;
  return {
    serviceDistanceKm: distanceKm,
    totalDistanceKm,
    canonicalRoute: {
      serviceDistanceKm: distanceKm,
      totalDistanceKm,
      emptyDistanceKm: routeShift?.emptyDistanceKm != null && routeShift?.emptyDistanceEvidenceRef && routeShift?.emptyDistanceReason
        ? Number(routeShift.emptyDistanceKm)
        : null,
      source: "DB_ROUTE_SNAPSHOT",
    },
  };
}

export const COST_REASONING_INTENT_FAMILIES = Object.freeze([
  "BUDGET_COST",
  "OFFER_PROFITABILITY",
  "ROUTE_OPERATION",
  "WHAT_IF_SCENARIO",
  "DATA_CONFIDENCE",
]);

export const COST_REASONING_ANSWER_SECTIONS = Object.freeze([
  "SONUÇ",
  "NEDEN",
  "KANIT",
  "FİNANSAL ETKİ",
  "OPERASYON ETKİSİ",
  "RİSK",
  "ÖNERİ",
  "EKSİK VERİ",
  "GÜVEN SEVİYESİ",
]);

export const COST_REASONING_QUESTION_INTENTS = Object.freeze([
  "BUDGET_OVERRUN",
  "COST_DRIVER",
  "OFFER_PROFITABILITY",
  "MULTI_ROUTE_RANKING",
  "SAVINGS_OPPORTUNITY",
  "ACTUAL_VS_ESTIMATE",
  "CONTRACT_PROFITABILITY",
  "WHAT_IF_SCENARIO",
  "VEHICLE_RECOMMENDATION",
  "ALTERNATIVE_EXPLANATION",
  "RISK_SUMMARY",
  "COMMITMENT_BUDGET_STATUS",
]);

/**
 * Route price advice is a read-only adapter over the existing #4 scenario
 * preview and #1 quote-floor owner. It deliberately refuses to turn a partial
 * scenario into an exact offer floor.
 */
export function buildIndependentRouteQuoteDecision({
  scenarioPreview = null,
  quoteFloor = null,
  currentOfferMinor = null,
  passengerCount = null,
} = {}) {
  const scenarioCost = finiteNumber(scenarioPreview?.scenario?.costMinor);
  const optionalCoverage = scenarioPreview?.costCoverage?.scenario?.status;
  const complete = scenarioPreview?.status === "READY"
    && optionalCoverage === "COMPLETE"
    && scenarioCost !== null;
  return buildNewOfferDecisionSummary({
    baselineOperationalCostMinor: complete ? scenarioCost : null,
    targetContributionBps: quoteFloor?.targetContributionBps ?? null,
    riskReserveBps: quoteFloor?.riskReserveBps ?? null,
    currentOfferMinor,
    passengerCount,
    baselineSource: complete ? "COST_SCENARIO_FORECAST" : "INCOMPLETE_ROUTE_SCENARIO",
  });
}

export function buildIndependentRouteMissingCostQuestion({ scenarioPreview = null } = {}) {
  const missing = Array.isArray(scenarioPreview?.costCoverage?.scenario?.missingOptionalCosts)
    ? scenarioPreview.costCoverage.scenario.missingOptionalCosts
    : [];
  const keys = new Set(missing.map((item) => String(item?.key || "").trim().toLowerCase()));
  if (keys.has("driver")) {
    return "Bu araç için güncel sürücü işveren maliyetini bulamadım. Aylık toplam maliyeti belirtirsen teklif hesabını yalnız bu salt-okunur senaryoda güncelleyebilirim.";
  }
  if (keys.has("maintenance")) {
    return "Bu araç için dönemsel bakım ve değişken gider oranını bulamadım. Km başına geçerli oranı belirtirsen teklif hesabını yalnız bu salt-okunur senaryoda güncelleyebilirim.";
  }
  if (keys.has("fixed_vehicle")) {
    return "Bu araç için dönemsel sabit gider payını doğrulayamadım. Yetkili planlama oranı olmadan kesin teklif üretmiyorum.";
  }
  return null;
}

export function buildCommercialReferenceText({
  scope = "",
  message = "",
  commercialEvidence = null,
  currentCanonicalCostMinor = null,
  currentCanonicalCostLabel = "Güncel kanonik maliyet",
  currentOfferMinor = null,
  selectedScenarioId = null,
  selectedScenarioPeriodPlanning = null,
  recommendedOfferMinor = null,
  quoteFloorEvidence = null,
  currencyCode = "TRY",
} = {}) {
  if (String(scope).toUpperCase() !== "ROOM" || !/(?:fiyat|teklif|anlaşma|anlasma|maliyet)/iu.test(String(message || ""))) return "";
  const historical = commercialEvidence?.comparableHistory || null;
  const selected = commercialEvidence?.selected?.commercialReference || null;
  const negotiation = commercialEvidence?.selected?.negotiationEvidence || null;
  const canonicalCurrency = currencyCode || "TRY";
  const positiveMinorOrNull = (value) => {
    const minor = Number(value);
    return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
  };
  const safeCurrentCanonicalCostMinor = positiveMinorOrNull(currentCanonicalCostMinor);
  const safeCurrentOfferMinor = positiveMinorOrNull(currentOfferMinor);
  const safeRecommendedOfferMinor = positiveMinorOrNull(recommendedOfferMinor);
  const quoteFloorDefinitive = isEconomicallyProvenQuoteFloor(quoteFloorEvidence);
  const periodLabel = selectedScenarioPeriodPlanning?.periodStart && selectedScenarioPeriodPlanning?.periodEnd
    ? `Seçili plan dönemi: ${selectedScenarioPeriodPlanning.periodStart} – ${selectedScenarioPeriodPlanning.periodEnd}.`
    : "";
  return [
    selectedScenarioId ? `Seçili araç senaryosu: ${selectedScenarioId}.` : "",
    periodLabel,
    safeCurrentCanonicalCostMinor != null
      ? `${currentCanonicalCostLabel}: ${formatMoneyMinor(safeCurrentCanonicalCostMinor, canonicalCurrency)}.`
      : "",
    safeCurrentOfferMinor != null
      ? `Seçili taşımacı teklifi: ${formatMoneyMinor(safeCurrentOfferMinor, canonicalCurrency)}. Bu tutar kaydedilmiş tekliftir; kabul edilmiş sözleşme veya gerçekleşmiş net kâr değildir.`
      : "",
    safeCurrentOfferMinor != null && safeCurrentCanonicalCostMinor != null
      ? `Teklif ile planlama maliyeti arasındaki fark: ${formatMoneyMinor(safeCurrentOfferMinor - safeCurrentCanonicalCostMinor, canonicalCurrency)}. Bu planlama farkı kesin net kâr değildir.`
      : "",
    safeRecommendedOfferMinor != null
      ? quoteFloorDefinitive
        ? `Önerilen teklif: ${formatMoneyMinor(safeRecommendedOfferMinor, canonicalCurrency)}.`
        : `Kısmi planlama teklif önizlemesi: ${formatMoneyMinor(safeRecommendedOfferMinor, canonicalCurrency)}. Tam ekonomik kanıt oluşmadı; bu değer kesin teklif tabanı değildir.`
      : "",
    historical?.comparability === "COMPARABLE" && historical.amountMinor != null
      ? `Karşılaştırılabilir geçmiş ticari fiyat: ${formatMoneyMinor(historical.amountMinor, historical.currencyCode || "TRY")} (Anlaşma #${historical.agreementId}).`
      : selected?.status === "READY"
        ? `Kabul edilmiş sözleşme fiyatı: ${formatMoneyMinor(selected.amountMinor, selected.currencyCode || "TRY")}.`
        : "Karşılaştırılabilir kabul edilmiş geçmiş fiyat kanıtı bulunamadı; güncel maliyet hesabı bağımsız yürütülüyor.",
    negotiation && negotiation.status !== "RECORDED"
      ? "Pazarlık adımlarının tamamı kaydedilmediği için bu tarihçe sınırlı kanıttır."
      : "",
    commercialEvidence?.selected?.operationalEvidence?.actualCostEvidence !== "VERIFIED"
      ? "Bu ticari fiyat gerçekleşmiş gider veya kesin net kâr değildir; operasyon kanıtı ayrıca değerlendirilir."
      : "",
  ].filter(Boolean).join(" ");
}

export function carryIndependentRouteScenarioContext({ currentOverrides = {}, conversationState = null, isFollowUp = false } = {}) {
  const prior = conversationState?.costAnalysisState?.lastIndependentScenarioOverrides;
  if (!isFollowUp || !prior || typeof prior !== "object" || Array.isArray(prior)) return { ...(currentOverrides || {}) };
  return { ...prior, ...(currentOverrides || {}) };
}

const FINANCIAL_PATH_PATTERN = /(?:\/|^)(?:room|company|school|organization)\/financial-operations\b/i;
const FOLLOW_UP_PATTERN = /^(?:peki|neden|nasıl|nasil|bunu aç|bunu ac|devam|geri|aynı|ayni|bu durumda|hangi veri|ne öner|ne oner|detay|açıkla|acikla|kayna\p{L}*|dayana\p{L}*|hesaplama\p{L}*|temel\p{L}*|provenans\p{L}*|yaptım|yaptim|bulamadım|bulamadim|başka seçenek|baska secenek)\b/iu;
const DEICTIC_FINANCIAL_FOLLOW_UP_PATTERN = /^(?:bu|bunun|bu\s+(?:tutar|deger|sonuc))\b.*\b(?:nasil|hesap|detay|ayrinti|neden|acikla|anlat)\p{L}*\b/iu;

export function isCostScenarioPreviewTruthQuestion({ message = '', screenPath = '' } = {}) {
  const path = String(screenPath || '').split('?')[0];
  if (path !== '/room/cost-scenarios') return false;
  const text = String(message || '');
  return /(?:senaryo|önizleme|onizleme|maliyet|plan)/iu.test(text)
    && /(?:gerçekleşmiş|gerceklesmis|ödeme|odeme|gider|kâr|kar|net|kesin|sonuç|sonuc)/iu.test(text);
}

export function isCostScenarioPreviewMissingDataQuestion({ message = '', screenPath = '' } = {}) {
  const path = String(screenPath || '').split('?')[0];
  if (path !== '/room/cost-scenarios') return false;
  const text = String(message || '');
  return /(?:bakım|bakim|kdv|veri|kanıt|kanit)/iu.test(text)
    && /(?:anlam|neden|eksik|dahil|net|sonuç|sonuc|ne\s+demek|açıkla|acikla)/iu.test(text);
}

export function selectedFinancialScenarioContext(screenContext = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  const readId = (...values) => {
    for (const value of values) {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) return id;
    }
    return null;
  };
  const selectedEntityType = String(screenContext?.selectedEntityType || "").trim().toLowerCase();
  const routeBoundShiftId = selectedEntityType === "shift"
    ? readId(screenContext?.selectedEntityId)
    : null;
  const routeBoundAgreementId = selectedEntityType === "agreement"
    ? readId(screenContext?.selectedEntityId)
    : null;
  const allowedScenarioKeys = new Set([
    "passengerCount",
    "vehicleType",
    "vehicleCount",
    "vehicleCapacity",
    "serviceDistanceKm",
    "totalDistanceKm",
    "emptyDistanceKm",
    "routeDurationMinutes",
    "serviceDayCount",
    "shiftCount",
    "tripCount",
    "fuelConsumptionLitersPer100Km",
    "fuelUnitPriceMinor",
    "driverBasePerShiftMinor",
    "maintenancePerKmMinor",
    "useExternalFuelPrice",
  ]);
  const scenarioOverrides = Object.fromEntries(
    Object.entries(facts?.selectedScenarioOverrides || {})
      .filter(([key]) => allowedScenarioKeys.has(key))
      .map(([key, value]) => {
        if (key === "vehicleType") return [key, String(value || "").trim().toUpperCase()];
        if (key === "useExternalFuelPrice") return [key, value === true];
        const number = Number(value);
        return [key, Number.isFinite(number) ? number : null];
      })
      .filter(([, value]) => value !== null && value !== ""),
  );
  return {
    focusAgreementId: readId(facts.selectedAgreementId, facts.agreementId, routeBoundAgreementId),
    focusShiftId: readId(facts.selectedShiftId, facts.shiftId, routeBoundShiftId),
    selectedScenarioId: String(facts.selectedScenarioId || "").trim() || null,
    selectedScenarioCostMinor: Number.isSafeInteger(Number(facts.selectedScenarioCostMinor))
      && Number(facts.selectedScenarioCostMinor) >= 0
      ? Number(facts.selectedScenarioCostMinor)
      : null,
    selectedOfferMinor: Number.isSafeInteger(Number(facts.selectedOfferMinor))
      && Number(facts.selectedOfferMinor) > 0
      ? Number(facts.selectedOfferMinor)
      : null,
    selectedScenarioPeriodPlanning: facts.selectedScenarioPeriodPlanning
      && typeof facts.selectedScenarioPeriodPlanning === "object"
      ? facts.selectedScenarioPeriodPlanning
      : null,
    scenarioOverrides,
  };
}

export function financialSurfaceNavigationAction({ role = "", message = "", screenPath = "", financeView = "", focusVehicleId = null, focusShiftId = null, focusAgreementId = null } = {}) {
  const normalizedMessage = normalizeText(message);
  const normalizedPath = String(screenPath || "").split("?")[0];
  const normalizedView = String(financeView || "").trim().toLowerCase();
  const roleKey = upper(role);
  const requestsVehicleComparison = /(?:hangi|kaç|kac)\s+(?:bir\s+)?(?:araç|arac)(?=\s|$|[?!.,])[^.!?\n]{0,48}(?:uygun|mantıklı|mantikli|öner|oner|iyi|avantajlı|avantajli)/iu.test(normalizedMessage)
    || /(?:araç|arac)(?=\s|$|[?!.,])[^.!?\n]{0,48}(?:daha\s+)?(?:uygun|mantıklı|mantikli|öner|oner)/iu.test(normalizedMessage);
  if (requestsVehicleComparison && normalizedPath === "/room/financial-operations" && normalizedView !== "vehicle-comparison") {
    const params = new URLSearchParams({ view: "vehicle-comparison" });
    for (const [key, value] of [["focusVehicleId", focusVehicleId], ["focusShiftId", focusShiftId], ["focusAgreementId", focusAgreementId]]) {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) params.set(key, String(id));
    }
    return {
      actionKind: "OPEN_ROUTE",
      label: "Araç Karşılaştır ekranını aç",
      path: `/room/financial-operations?${params.toString()}`,
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
      reason: "Araç önerisi aynı seçili hizmet, vardiya ve araç bağlamıyla yetkili Araç Karşılaştır yüzeyinde salt-okunur açılır.",
    };
  }
  const requestsCostPreview = /\b(?:maliyet|maliyet\s+senaryosu|cost)\p{L}*\b.{0,24}\b(?:onizleme|önizleme|goster|göster|ac|aç)\b/iu.test(normalizedMessage)
    || /\b(?:onizleme|önizleme)\b.{0,24}\b(?:maliyet|cost)\p{L}*\b/iu.test(normalizedMessage);
  if (requestsCostPreview && normalizedPath !== "/room/cost-scenarios") {
    if (roleKey === "COMPANY") {
      return {
        actionKind: "OPEN_ROUTE",
        label: "Bütçe ve Servis Maliyeti ekranına git",
        path: "/company/financial-operations",
        safeNavigation: true,
        criticalActionExecution: false,
        writeAction: false,
        reason: "COMPANY maliyet/bütçe açıklaması yalnızca kendi yetkili Bütçe ve Servis Maliyeti yüzeyinde salt-okunur açılır.",
      };
    }
    return {
      actionKind: "OPEN_ROUTE",
      label: "Maliyet Senaryoları ekranına git",
      path: "/room/cost-scenarios",
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
      reason: "Maliyet önizlemesi yalnızca yetkili Maliyet Senaryoları yüzeyinde salt-okunur açılır.",
    };
  }
  const requestsFinancialDetail = /\b(?:finans\p{L}*|finansal\p{L}*|mali\p{L}*|hakediş\p{L}*|hakedis\p{L}*|ödeme\p{L}*|odeme\p{L}*|fatura\p{L}*|mutabakat\p{L}*|teklif\s+tabani\p{L}*)\b/iu.test(normalizedMessage);
  const requestsVisibleTarget = /\b(?:goster|ac|incele|goruntule|bak)\b/iu.test(normalizedMessage);
  const requestsFinancialStatus = /\b(?:sorun|durum|risk|eksik|var\s+mi)\b/iu.test(normalizedMessage);
  if (FINANCIAL_PATH_PATTERN.test(normalizedPath) || !requestsFinancialDetail || !(requestsVisibleTarget || requestsFinancialStatus)) return null;
  const targetPath = roleKey === "COMPANY" ? "/company/financial-operations" : "/room/financial-operations";
  const targetLabel = roleKey === "COMPANY" ? "Bütçe ve Servis Maliyeti ekranına git" : "Finansal Operasyonlar ekranına git";
  return {
    actionKind: "OPEN_ROUTE",
    label: targetLabel,
    path: targetPath,
    safeNavigation: true,
    criticalActionExecution: false,
    writeAction: false,
    reason: "Finansal ayrıntı yalnızca yetkili Finansal Operasyonlar yüzeyinde açılır; salt-okunur bir yönlendirmedir.",
  };
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value) {
  const number = finiteNumber(value);
  return number === null ? null : Math.trunc(number);
}

function formatMoneyMinor(value, currencyCode = "TRY") {
  const amount = integer(value);
  if (amount === null) return "";
  try {
    return (amount / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: String(currencyCode || "TRY").toUpperCase(),
      maximumFractionDigits: 2,
    });
  } catch {
    return `${(amount / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${String(currencyCode || "TRY").toUpperCase()}`;
  }
}

function formatBasisPointsPercentage(value) {
  const basisPoints = finiteNumber(value);
  if (basisPoints === null) return "";
  return `${(basisPoints / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}%`;
}

export function buildQuoteFloorCalculationBreakdown({ quoteFloor = null, currencyCode = "TRY" } = {}) {
  const baselineOperationalCostMinor = integer(quoteFloor?.baselineOperationalCostMinor);
  const targetContributionBps = finiteNumber(quoteFloor?.targetContributionBps);
  const riskReserveBps = finiteNumber(quoteFloor?.riskReserveBps);
  const quoteFloorMinor = integer(quoteFloor?.quoteFloorMinor);
  if ([baselineOperationalCostMinor, targetContributionBps, riskReserveBps, quoteFloorMinor].some((value) => value === null)) return "";
  return [
    `Operasyon maliyeti: ${formatMoneyMinor(baselineOperationalCostMinor, currencyCode)}`,
    `Katkı payı: ${formatBasisPointsPercentage(targetContributionBps)}`,
    `Risk rezervi: ${formatBasisPointsPercentage(riskReserveBps)}`,
    `Minimum teklif tabanı: ${formatMoneyMinor(quoteFloorMinor, currencyCode)}`,
  ].join(" • ");
}

function formatNumber(value, maximumFractionDigits = 2) {
  const number = finiteNumber(value);
  if (number === null) return "";
  return number.toLocaleString("tr-TR", { maximumFractionDigits });
}

function isFuelCostQuestion(message) {
  const text = normalizeText(message);
  return /\byakit\b/iu.test(text)
    && (/(?:maliyet|tutar|ne kadar|dahil|toplam)/iu.test(text)
      || /(?:artarsa|artış|artis|yüksel|yuksel)/iu.test(text));
}

/**
 * Keep Sefer Abi's fuel answers on the same read-only canonical evidence that
 * powers the ROOM financial surface. A ledger amount and a formula estimate
 * are deliberately reported side by side; neither is silently substituted
 * for the other, and an unresolved vehicle profile cannot become a confirmed
 * net-cost claim.
 */
export function buildFuelCostAnswer({ message = "", financePreview = null, scenarioPreview = null, currencyCode = "TRY" } = {}) {
  if (!isFuelCostQuestion(message)) return null;

  const fuel = financePreview?.fuelCalculation || {};
  const comparison = scenarioPreview?.fuelComparison || {};
  const actualLedgerMinor = integer(comparison.actualLedgerMinor ?? fuel.actualAmountMinor);
  const estimatedBaselineMinor = integer(comparison.estimatedBaselineMinor ?? fuel.estimatedAmountMinor);
  const scenarioEstimateMinor = integer(comparison.scenarioEstimateMinor);
  const totalOperationalCostMinor = integer(financePreview?.baselineOperationalCostMinor);
  const missing = unique(fuel.missing);
  const hasUnresolvedProfile = upper(fuel.fuelTypeStatus) !== "RESOLVED" || missing.length > 0;
  const asksFuelIncrease = /(?:yakıt|yakit)[^.!?\n]{0,36}(?:artarsa|artış|artis|yüksel|yuksel)/iu.test(normalizeText(message));
  const hasExplicitFuelIncrease = /(?:yakıt|yakit)[^.!?\n]{0,36}\d+(?:[.,]\d+)?\s*%/iu.test(normalizeText(message));
  const actualText = actualLedgerMinor === null
    ? "Kayıtlı gerçekleşen yakıt gideri bulunamadı; değer uydurmuyorum."
    : `Gerçekleşen yakıt gideri ${formatMoneyMinor(actualLedgerMinor, currencyCode)}.`;
  const estimateText = estimatedBaselineMinor === null
    ? "Rota, tüketim ve kaynaklı litre fiyatıyla hesaplanan plan tahmini bulunmuyor."
    : `Aynı planın formül tahmini ${formatMoneyMinor(estimatedBaselineMinor, currencyCode)}.`;
  const uncertaintyText = hasUnresolvedProfile
    ? "Araç yakıt türü veya tüketim doğrulaması eksik olduğu için bu değerler tek bir doğrulanmış yakıt maliyeti olarak birleştirilmiyor."
    : "Gerçekleşen kayıt ile formül tahmini karşılaştırma amacıyla ayrı tutuluyor.";

  if (/toplam|dahil/iu.test(normalizeText(message))) {
    const totalText = totalOperationalCostMinor === null
      ? "Kanonik toplam maliyet tabanı bulunmuyor; toplam uydurmuyorum."
      : `Kanonik toplam maliyet tabanı ${formatMoneyMinor(totalOperationalCostMinor, currencyCode)}.`;
    const totalUncertaintyText = hasUnresolvedProfile
      ? "Araç yakıt türü veya tüketim doğrulaması eksik olduğu için doğrulanmış tek bir toplam üretmiyorum."
      : uncertaintyText;
    return {
      resultText: `Yakıt dahil toplam için ${totalText} ${actualText} ${estimateText} ${totalUncertaintyText} Gerçekleşen yakıt bu tabana otomatik olarak ikinci kez eklenmiyor${scenarioEstimateMinor !== null ? `; değişen senaryo tahmini ${formatMoneyMinor(scenarioEstimateMinor, currencyCode)} olarak ayrı karşılaştırılıyor` : ""}.`,
      reasonText: "Toplam maliyet, mevcut Finansal Operasyonlar önizlemesinden; yakıt tutarları merkezi gider defteri ve aynı maliyet motorunun formül karşılaştırmasından alındı.",
      recommendation: "Önce araç yakıt türü/tüketim kaydını ve KDV durumunu doğrula; ardından toplam sonucu yeniden değerlendir.",
      evidence: { actualLedgerMinor, estimatedBaselineMinor, scenarioEstimateMinor, totalOperationalCostMinor, missing },
    };
  }

  if (asksFuelIncrease && !hasExplicitFuelIncrease) {
    return {
      resultText: `${actualText} ${estimateText} Yakıt artış yüzdesi belirtilmediği için yeni senaryo tutarı hesaplamıyorum; örneğin “yakıt %10 artarsa” diye sorarsan aynı kanonik maliyet motoruyla yeniden hesaplarım.`,
      reasonText: "Artış oranı verilmeden fiyat uydurulmadı; gerçekleşen kayıt ile formül tahmini ayrı tutuldu.",
      recommendation: "Yakıt artış yüzdesini açıkça yaz; bu yalnızca salt-okunur bir planlama senaryosu olarak hesaplanır.",
      evidence: { actualLedgerMinor, estimatedBaselineMinor, scenarioEstimateMinor: null, totalOperationalCostMinor, missing },
    };
  }

  return {
    resultText: `Bu servisin yakıtı için ${actualText} ${estimateText} ${uncertaintyText} ${scenarioEstimateMinor !== null ? `Değişen senaryonun ayrı tahmini ${formatMoneyMinor(scenarioEstimateMinor, currencyCode)}.` : ""}`.trim(),
    reasonText: "Gerçekleşen yakıt ve kilometre-tüketim-fiyat formülü aynı canonical kaynaklardan okunuyor; tahmini yakıt gerçekleşen giderin üzerine ikinci kez yazılmıyor.",
    recommendation: "Araç yakıt türü ve tüketim kaydını doğrula; KDV bilinmiyorsa sonucu brüt/önizleme olarak değerlendir.",
    evidence: { actualLedgerMinor, estimatedBaselineMinor, scenarioEstimateMinor, totalOperationalCostMinor, missing },
  };
}

async function roleKeyForUser(user = {}) {
  const role = upper(user?.role);
  let kind = upper(user?.companyKind || user?.companyType);
  if (!kind && role === "COMPANY" && user?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(user.companyId) },
      select: { kind: true },
    });
    kind = upper(company?.kind);
  }
  if (role === "COMPANY" && kind === "SCHOOL") return "SCHOOL";
  if (role === "COMPANY" && kind === "ORGANIZATION") return "ORGANIZATION";
  return role || "DEFAULT";
}

function visibleRoleLabel(roleKey) {
  return {
    COMPANY: "Hizmet Alan Firma",
    ROOM: "Taşımacılık Firması",
    SCHOOL: "Okul",
    ORGANIZATION: "Organizasyon",
    SUPER_ADMIN: "Süper Yönetici",
  }[roleKey] || "kendi çalışma alanın";
}

function scopeForRole(roleKey, screenPath = "") {
  if (roleKey === "ROOM" || /\/room\//i.test(String(screenPath || ""))) return "ROOM";
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(roleKey) || /\/(?:company|school|organization)\//i.test(String(screenPath || ""))) return "COMPANY";
  return "";
}

function contextText(screenContext, conversationState) {
  return normalizeText([
    screenContext?.path,
    screenContext?.label,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.selectedRecordStatus,
    conversationState?.lastScreenPath,
    conversationState?.lastScreenLabel,
    conversationState?.costAnalysisState?.lastScreenPath,
  ].filter(Boolean).join(" "));
}

function isFollowUpMessage(message, conversationState) {
  const previous = conversationState?.costAnalysisState || conversationState?.costReasoning || null;
  const normalizedMessage = normalizeText(message);
  const isFinancialExplanationFollowUp = DEICTIC_FINANCIAL_FOLLOW_UP_PATTERN.test(normalizedMessage);
  if (previous?.lastIntentFamily && (FOLLOW_UP_PATTERN.test(normalizedMessage) || isFinancialExplanationFollowUp)) return true;
  // The floating drawer intentionally sends a compact recent-message window
  // rather than a mutable cost object.  Preserve cost continuity from that
  // canonical conversation evidence so a terse follow-up is not reclassified
  // as off-topic after a route-bound cost answer.
  const recent = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [];
  const hasCostTurn = recent.some((item) => {
    const text = normalizeText(item?.text);
    return item?.role === "user"
      ? Boolean(familyFromText(text))
      : /(?:SONUÇ|NEDEN|KANIT|FİNANSAL ETKİ|OPERASYON ETKİSİ|EKSİK VERİ|GÜVEN SEVİYESİ|maliyet|senaryo|teklif)/iu.test(text);
  });
  return hasCostTurn && (FOLLOW_UP_PATTERN.test(normalizedMessage) || isFinancialExplanationFollowUp);
}

function continuationTypeFromText(message) {
  const text = normalizeText(message);
  if (/^yaptim\b/.test(text)) return "YAPTIM";
  if (/^bulamadim\b/.test(text)) return "BULAMADIM";
  if (/^(?:devam|devam et)\b/.test(text)) return "DEVAM_ET";
  if (/^geri\b/.test(text)) return "GERI";
  if (/^(?:neden|nasil|nasıl|bunu ac|bunu aç|peki\s+neden)\b/.test(text)) return "NEDEN";
  if (/^(?:baska secenek|başka seçenek|alternatif)\b/.test(text)) return "ALTERNATIVE";
  return "";
}

export function isPlatformHistoricalAgreementReferenceQuestion(message = "") {
  const text = normalizeText(message);
  const platformScope = /\b(?:seferpakt|platform|genelinde|tum\s+odalar|odalar(?:in|in|i)?)\b/.test(text);
  const historicalCue = /\b(?:benzer|gecmis|tarihsel|ortalama|referans)\b/.test(text);
  const agreementValueCue = /\b(?:anlas(?:ilmis|ildi|ma|malar|malara)?|kaca|ne\s+kadar|fiyat|bedel|tutar)\b/.test(text);
  return platformScope && historicalCue && agreementValueCue;
}

function familyFromText(text) {
  if (isPlatformHistoricalAgreementReferenceQuestion(text)) return "BUDGET_COST";
  if (/(?:gecen yil|onceki anlasma|benzer servis|benzer anlasma|bu teklif.*butceme|butceme.*uygun|bu sozlesmeyi kabul|kabul edersem.*butce|satin alma fiyati)/.test(text)) return "BUDGET_COST";
  if (/(?:senaryo|varsay|olursa|gelirse|gelecekse|uzarsa|artarsa|azalırsa|azalirsa|değiştir|degistir|artır|artir|azalt|eklersem|çıkarırsam|cikarsam|what if|alternatif|daha iyi|kişi daha|kisi daha|midibüs.*otobüs|midibus.*otobus|otobüs.*midibüs|otobus.*midibus)/.test(text)) return "WHAT_IF_SCENARIO";
  if (/(?:teklif|kâr|kar|kârlılık|karlilik|marj|fiyat|kazanç|kazanc|kazan(?:ıyorum|iyorum|ır|ir|mak)|teklif tabanı|teklif tabani|minimum fiyat)/.test(text)) return "OFFER_PROFITABILITY";
  if (/(?:rota|mesafe|durak|araç|arac|sürücü|surucu|operasyon|sefer|süre|sure|gecik|kapasite|pahalı|pahali|riskli|risk)/.test(text)) return "ROUTE_OPERATION";
  if (/(?:bütçe|butce|maliyet|masraf|harcama|finansal|finans|mali|servis maliyeti|maliyet neden|maliyetim|tasarruf|nereden)/.test(text)) return "BUDGET_COST";
  if (/(?:kaynak|kanıt|kanit|veri|güven|guven|güncel|guncel|referans|piyasa|gerçek|gercek|tazelik)/.test(text)) return "DATA_CONFIDENCE";
  return "";
}

export function companyPriceBudgetQuestionKind(message = "") {
  const text = normalizeText(message);
  if (/(?:hakedis|fatura|odeme).*(?:durum|nedir|ne durumda|ozet|mutabakat)|(?:butce|finans).*(?:hakedis|fatura|odeme)/.test(text)) return "FINANCIAL_EVIDENCE_STATUS";
  if (/(?:okul|ogrenci|organizasyon|etkinlik|katilimci|servis|hizmet).*(?:butce|maliyet|gider|harcama|finans)|(?:butce|maliyet|gider|harcama|finans).*(?:nedir|ne kadar|ozet|durum)|(?:kullanilabilir|kalan|mevcut)\s+(?:tutar|butce|bakiye)|(?:tutar|butce|bakiye).*(?:kullanilabilir|kalan|mevcut)/.test(text)) return "FINANCIAL_EVIDENCE_STATUS";
  if (/(?:taahh|commitment).*(?:butce|budget).*(?:as|ust|fark)|(?:butce|budget).*(?:taahh|commitment).*(?:as|ust|fark)/.test(text)) return "COMMITMENT_BUDGET_STATUS";
  if (/(?:iki|karsilastir|karşılaştır|fark).*(?:teklif|room)|(?:teklif|room).*(?:iki|karsilastir|karşılaştır|fark)/.test(text)) return "OFFER_COMPARISON";
  if (/(?:bu teklif.*butceme uygun|butceme uygun.*teklif|teklif.*butceme|bu fiyat.*butce|teklif.*butce(?:m|mi|me|miz|mizi).*as|butce(?:m|mi|me|miz|mizi).*teklif.*as)/.test(text)) return "OFFER_BUDGET_FIT";
  if (/(?:bu sozlesmeyi kabul edersem|kabul edersem.*butce|sozlesme.*butcem ne olur)/.test(text)) return "ACCEPTANCE_BUDGET_EFFECT";
  if (/(?:bu fiyat.*onceki|onceki.*anlasma.*yuksek|fiyat.*yuksek mi)/.test(text)) return "OFFER_VS_HISTORY";
  if (/(?:benzer anlasmamiz yok|benzer anlasma.*yok|gecmis.*anlasma.*yok)/.test(text)) return "NO_HISTORY";
  if (/(?:gecen yil|onceki anlasma|benzer servis|satin alma.*fiyat|kaca almistik)/.test(text)) return "HISTORY_PRICE";
  return null;
}

function companyBudgetStatusLabel(status) {
  const value = upper(status);
  if (value === "DRAFT") return "taslak";
  if (value === "ACTIVE") return "aktif";
  return value ? value.toLocaleLowerCase("tr-TR") : "durumu belirsiz";
}

function companyMoney(value, currencyCode = "TRY") {
  const formatted = formatMoneyMinor(value, currencyCode);
  if (!formatted) return "";
  return String(currencyCode || "TRY").toUpperCase() === "TRY"
    ? formatted.replace(/\s*₺/u, "").trim() + " TL"
    : formatted;
}

function companyDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function companyFinancialEvidenceText(commitmentSummary, currencyCode = "TRY", historicalFinancialEvidence = []) {
  const totals = commitmentSummary?.evidenceTotals || {};
  const items = Array.isArray(commitmentSummary?.financialEvidence) ? commitmentSummary.financialEvidence : [];
  if (items.length) {
    const serviceEligibleCount = Number(totals.serviceEligibleCount || 0);
    const serviceCompletedCount = Number(totals.serviceCompletedCount || 0);
    const hakedis = totals.hakedisAmountMinor == null ? "doğrulanmadı" : companyMoney(totals.hakedisAmountMinor, currencyCode);
    const invoice = totals.invoiceAmountMinor == null ? "doğrulanmadı" : companyMoney(totals.invoiceAmountMinor, currencyCode);
    const paid = totals.paidAmountMinor == null ? "doğrulanmadı" : companyMoney(totals.paidAmountMinor, currencyCode);
    const realized = totals.realizedServiceAmountMinor == null ? "doğrulanmadı" : companyMoney(totals.realizedServiceAmountMinor, currencyCode);
    return `Aynı COMPANY finans bağlamında hizmet ${serviceCompletedCount}/${serviceEligibleCount} tamamlandı; gerçekleşen harcama ${realized}; hakediş ${hakedis}; fatura ${invoice}; ödenen ${paid}. Bu tutarlar bütçe taahhüdüne veya gerçekleşen harcamaya ikinci kez eklenmez.`;
  }
  const historical = Array.isArray(historicalFinancialEvidence) ? historicalFinancialEvidence.find(Boolean) : null;
  if (!historical) return "";
  const periodStart = companyDate(historical.period?.start);
  const periodEnd = companyDate(historical.period?.end);
  const eligible = Number(historical.serviceEvidence?.eligibleCount || 0);
  const completed = Number(historical.serviceEvidence?.completedCount || 0);
  const evidenceCurrency = historical.hakedis?.currencyCode || historical.invoice?.currencyCode || currencyCode;
  const hakedis = historical.hakedis?.amountMinor == null ? "doğrulanmadı" : companyMoney(historical.hakedis.amountMinor, evidenceCurrency);
  const invoice = historical.invoice?.amountMinor == null ? "doğrulanmadı" : companyMoney(historical.invoice.amountMinor, evidenceCurrency);
  const paid = historical.payment?.amountMinor == null ? "doğrulanmadı" : companyMoney(historical.payment.amountMinor, historical.payment.currencyCode || evidenceCurrency);
  return `Tamamlanmış ${periodStart} – ${periodEnd} döneminde hizmet ${completed}/${eligible} tamamlandı; hakediş ${hakedis}; fatura ${invoice}; ödenen ${paid}. Bu geçmiş dönem kanıtı seçili bütçe planına değil, sözleşme ve mutabakat kayıtlarına dayanır; bütçe taahhüdüne veya gerçekleşen harcamaya ikinci kez eklenmez.`;
}

export function buildCompanyPriceBudgetAdvisoryResponse({ kind = "OFFER_BUDGET_FIT", advisory = null, commitmentSummary = null, historicalFinancialEvidence = [] } = {}) {
  const budget = advisory?.budgetEffect || {};
  const offer = advisory?.offerEffect || {};
  const comparison = advisory?.offerComparison || {};
  const history = advisory?.historyComparison || {};
  const currencyCode = budget.currencyCode || offer.currencyCode || "TRY";
  const budgetText = budget.budgetAmountMinor == null
    ? "Bütçe tutarı doğrulanamadı."
    : `${companyBudgetStatusLabel(budget.budgetStatus)} bütçe ${companyMoney(budget.budgetAmountMinor, currencyCode)}`;
  const commitmentText = budget.committedAmountMinor == null
    ? "onaylı sözleşme taahhüdü doğrulanamadı"
    : `onaylı sözleşme taahhüdü ${companyMoney(budget.committedAmountMinor, currencyCode)}`;
  const remainingText = budget.remainingBudgetMinor == null
    ? "kalan bütçe hesaplanamadı"
    : budget.remainingBudgetMinor < 0
      ? `kalan bütçe ${companyMoney(budget.remainingBudgetMinor, currencyCode)} açık veriyor`
      : `kalan bütçe ${companyMoney(budget.remainingBudgetMinor, currencyCode)}`;
  const offerText = offer.amountMinor == null
    ? "Seçili teklif tutarı doğrulanamadı"
    : `teklif ${companyMoney(offer.amountMinor, offer.currencyCode || currencyCode)}`;
  const offerQualifier = offer.status === "READY"
    ? `Kabul edilirse olası kalan bütçe ${companyMoney(offer.possibleRemainingBudgetMinor, currencyCode)} olur.`
    : `${offer.reason || "Teklifin tam dönem bütçe etkisi hesaplanmadı."} Bu tutar kesin taahhüt veya gerçekleşmiş harcama değildir.`;
  const historyText = history.status === "READY"
    ? `${history.comparableCount} karşılaştırılabilir geçmiş satın alma kaydı bulundu.`
    : (history.reason || "Karşılaştırılabilir geçmiş satın alma kaydı bulunamadı; tarihsel fiyat karşılaştırması yapılmadı.");
  const comparisonText = Array.isArray(comparison.candidates) && comparison.candidates.length
    ? `Karşılaştırılan ROOM teklifleri: ${comparison.candidates.map((candidate) => {
      const amount = companyMoney(candidate.amountMinor, candidate.currencyCode || currencyCode);
      const remaining = candidate.possibleRemainingBudgetMinor == null
        ? "olası kalan bütçe hesaplanmadı"
        : `olası kalan bütçe ${companyMoney(candidate.possibleRemainingBudgetMinor, currencyCode)}`;
      return `${candidate.providerName} ${amount} (${remaining})`;
    }).join("; ")}. Bu tutarlar kesin taahhüt veya gerçekleşmiş harcama değildir.`
    : "Karşılaştırılabilir ROOM teklifi bulunamadı; fiyat uydurmuyorum.";
  let resultText;
  if (kind === "FINANCIAL_EVIDENCE_STATUS") {
    resultText = `${budgetText}; ${commitmentText}; ${remainingText}.`;
  } else if (kind === "HISTORY_PRICE" || kind === "OFFER_VS_HISTORY" || kind === "NO_HISTORY") {
    resultText = `${historyText} ${budgetText}; ${commitmentText}; ${remainingText}.`;
    if (kind === "NO_HISTORY") resultText += " Geçmiş anlaşma olmadan piyasa fiyatı uydurmuyorum; mevcut teklif varsa yalnız bütçe etkisini açıklayabilirim.";
  } else if (kind === "ACCEPTANCE_BUDGET_EFFECT") {
    resultText = `${budgetText}; ${commitmentText}; ${remainingText}. ${offerText}. ${offerQualifier}`;
  } else if (kind === "COMMITMENT_BUDGET_STATUS") {
    const overrunText = budget.remainingBudgetMinor == null
      ? "Taahhüdün bütçeyi aşıp aşmadığı kesinleştirilemedi."
      : budget.remainingBudgetMinor < 0
        ? `Taahhüt bütçeyi ${companyMoney(Math.abs(budget.remainingBudgetMinor), currencyCode)} aşıyor.`
        : "Taahhüt mevcut bütçe içinde görünüyor.";
    resultText = `${budgetText}; ${commitmentText}; ${remainingText}. ${overrunText} Bu fark gerçekleşmiş zarar, fatura veya ödeme değildir.`;
  } else if (kind === "OFFER_COMPARISON") {
    resultText = `${budgetText}; ${commitmentText}; ${remainingText}. ${comparisonText}`;
  } else {
    resultText = `${budgetText}; ${commitmentText}; ${remainingText}. ${offerText}. ${offerQualifier}`;
    if (kind === "OFFER_BUDGET_FIT" && budget.remainingBudgetMinor != null && budget.remainingBudgetMinor < 0) {
      resultText += ` Bu bağlamda mevcut taahhüt bütçeyi ${companyMoney(Math.abs(budget.remainingBudgetMinor), currencyCode)} aşıyor; teklif tutarı gerçekleşmiş harcama veya ödeme değildir.`;
    }
  }
  const financialEvidenceText = companyFinancialEvidenceText(commitmentSummary, currencyCode, historicalFinancialEvidence);
  if (financialEvidenceText) resultText += ` ${financialEvidenceText}`;
  resultText += " Bu değerlendirme salt okunurdur; bütçe, teklif veya sözleşme kaydı değiştirilmedi.";
  return {
    status: advisory?.status || "NOT_PROVEN",
    resultText,
    reasonText: historyText,
    recommendation: offer.status === "NOT_PROVEN"
      ? "Teklifin hizmet dönemi ve kapsamı tamamlanmadan kesin bütçe sonucu verme."
      : "Kararı vermeden önce aynı dönem ve kapsamı COMPANY yetkilisi olarak doğrula.",
    writeAction: false,
    readOnly: true,
    noRoomInternalCost: true,
    noRoomMargin: true,
  };
}

export function buildPlatformHistoricalReferenceClosedResponse({ baseResponse = {}, user = {}, screenContext = null, platformReference = null } = {}) {
  const ready = platformReference?.available === true && String(platformReference?.state || "").toUpperCase() === "AVAILABLE";
  const controlledDemoOnly = platformReference?.controlledDemoOnly === true;
  const averageAmountMinor = integer(platformReference?.averageAmountMinor ?? platformReference?.valueMinor);
  const rangeMinMinor = integer(platformReference?.range?.minMinor);
  const rangeMaxMinor = integer(platformReference?.range?.maxMinor);
  const reply = ready
    ? controlledDemoOnly
      ? `Kontrollü DEMO kanıtında SeferPakt'ta benzer işler ortalama ${formatMoneyMinor(averageAmountMinor, platformReference?.currencyCode || "TRY")} seviyesinde anlaşılmış; kanıtlanan aralık ${formatMoneyMinor(rangeMinMinor, platformReference?.currencyCode || "TRY")}–${formatMoneyMinor(rangeMaxMinor, platformReference?.currencyCode || "TRY")}. Bu sonuç yalnızca işaretli DEMO ROOM kayıtlarının anonim toplulaştırılmış test sonucudur; canlı platform ortalaması veya rakip bilgisi değildir.`
      : `Onaylı platform referansında benzer işler ortalama ${formatMoneyMinor(averageAmountMinor, platformReference?.currencyCode || "TRY")} seviyesinde anlaşılmış.`
    : "SeferPakt geneli geçmiş anlaşma fiyat referansı şu anda kapalı. Onaylı karşılaştırılabilirlik politikası, yeterli anonim ve bağımsız ROOM örneklemi, yeniden-kimliklendirme ve rekabet uygunluğu kanıtlanmadan canlı ortalama veya rakip bilgisi göstermiyorum.";
  return {
    ok: true,
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    generatedAt: new Date().toISOString(),
    intent: baseResponse.intent || "CHAT_HELP",
    intentLabel: "Platform geçmiş anlaşma referansı",
    entityType: baseResponse.entityType || "screen",
    entityId: Number(baseResponse.entityId || 0),
    entityLabel: screenContext?.label || baseResponse.entityLabel || "Sefer Abi",
    provider: "local-platform-reference-gate",
    providerSummary: ready ? "platform-agreement-reference-gated" : "platform-agreement-reference-fail-closed",
    mode: "RULE_BASED",
    scope: {
      role: String(user?.role || ""),
      roomId: user?.roomId ?? null,
      companyId: user?.companyId ?? null,
      summary: ready
        ? controlledDemoOnly
          ? "Yalnız işaretli kontrollü DEMO kayıtları anonim toplulaştırılmış test kanıtı olarak gösterildi; canlı platform ortalaması kapalıdır."
          : "Onaylı politika ve anonim örneklem kapısı geçti; yalnız toplulaştırılmış değer gösterildi."
        : "Platform geneli toplulaştırma yalnız onaylı politika ve anonim örneklem kapısı geçerse açılır.",
    },
    reply,
    summary: reply,
    contextSummary: "Platform geçmiş anlaşma referansı canlı olarak etkin değil.",
    questionType: "PLATFORM_HISTORICAL_REFERENCE",
    activeTopic: "PLATFORM_HISTORICAL_REFERENCE",
    assistantIntent: "PLATFORM_HISTORICAL_REFERENCE",
    platformReference: {
      status: ready ? "READY" : "NOT_PROVEN",
      liveAverageEnabled: ready && !controlledDemoOnly,
      demoAverageEnabled: ready && controlledDemoOnly,
      averageAmountMinor: ready ? averageAmountMinor : null,
      range: ready ? platformReference?.range || null : null,
      sampleCount: ready ? platformReference?.sampleCount ?? null : 0,
      distinctRoomCount: ready ? platformReference?.distinctRoomCount ?? null : 0,
      controlledDemoOnly,
      reason: ready ? null : "APPROVED_POLICY_AND_ANONYMOUS_SAMPLE_NOT_PROVEN",
      aggregatedOnly: true,
      rawTenantDataExposed: false,
    },
    authorizedRecords: [],
    retrievedFacts: [
      ...(ready
        ? [controlledDemoOnly ? "Kontrollü DEMO ortalaması ve aralığı gösterildi; canlı ortalama etkinleştirilmedi." : "Onaylı toplulaştırılmış platform referansı gösterildi."]
        : ["Canlı platform ortalaması gösterilmedi.", "Onaylı politika ve yeterli anonim/bağımsız ROOM örneklemi doğrulanmadı."]),
      "Rakip veya ham tenant verisi paylaşılmadı.",
    ],
    responseSections: [{ title: "Sonuç", body: reply }],
    dataSources: ["platform geçmiş anlaşma referansı fail-closed kapısı"],
    reasoning: ready
      ? controlledDemoOnly
        ? "Kontrollü DEMO protokolü; canonical kabul audit zinciri, karşılaştırılabilir boyutlar, bağımsız ROOM çeşitliliği ve anonimlik kapısı geçildi. Canlı veri yolu etkinleştirilmedi."
        : "Onaylı politika ve anonim toplulaştırma kapısı geçildi; ham tenant ayrıntısı açılmadı."
      : "Politika ve veri hazır olma koşulları kanıtlanmadığı için toplulaştırma yürütülmedi; sayı, ortalama veya rakip bilgisi uydurulmadı.",
    nextAction: ready && controlledDemoOnly
      ? "Bu değeri yalnız kontrollü DEMO kabulü olarak yorumla; canlı ortalamayı ayrıca onaylı politika ve gerçek veriyle değerlendir."
      : "Onaylı politika ve yeterli anonim/bağımsız ROOM kanıtı oluşmadan canlı referansı etkinleştirme.",
    safeNextStep: ready && controlledDemoOnly
      ? "DEMO etiketini koru; canlı ortalamayı kapalı tut ve ROOM'un kendi maliyet/teklif kanıtlarını ayrı değerlendir."
      : "Canlı ortalamayı kapalı tut ve yalnız kanıtlanmış ROOM/COMPANY finans değerlerini kullan.",
    roleBoundary: "Platform geneli ham tenant, ROOM kimliği veya rekabet bilgisi açığa çıkarılmadı.",
    readOnly: true,
    writeAction: false,
    persisted: false,
    safety: { readOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    quickActions: [],
    semanticPlan: baseResponse.semanticPlan || null,
    conversationRoute: baseResponse.conversationRoute || null,
    dialogueTopic: baseResponse.dialogueTopic || null,
  };
}

function metricIdentityFromText(text, previous = null) {
  const value = normalizeText(text);
  const metricAnchors = [
    /tahmini\s+maliyet/,
    /operasyonel\s+maliyet(?:\s+tahmini)?/,
    /teklif\s+tabani/,
    /onerilen\s+minimum\s+teklif/,
    /tahmini\s+k(?:ar|â)r/,
    /planlanan\s+teklif/,
  ].filter((pattern) => pattern.test(value));
  const singleMetric = metricAnchors.length === 1;
  const explanationCue = /(?:kaynak|dayanak|hesap|temel|acikla|anlat|nedir|ne\s+kadar)/.test(value);
  if (singleMetric && /(?:operasyonel\s+maliyet|maliyet\s+tahmini.*operasyon|operasyon.*maliyet\s+tahmini)/.test(value)) {
    return "OPERATIONAL_COST_MODEL_ESTIMATE";
  }
  if (singleMetric && (explanationCue || /^(?:tahmini\s+maliyet|teklif\s+tabani)[.!?]?$/i.test(value))) {
    return "MANUAL_FINANCIAL_PREVIEW_COST";
  }
  return previous?.lastMetricIdentity || null;
}

function questionIntentFromText(text, family, continuationType = "") {
  if (continuationType === "ALTERNATIVE") return "ALTERNATIVE_EXPLANATION";
  if (/(?:gerçekleşen|gerceklesen|actual)[^.!?\n]{0,48}(?:tahmin|tahmini|planlama|planlanan|estimate)[^.!?\n]{0,48}(?:fark|karşılaştır|karsilastir|değiş|degis)/iu.test(text)
    || /(?:tahmin|tahmini|planlama|planlanan|estimate)[^.!?\n]{0,48}(?:gerçekleşen|gerceklesen|actual)[^.!?\n]{0,48}(?:fark|karşılaştır|karsilastir|değiş|degis)/iu.test(text)) return "ACTUAL_VS_ESTIMATE";
  if (/(?:alternatif|seçenek|secenek).*(?:neden|niçin|nicin|daha iyi)|(?:neden|niçin|nicin).*(?:alternatif|seçenek|secenek)/.test(text)) return "ALTERNATIVE_EXPLANATION";
  // An explicit risk request must stay a risk assessment even when the
  // Turkish verb "sırala" also matches the route-ranking cue below.
  if (/(?:riskli|risk|tehlike|sakınca|sakinca)/.test(text)) return "RISK_SUMMARY";
  // A request that names vehicle alternatives is owned by the canonical
  // vehicle-plan comparison, even when it also asks to compare routes. The
  // generic route ranking only knows already-recorded routes and would hide
  // the selected planning scenario behind an unrelated historical shift.
  if (/(?:minibüs|minibus|midibüs|midibus|otobüs|otobus|araç\s+planı|arac\s+plani|kaç\s+araç|kac\s+arac|hangi\s+araç|hangi\s+arac)/.test(text)
    && /(?:karşılaştır|karsilastir|rota|maliyet|plan|uygun|mantıklı|mantikli|öner|oner)/.test(text)) return "VEHICLE_RECOMMENDATION";
  if (/(?:en pahalı|en pahali|hangisi daha pahalı|hangisi daha pahali|rota.*hang|hang.*rota|karşılaştır|karsilastir|sıral|sirala)/.test(text)) return "MULTI_ROUTE_RANKING";
  if (/(?:nereden.*tasarruf|tasarruf.*nereden|maliyeti düşür|maliyeti dusur|ucuzlat|azaltabilirim)/.test(text)) return "SAVINGS_OPPORTUNITY";
  if (/(?:sözleşme|sozlesme|anlaşma|anlasma).*(?:kâr|kar|kârlı|karli|zarar|kazanç|kazanc)|(?:kâr|kar|kârlı|karli).*(?:sözleşme|sozlesme|anlaşma|anlasma)/.test(text)) return "CONTRACT_PROFITABILITY";
  if (/(?:kaç araç|kac arac|hangi araç|hangi arac|araç.*mantıklı|arac.*mantikli|araç.*öner|arac.*oner)/.test(text)) return "VEHICLE_RECOMMENDATION";
  if (/(?:neden.*aş|neden.*as|üstüne.*çık|ustune.*cik|bütçe.*aş|butce.*as)/.test(text)) return "BUDGET_OVERRUN";
  if (/(?:hangi maliyet|hangi kalem|artmış|artmis|yüksel|yuksel)/.test(text)) return "COST_DRIVER";
  if (family === "WHAT_IF_SCENARIO") return "WHAT_IF_SCENARIO";
  if (family === "OFFER_PROFITABILITY") return "OFFER_PROFITABILITY";
  return family || "BUDGET_OVERRUN";
}

function publicVehiclePlanRouteSummary(vehicleAlternatives, currencyCode = "TRY") {
  const items = Array.isArray(vehicleAlternatives?.items) ? vehicleAlternatives.items : [];
  const lines = items
    .filter((item) => item?.routePartition?.status === "READY")
    .map((item) => {
      const partition = item.routePartition;
      const vehicleLabel = item.vehicleLabel || item.vehicleType || "Araç planı";
      const vehicleCount = Number(item.requiredVehicleCount || 0);
      const routeCount = Array.isArray(partition.routes) ? partition.routes.length : 0;
      const distance = formatNumber(partition.totalDistanceKm);
      const cost = item.planningCostMinor ?? item.comparisonCostMinor ?? null;
      const costText = cost != null ? `; kısmi planlama maliyeti ${formatMoneyMinor(cost, currencyCode)}` : "";
      return `${vehicleLabel}: ${vehicleCount} araç, ${routeCount} ayrı rota, toplam ${distance} km${costText}`;
    });
  return lines.length
    ? `Rota kanıtı: ${lines.join("; ")}. Bu rotalar planlama önizlemesidir; canlı atama değildir.`
    : "";
}

export function publicVehiclePlanFleetAvailabilitySummary(vehicleAlternatives) {
  const items = Array.isArray(vehicleAlternatives?.items) ? vehicleAlternatives.items : [];
  const blocked = items.filter((item) => (
    String(item?.availability?.availabilityScope || "").toUpperCase() === "ROOM_FLEET"
    && item?.availability?.availableForPlan === false
  ));
  if (!blocked.length) return "";
  const lines = blocked.map((item) => {
    const availability = item.availability;
    const availableVehicles = Number.isSafeInteger(Number(availability.availableVehicleCount))
      ? Number(availability.availableVehicleCount)
      : "bilinmiyor";
    const availableDrivers = Number.isSafeInteger(Number(availability.availableDriverCount))
      ? Number(availability.availableDriverCount)
      : "bilinmiyor";
    const required = Number.isSafeInteger(Number(item.requiredVehicleCount))
      ? Number(item.requiredVehicleCount)
      : "bilinmiyor";
    return `${item.vehicleLabel || item.vehicleType || "Araç planı"}: ROOM filosunda ${availableVehicles} aktif araç ve ${availableDrivers} sürücü var; plan ${required} araç ve ${required} sürücü gerektiriyor, plan yayımlanmadı.`;
  });
  return `Filo uygunluğu: ${lines.join(" ")}`;
}

export function detectCostAnalysisIntent({ message = "", screenContext = null, conversationState = null } = {}) {
  const text = normalizeText(message);
  const screen = contextText(screenContext, conversationState);
  const previous = conversationState?.costAnalysisState || conversationState?.costReasoning || null;
  const followUp = isFollowUpMessage(message, conversationState);
  const recent = Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages : [];
  const recentFamily = [...recent].reverse()
    .filter((item) => item?.role === "user")
    .map((item) => familyFromText(normalizeText(item?.text)))
    .find(Boolean) || "";
  const family = familyFromText(text) || (followUp ? String(previous?.lastIntentFamily || recentFamily || "") : "");
  const continuationType = continuationTypeFromText(message);
  const recentMetricIdentity = [...recent].reverse()
    .filter((item) => item?.role === "user")
    .map((item) => metricIdentityFromText(normalizeText(item?.text), null))
    .find(Boolean) || null;
  const metricIdentity = metricIdentityFromText(text, previous) || recentMetricIdentity;
  const financialScreen = FINANCIAL_PATH_PATTERN.test(screen) || /(?:bütçe|butce|servis maliyeti|teklif ve kârlılık|teklif ve karlilik)/.test(screen);
  const visibleFinanceStarter = financialScreen
    && Array.isArray(screenContext?.uiHints?.visibleSuggestions)
    && screenContext.uiHints.visibleSuggestions.some((item) => normalizeText(item) === text);
  const canonicalFinanceStarter = /^(?:bu servisin maliyeti ne\?|bu rakam nereden geliyor\?|bu vardiyanın kilometresi neden eksik\?|bu bilgiyi nereden tamamlayabilirim\?|bu ay ne kadar giderim var\?|hangi giderler dağıtılmamış\?|bu aracın giderleri neler\?|bu servise hangi araç daha uygun\?|midibüs yerine otobüs kullansam ne değişir\?|yakıt fiyatı artarsa maliyet ne olur\?|bu hizmetten ne kadar kazanıyorum\?|gerçekleşen giderle tahmin arasındaki fark ne\?|teklif neden bu vardiyaya ait değil\?|sıradaki doğru işlem ne\?)$/iu.test(String(message || "").trim());
  const directRoomDecisionQuestion = financialScreen
    && /(?:bu\s+arac|bu\s+aracla|bu\s+sozlesme|bu\s+anlasma)[^.!?\n]{0,120}(?:bu\s+ay|ay)[^.!?\n]{0,80}(?:para\s+kazan|kar|zarar|kazanc|ettim)/iu.test(text);
  const isCostAnalysis = Boolean(family)
    || visibleFinanceStarter
    || (financialScreen && canonicalFinanceStarter)
    || directRoomDecisionQuestion
    || (financialScreen && /(?:maliyet|bütçe|butce|teklif|kâr|kar|senaryo|veri|güven|guven|referans|pahalı|pahali|risk|tasarruf|alternatif|araç|arac)/.test(text));
  if (!isCostAnalysis) {
    return { isCostAnalysis: false, family: "", intent: "", questionIntent: "", continuationType: "", confidence: 0, isFollowUp: false, matchedSignals: [] };
  }
  const intent = {
    BUDGET_COST: "BÜTÇE_VE_MALİYETİ_AÇIKLA",
    OFFER_PROFITABILITY: "TEKLİF_VE_KÂRLILIĞI_AÇIKLA",
    ROUTE_OPERATION: "OPERASYONEL_MALİYETİ_AÇIKLA",
    WHAT_IF_SCENARIO: "SENARYO_ETKİSİNİ_KARŞILAŞTIR",
    DATA_CONFIDENCE: "VERİ_VE_GÜVENİ_AÇIKLA",
  }[family] || "BÜTÇE_VE_MALİYETİ_AÇIKLA";
  const questionIntent = questionIntentFromText(text, family, continuationType);
  return {
    isCostAnalysis: true,
    family: COST_REASONING_INTENT_FAMILIES.includes(family) ? family : "BUDGET_COST",
    intent,
    questionIntent: COST_REASONING_QUESTION_INTENTS.includes(questionIntent) ? questionIntent : "BUDGET_OVERRUN",
    confidence: family ? (followUp ? 0.86 : 0.93) : 0.58,
    isFollowUp: followUp,
    continuationType,
    metricIdentity,
    matchedSignals: unique([
      family,
      financialScreen ? "FINANCIAL_SCREEN_CONTEXT" : "COST_LANGUAGE",
      followUp ? "FOLLOW_UP_CONTEXT" : "DIRECT_COST_QUESTION",
    ]),
  };
}

function numberAfter(text, pattern) {
  const match = String(text || "").match(pattern);
  return match ? finiteNumber(String(match[1]).replace(",", ".")) : null;
}

function moneyMinorAfter(text, pattern) {
  const match = String(text || "").match(pattern);
  if (!match) return null;
  const raw = String(match[1] || "").replace(/\s/g, "");
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(",")) {
    normalized = raw.split(",")[1]?.length === 2
      ? raw.replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (raw.includes(".")) {
    normalized = raw.split(".")[1]?.length === 2
      ? raw
      : raw.replace(/\./g, "");
  }
  const major = Number(normalized);
  return Number.isSafeInteger(Math.round(major * 100)) && major > 0
    ? Math.round(major * 100)
    : null;
}

export function extractScenarioOverrides(message, baselineInput = {}) {
  const text = normalizeText(message);
  const overrides = {};
  if (/(?:midibus|midibüs)[^.!?\n]{0,40}(?:yerine|yerine)[^.!?\n]{0,16}(?:otobus|otobüs)/.test(text)
    || /(?:otobus|otobüs)[^.!?\n]{0,40}(?:yerine|yerine)[^.!?\n]{0,16}(?:midibus|midibüs)/.test(text)) {
    const targetIsBus = /(?:midibus|midibüs)[^.!?\n]{0,40}(?:yerine)[^.!?\n]{0,16}(?:otobus|otobüs)/.test(text);
    overrides.vehicleType = targetIsBus ? "OTOBUS" : "MIDIBUS";
  }
  const vehicleCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*araç(?:la|lık|lik)?/);
  const vehicleSet = numberAfter(text, /(?:araç sayısını|arac sayisini|araç sayısı|arac sayisi)\s*(?:ayı|ayi|olarak|=)?\s*(\d+(?:[.,]\d+)?)/);
  if (vehicleSet !== null) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleSet));
  else if (vehicleCount !== null && /(?:\d+\s*araçla|\d+\s*araçlık|\d+\s*aracla|\d+\s*araclik)/.test(text)) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleCount));

  const capacityVehicle = text.match(/(\d+(?:[.,]\d+)?)\s*kisilik\s*(minibus|midibus|otobus)(?:le|la)?\b/);
  if (capacityVehicle) {
    const capacity = finiteNumber(String(capacityVehicle[1]).replace(",", "."));
    const vehicleType = { minibus: "MINIBUS", midibus: "MIDIBUS", otobus: "OTOBUS" }[capacityVehicle[2]];
    if (capacity !== null) {
      overrides.passengerCount = Math.max(0, Math.trunc(capacity));
      overrides.vehicleCapacity = Math.max(1, Math.trunc(capacity));
      overrides.vehicleType = vehicleType;
    }
  }
  const passengerCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:kişi|kisi|öğrenci|ogrenci|yolcu)/);
  if (passengerCount !== null) {
    const relativePassengerChange = /\b(?:daha|ek|art(?:arsa|ir|ir)|gel(?:irse|ir))\b/.test(text);
    const baselinePassengerCount = finiteNumber(baselineInput?.passengerCount);
    overrides.passengerCount = relativePassengerChange && baselinePassengerCount !== null
      ? Math.max(0, Math.trunc(baselinePassengerCount + passengerCount))
      : Math.max(0, Math.trunc(passengerCount));
  }
  const stopCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*durak/);
  if (stopCount !== null) overrides.stopCount = Math.max(0, Math.trunc(stopCount));
  const emptyDistance = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*km\s*bos\s*(?:kilometre|km)\b/)
    ?? numberAfter(text, /bos\s*(?:kilometre|km)\s*(\d+(?:[.,]\d+)?)/);
  if (emptyDistance !== null) overrides.emptyDistanceKm = Math.max(0, emptyDistance);
  const distance = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*km/);
  if (distance !== null && /(?:mesafe|rota|km)/.test(text)) {
    overrides.serviceDistanceKm = Math.max(0, distance);
    const totalDistance = overrides.emptyDistanceKm !== undefined
      ? distance + overrides.emptyDistanceKm
      : /tek\s*yon/.test(text)
        ? distance * 2
        : distance;
    overrides.totalDistanceKm = Math.max(0, totalDistance);
  }
  const duration = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:dakika|dk)/);
  const baseDuration = finiteNumber(baselineInput?.routeDurationMinutes);
  if (duration !== null && /(?:süre|sure|dakika|dk)/.test(text)) {
    overrides.routeDurationMinutes = /(?:artır|artir|uzat|fazla)/.test(text) && baseDuration !== null
      ? Math.max(0, baseDuration + duration)
      : Math.max(0, duration);
  }
  const serviceDays = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:gün|gun)\b/);
  if (serviceDays !== null) overrides.serviceDayCount = Math.max(0, Math.trunc(serviceDays));
  if (overrides.serviceDayCount > 1 && /(?:günlük|gunluk|günde|gunde|ayda|sabah\s+aksam)/.test(text)) {
    overrides.dailyServiceScope = "DAILY";
  }
  if (/(?:sabah\s+aksam|sabah\s+aksam)/.test(text)) {
    overrides.shiftCount = 2;
    overrides.tripCount = 2;
  }
  if (/(?:yakıt|yakit|akaryakıt|akaryakit).*(?:piyasa|referans)|(?:piyasa|referans).*?(?:yakıt|yakit|akaryakıt|akaryakit)/.test(text)) {
    overrides.useExternalFuelPrice = true;
  }
  const driverMonthlyCostMinor = moneyMinorAfter(
    text,
    /(?:aylik)[^.!?\n]{0,100}(?:surucu|sofor)[^.!?\n]{0,100}(?:maliyet|gider)[^0-9]{0,16}([\d.,\s]+)\s*(?:tl|lira)/,
  ) ?? moneyMinorAfter(
    text,
    /(?:surucu|sofor)[^.!?\n]{0,100}(?:aylik)[^.!?\n]{0,100}(?:maliyet|gider)[^0-9]{0,16}([\d.,\s]+)\s*(?:tl|lira)/,
  );
  if (driverMonthlyCostMinor !== null) overrides.driverMonthlyCostMinor = driverMonthlyCostMinor;
  return overrides;
}

export function materializeIndependentRoutePeriodOverrides(overrides = {}) {
  const next = { ...(overrides || {}) };
  if (String(next.dailyServiceScope || "").toUpperCase() !== "DAILY") {
    const driverMonthlyCostMinor = finiteNumber(next.driverMonthlyCostMinor);
    const totalShiftCount = finiteNumber(next.shiftCount);
    if (driverMonthlyCostMinor !== null && driverMonthlyCostMinor > 0 && totalShiftCount !== null && totalShiftCount > 0) {
      next.driverBasePerShiftMinor = Math.round(driverMonthlyCostMinor / totalShiftCount);
      delete next.driverMonthlyCostMinor;
    }
    return next;
  }
  const serviceDays = finiteNumber(next.serviceDayCount);
  if (serviceDays === null || serviceDays <= 1) return next;
  const days = Math.trunc(serviceDays);
  const dailyServiceDistanceKm = finiteNumber(next.dailyServiceDistanceKm ?? next.serviceDistanceKm);
  const dailyEmptyDistanceKm = finiteNumber(next.dailyEmptyDistanceKm ?? next.emptyDistanceKm);
  const dailyTotalDistanceKm = finiteNumber(next.dailyTotalDistanceKm ?? next.totalDistanceKm);
  const dailyRouteDurationMinutes = finiteNumber(next.dailyRouteDurationMinutes ?? next.routeDurationMinutes);
  const dailyShiftCount = finiteNumber(next.dailyShiftCount ?? next.shiftCount);
  const dailyTripCount = finiteNumber(next.dailyTripCount ?? next.tripCount);
  if (dailyServiceDistanceKm !== null) next.dailyServiceDistanceKm = dailyServiceDistanceKm;
  if (dailyEmptyDistanceKm !== null) next.dailyEmptyDistanceKm = dailyEmptyDistanceKm;
  if (dailyTotalDistanceKm !== null) next.dailyTotalDistanceKm = dailyTotalDistanceKm;
  if (dailyRouteDurationMinutes !== null) next.dailyRouteDurationMinutes = dailyRouteDurationMinutes;
  if (dailyShiftCount !== null) next.dailyShiftCount = dailyShiftCount;
  if (dailyTripCount !== null) next.dailyTripCount = dailyTripCount;
  if (dailyServiceDistanceKm !== null) next.serviceDistanceKm = dailyServiceDistanceKm * days;
  if (dailyEmptyDistanceKm !== null) next.emptyDistanceKm = dailyEmptyDistanceKm * days;
  if (dailyTotalDistanceKm !== null) next.totalDistanceKm = dailyTotalDistanceKm * days;
  if (dailyRouteDurationMinutes !== null) next.routeDurationMinutes = dailyRouteDurationMinutes * days;
  if (dailyShiftCount !== null) {
    next.shiftsPerServiceDay = dailyShiftCount;
    next.shiftCount = dailyShiftCount * days;
  }
  if (dailyTripCount !== null) next.tripCount = dailyTripCount * days;
  const driverMonthlyCostMinor = finiteNumber(next.driverMonthlyCostMinor);
  const totalShiftCount = finiteNumber(next.shiftCount);
  if (driverMonthlyCostMinor !== null && driverMonthlyCostMinor > 0 && totalShiftCount !== null && totalShiftCount > 0) {
    next.driverBasePerShiftMinor = Math.round(driverMonthlyCostMinor / totalShiftCount);
    delete next.driverMonthlyCostMinor;
  }
  return next;
}

function fuelIncreasePercentFromText(message) {
  const text = normalizeText(message);
  if (!/(?:yakıt|yakit|akaryakıt|akaryakit)/.test(text)) return null;
  const value = numberAfter(text, /(?:yakıt|yakit|akaryakıt|akaryakit)[^\d]{0,24}(\d+(?:[.,]\d+)?)\s*%/);
  return value !== null && value >= 0 && value <= 200 ? value : null;
}

function applyFuelIncreaseOverride(overrides, message, baselineInput, reference) {
  const percent = fuelIncreasePercentFromText(message);
  if (percent === null) return { overrides, percent: null, applied: false };
  const baselinePrice = finiteNumber(baselineInput?.fuelUnitPriceMinor)
    ?? finiteNumber(reference?.selected?.valueMinor)
    ?? finiteNumber(reference?.layers?.find((layer) => layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.available)?.valueMinor);
  if (baselinePrice === null) return { overrides, percent, applied: false };
  return {
    overrides: {
      ...overrides,
      fuelUnitPriceMinor: Math.max(0, Math.round(baselinePrice * (1 + (percent / 100)))),
    },
    percent,
    applied: true,
  };
}

function financialPreviewInputs(baseline) {
  const budget = baseline?.budgetEvidence || {};
  const actual = baseline?.actualEvidence || {};
  return {
    currencyCode: baseline?.input?.currencyCode || "TRY",
    budgetAmountMinor: budget.budgetAmountMinor ?? null,
    approvedBudgetAmountMinor: budget.status === "ACTIVE" ? budget.budgetAmountMinor ?? null : null,
    budgetApprovalState: budget.approvalState || (budget.status === "ACTIVE" ? "approved" : "draft"),
    budgetSource: budget.source || null,
    periodStart: budget.periodStart || null,
    periodEnd: budget.periodEnd || null,
    actualServiceSpendMinor: actual.actualCostMinor ?? null,
  };
}

function summarizeCompanyAgreementMetrics(agreement) {
  const shifts = Array.isArray(agreement?.shifts) ? agreement.shifts : [];
  const serviceDates = new Set(shifts.map((shift) => {
    const date = new Date(shift?.startAt || "");
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }).filter(Boolean));
  const distanceKm = shifts.reduce((sum, shift) => {
    const distanceM = Number(shift?.routeSnapshotDistanceM);
    return Number.isFinite(distanceM) && distanceM >= 0 ? sum + distanceM / 1000 : sum;
  }, 0);
  const vehicle = agreement?.vehicle || shifts.find((shift) => shift?.vehicle)?.vehicle || null;
  return {
    serviceDays: serviceDates.size || null,
    shiftCount: shifts.length || null,
    distanceKm: distanceKm > 0 ? Number(distanceKm.toFixed(2)) : null,
    vehicleType: vehicle?.type || null,
    vehicleCapacity: Number.isFinite(Number(vehicle?.capacity)) ? Number(vehicle.capacity) : null,
  };
}

function companyAgreementAdvisorySummary(agreement) {
  if (!agreement) return null;
  return {
    id: agreement.id,
    companyId: agreement.companyId,
    status: agreement.status,
    amountMinor: agreement.companyOfferAmount ?? null,
    currencyCode: "TRY",
    periodStart: agreement.startDate,
    periodEnd: agreement.endDate,
    metrics: summarizeCompanyAgreementMetrics(agreement),
  };
}

async function loadCanonicalFinancialEvidence({ user, baseline, screenContext = null }) {
  const scope = upper(baseline?.scope);
  const structuredFacts = screenContext?.structuredFacts || {};
  const planningVehicleId = Number(structuredFacts.selectedVehicleId || baseline?.routeShift?.vehicleId || 0) || null;
  const selectedEntityType = String(screenContext?.selectedEntityType || "").trim().toLowerCase();
  const selectedEntityId = Number(screenContext?.selectedEntityId || 0) || 0;
  const routeBoundAgreementId = selectedEntityType === "agreement" ? selectedEntityId : 0;
  const routeBoundShiftId = selectedEntityType === "shift" ? selectedEntityId : 0;
  const selectedAgreementIdFromFacts = Number(structuredFacts.selectedAgreementId || routeBoundAgreementId || 0) || 0;
  const selectedOfferIdFromFacts = Number(structuredFacts.selectedOfferId || 0) || 0;
  const selectedBudgetPlanIdFromFacts = Number(structuredFacts.selectedBudgetPlanId || structuredFacts.budgetPlanId || 0) || 0;
  const selectedAgreementId = Number(selectedAgreementIdFromFacts || baseline?.source?.agreementId || baseline?.routeShift?.agreementId || 0) || 0;
  const [company, room, agreement, quoteDraft, roomPlanningVehicle, shiftOffer, companyBudgetPlanOverview, companyOfferCandidates, companyAgreementHistory, roomAgreementHistory] = await Promise.all([
    baseline?.companyId
      ? prisma.company.findUnique({
        where: { id: Number(baseline.companyId) },
        select: { id: true, name: true, kind: true, region: { select: { name: true } } },
      })
      : null,
    baseline?.roomId
      ? prisma.room.findUnique({
        where: { id: Number(baseline.roomId) },
        select: { id: true, name: true, status: true, region: { select: { name: true } } },
      })
      : null,
    scope === "ROOM" && baseline?.roomId
      ? prisma.agreement.findFirst({
        where: {
          roomId: Number(baseline.roomId),
          ...(selectedAgreementId > 0 ? { id: selectedAgreementId } : {}),
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true, companyId: true, roomId: true, status: true, startDate: true, endDate: true,
          companyOfferAmount: true, roomOfferAmount: true, companyOfferNote: true, roomOfferNote: true, updatedAt: true,
          roomCostEntries: {
            where: { recordKind: "ACTUAL", lifecycle: "CONFIRMED" },
            select: { amountMinor: true, currencyCode: true, recordKind: true, lifecycle: true },
          },
          room: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, kind: true } },
          vehicle: { select: { id: true, type: true, capacity: true } },
          shifts: {
            where: { status: { not: "DRAFT" } },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            take: 400,
            select: {
              id: true, status: true, startAt: true, endAt: true,
              routeSnapshotDistanceM: true, routeSnapshotDurationSec: true,
              routeSnapshotInputHash: true,
            },
          },
        },
      })
      : baseline?.companyId
        ? prisma.agreement.findFirst({
          where: {
            companyId: Number(baseline.companyId),
            ...(selectedAgreementId > 0 ? { id: selectedAgreementId } : {}),
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: {
            id: true, companyId: true, roomId: true, status: true, startDate: true, endDate: true,
            companyOfferAmount: true, roomOfferAmount: true, companyOfferNote: true, roomOfferNote: true, updatedAt: true,
            room: { select: { id: true, name: true } },
            company: { select: { id: true, name: true, kind: true } },
            vehicle: { select: { type: true, capacity: true } },
            shifts: {
              where: { status: { not: "DRAFT" } },
              orderBy: [{ startAt: "asc" }, { id: "asc" }],
              take: 400,
              select: {
                id: true, status: true, startAt: true, endAt: true,
                routeSnapshotDistanceM: true, routeSnapshotDurationSec: true,
                vehicle: { select: { type: true, capacity: true } },
                requiredPaxOverride: true,
                _count: { select: { stops: true, people: true } },
              },
            },
          },
        })
        : null,
    scope === "ROOM" && baseline?.roomId ? getCurrentRoomQuoteFloorDraft(Number(baseline.roomId)) : null,
    scope === "ROOM" && baseline?.roomId && planningVehicleId
      ? prisma.vehicle.findFirst({
        where: { id: planningVehicleId, roomId: Number(baseline.roomId) },
        select: { id: true, type: true, capacity: true, status: true, driverId: true },
      })
      : null,
    baseline?.routeShift?.id && baseline?.routeShift?.roomId
      ? prisma.shiftOffer.findFirst({
        where: { shiftId: Number(baseline.routeShift.id), roomId: Number(baseline.routeShift.roomId) },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { id: true, shiftId: true, roomId: true, status: true, amountCompany: true, amountRoom: true, createdAt: true, updatedAt: true },
      })
      : null,
    scope === "COMPANY" && baseline?.companyId ? getCompanyBudgetPlanOverview(Number(baseline.companyId)) : null,
    scope === "COMPANY" && baseline?.companyId
      ? prisma.shiftOffer.findMany({
        where: {
          status: { in: ["OPEN", "COUNTERED", "ACCEPTED", "CANCELLED"] },
          shift: { companyId: Number(baseline.companyId) },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 400,
        select: {
          id: true, shiftId: true, roomId: true, status: true,
          amountCompany: true, amountRoom: true,
          room: { select: { id: true, name: true } },
          shift: {
            select: {
              id: true, companyId: true, agreementId: true, status: true,
              startAt: true, endAt: true, routeSnapshotDistanceM: true,
              routeSnapshotDurationSec: true, requiredPaxOverride: true,
              vehicle: { select: { type: true, capacity: true } },
            },
          },
        },
      })
      : [],
    scope === "COMPANY" && baseline?.companyId
      ? prisma.agreement.findMany({
        where: { companyId: Number(baseline.companyId), status: { in: ["APPROVED", "ACTIVE", "DONE"] } },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true, companyId: true, roomId: true, status: true,
          startDate: true, endDate: true, companyOfferAmount: true,
          vehicle: { select: { type: true, capacity: true } },
          shifts: {
            where: { status: { not: "DRAFT" } },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            take: 400,
            select: {
              id: true, status: true, startAt: true, endAt: true,
              routeSnapshotDistanceM: true, routeSnapshotDurationSec: true,
              vehicle: { select: { type: true, capacity: true } },
              requiredPaxOverride: true,
            },
          },
        },
      })
      : [],
    scope === "ROOM" && baseline?.roomId
      ? prisma.agreement.findMany({
        where: { roomId: Number(baseline.roomId), status: { in: ["APPROVED", "ACTIVE", "DONE"] } },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true, companyId: true, roomId: true, status: true,
          startDate: true, endDate: true, weekMask: true, pattern: true, direction: true,
          companyOfferAmount: true, roomOfferAmount: true,
          roomCostEntries: {
            where: { recordKind: "ACTUAL", lifecycle: "CONFIRMED" },
            select: { amountMinor: true, currencyCode: true, recordKind: true, lifecycle: true },
          },
          vehicle: { select: { id: true, type: true, capacity: true } },
          shifts: {
            where: { status: { not: "DRAFT" } },
            orderBy: [{ startAt: "asc" }, { id: "asc" }],
            take: 400,
            select: {
              id: true, status: true, startAt: true, endAt: true,
              routeSnapshotDistanceM: true, routeSnapshotDurationSec: true,
              routeSnapshotInputHash: true,
            },
          },
        },
      })
      : [],
  ]);
  const quoteDraftShiftId = Number(
    quoteDraft?.inputSnapshot?.serviceContext?.shiftId
      || quoteDraft?.inputSnapshot?.serviceContext?.sourceShiftId
      || 0,
  ) || null;

  const roomCommercialAgreementIds = [agreement, ...(roomAgreementHistory || [])]
    .map((item) => Number(item?.id))
    .filter((id, index, all) => Number.isSafeInteger(id) && id > 0 && all.indexOf(id) === index);
  const roomCommercialAuditLogs = scope === "ROOM" && roomCommercialAgreementIds.length
    ? await prisma.auditLog.findMany({
      where: { entity: "Agreement", entityId: { in: roomCommercialAgreementIds } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, entityId: true, action: true, meta: true, createdAt: true },
    })
    : [];
  const roomAuditByAgreementId = new Map();
  for (const log of roomCommercialAuditLogs) {
    const id = Number(log.entityId);
    if (!roomAuditByAgreementId.has(id)) roomAuditByAgreementId.set(id, []);
    roomAuditByAgreementId.get(id).push(log);
  }
  const agreementWithCommercialEvidence = agreement
    ? {
      ...agreement,
      auditLogs: roomAuditByAgreementId.get(Number(agreement.id)) || [],
      actualCostEntries: Array.isArray(agreement.roomCostEntries) ? agreement.roomCostEntries : [],
    }
    : null;
  const roomAgreementHistoryWithEvidence = (roomAgreementHistory || []).map((item) => ({
    ...item,
    auditLogs: roomAuditByAgreementId.get(Number(item.id)) || [],
    actualCostEntries: Array.isArray(item.roomCostEntries) ? item.roomCostEntries : [],
  }));

  const selectedShiftIdFromFacts = Number(
    structuredFacts.selectedShiftId
      || routeBoundShiftId
      || ((!structuredFacts.selectedAgreementId && !routeBoundAgreementId) ? quoteDraftShiftId : 0)
      || 0,
  ) || null;
  const selectedAgreementIdFromFactsForContext = selectedAgreementIdFromFacts || null;
  // A selected shift without an agreement is a valid route-planning context.
  // Do not silently attach the room's latest unrelated agreement to it.
  const agreementForContext = scope === "ROOM"
    && selectedShiftIdFromFacts
    && !selectedAgreementIdFromFactsForContext
    && !baseline?.routeShift?.agreementId
    ? null
    : agreementWithCommercialEvidence;

  const selectedCommercialEvidence = scope === "ROOM" && agreementForContext
    ? resolveAgreementCommercialEvidence({ agreement: agreementForContext, auditLogs: agreementForContext.auditLogs || [] })
    : null;
  const comparableCommercialReference = scope === "ROOM" && agreementForContext
    ? buildComparableCommercialReference({
      roomId: baseline?.roomId,
      selectedAgreement: agreementForContext,
      historicalAgreements: roomAgreementHistoryWithEvidence,
    })
    : null;

  const acceptedShiftOffer = upper(shiftOffer?.status) === "ACCEPTED" ? shiftOffer : null;
  const commercialContext = agreementForContext
    ? {
      type: "AGREEMENT",
      id: agreementForContext.id,
      status: agreementForContext.status,
      companyOfferAmount: agreementForContext.companyOfferAmount,
      roomOfferAmount: agreementForContext.roomOfferAmount,
      acceptedCommercialAmountMinor: selectedCommercialEvidence?.commercialReference?.amountMinor ?? null,
    }
    : acceptedShiftOffer
      ? { type: "ACCEPTED_SHIFT_OFFER", id: acceptedShiftOffer.id, status: acceptedShiftOffer.status, companyOfferAmount: acceptedShiftOffer.amountCompany, roomOfferAmount: acceptedShiftOffer.amountRoom }
      : { type: "NONE", id: null, status: null, companyOfferAmount: null, roomOfferAmount: null };
  const financeShift = baseline?.routeShift
    ? {
      ...baseline.routeShift,
      ...(acceptedShiftOffer ? {
        companyOfferAmount: acceptedShiftOffer.amountCompany,
        roomOfferAmount: acceptedShiftOffer.amountRoom,
      } : {}),
    }
    : baseline?.routeShift;
  const financeAgreement = agreementForContext || (acceptedShiftOffer ? {
    id: null,
    companyId: acceptedShiftOffer.companyId || baseline?.companyId || null,
    roomId: acceptedShiftOffer.roomId || baseline?.roomId || null,
    status: "ACCEPTED_SHIFT_OFFER",
    companyOfferAmount: acceptedShiftOffer.amountCompany,
    roomOfferAmount: acceptedShiftOffer.amountRoom,
  } : null);

  const currentCompanyBudgetPlan = scope === "COMPANY"
    ? selectCompanyBudgetPlanForPreview(companyBudgetPlanOverview, selectedBudgetPlanIdFromFacts)
    : null;
  const companyHistoricalFinancialEvidence = scope === "COMPANY"
    ? await getCompanyHistoricalFinancialEvidence(Number(baseline.companyId), companyAgreementHistory)
    : [];
  const companyCommitmentEvidence = scope === "COMPANY" && currentCompanyBudgetPlan?.agreementIds?.length
    ? await getCompanyBudgetAgreementEvidence(Number(baseline.companyId), currentCompanyBudgetPlan.agreementIds)
    : {};

  const hasSelectedRoomContext = scope === "ROOM"
    && (Number(structuredFacts.selectedVehicleId || 0) > 0
      || Number(structuredFacts.selectedAgreementId || 0) > 0
      || Number(structuredFacts.selectedShiftId || 0) > 0);
  const selectedVehicleId = Number(structuredFacts.selectedVehicleId || baseline?.routeShift?.vehicleId || 0) || null;
  const selectedAgreementIdForDecision = Number(structuredFacts.selectedAgreementId || selectedAgreementId || 0) || null;
  const periodStart = String(structuredFacts.periodStart || "").slice(0, 10);
  const periodEnd = String(structuredFacts.periodEnd || "").slice(0, 10);
  const validPeriod = /^\d{4}-\d{2}-\d{2}$/.test(periodStart)
    && /^\d{4}-\d{2}-\d{2}$/.test(periodEnd)
    && periodStart <= periodEnd;
  const quoteFloorInputs = hasSelectedRoomContext
    ? buildRoomQuoteFloorInputsForSelectedContext({
      selectedShiftId: selectedShiftIdFromFacts,
      selectedVehicleId,
      selectedAgreementId: selectedAgreementIdFromFactsForContext,
      structuredFacts,
      quoteDraft,
    })
    : buildRoomQuoteFloorDraftPreviewInputs(quoteDraft);
  const canonicalRoomCostInputs = hasSelectedRoomContext && baseline?.roomId
    ? await buildOperationalCostInputs({ actor: user, roomId: Number(baseline.roomId), prisma })
    : null;
  const reusableVehiclePlanningProfile = scope === "ROOM"
    && roomPlanningVehicle
    && canonicalRoomCostInputs
    && validPeriod
    ? resolveReusableVehiclePlanningProfile({
      entries: canonicalRoomCostInputs.entries || [],
      vehicleFleet: [roomPlanningVehicle],
      vehicleId: planningVehicleId,
      vehicleType: roomPlanningVehicle.type,
      targetPeriod: { periodStart, periodEnd },
    })
    : null;
  const reusableProfileInputs = reusableVehiclePlanningProfile?.status === "APPLICABLE"
    ? {
      ...reusableVehiclePlanningProfile.input,
      roomPlanningProfileEvidence: {
        ...reusableVehiclePlanningProfile,
        selectedVehicleId: planningVehicleId,
        selectedVehicleType: roomPlanningVehicle?.type || null,
        appliedFields: Object.keys(reusableVehiclePlanningProfile.input || {}),
        ownershipInputPreserved: false,
      },
    }
    : {};
  const scopedRoomCostInputs = canonicalRoomCostInputs && (selectedShiftIdFromFacts || selectedAgreementIdFromFacts)
    ? (() => {
      const scopedEntries = filterServiceCostEntriesForContext(
        canonicalRoomCostInputs.entries,
        {
          shiftId: selectedShiftIdFromFacts,
          agreementId: selectedAgreementIdFromFacts,
        },
        {
          includePending: true,
          targetShift: baseline?.routeShift || null,
        },
      ).filter((entry) => {
        const start = entry?.periodStart || entry?.occurredAt;
        const end = entry?.periodEnd || entry?.occurredAt;
        if (!validPeriod || !start || !end) return true;
        return new Date(start).getTime() <= new Date(`${periodEnd}T23:59:59.999Z`).getTime()
          && new Date(end).getTime() >= new Date(`${periodStart}T00:00:00.000Z`).getTime();
      });
      const scopedAllocation = buildCostAllocationProjection(scopedEntries, {
        requireServiceAllocationEvidence: true,
        targetAgreementId: selectedAgreementIdFromFacts || null,
        targetShiftId: selectedShiftIdFromFacts || null,
      });
      const scopedForecastAllocation = buildForecastCostAllocationProjection(
        scopedEntries.filter((entry) => ["FORECAST", "BUDGET"].includes(String(entry?.recordKind || "").toUpperCase())),
        {
          requireServiceAllocationEvidence: true,
          targetAgreementId: selectedAgreementIdFromFacts || null,
          targetShiftId: selectedShiftIdFromFacts || null,
        },
      );
      const provenEntryIds = new Set(
        scopedAllocation.lines.filter((line) => line.included).map((line) => line.entryId),
      );
      const provenEntries = scopedEntries.filter((entry) => provenEntryIds.has(entry?.id));
      const scopedAdapted = adaptLedgerEntriesToOperationalInputs(scopedEntries, {
        allocation: scopedAllocation,
      });
      const planningEvidence = buildRoomPlanningEvidence({
        entries: scopedEntries,
        allocation: scopedAllocation,
        actualEntries: provenEntries,
        summary: null,
      });
      return {
        ...canonicalRoomCostInputs,
        ...scopedAdapted,
        entries: Object.freeze(scopedEntries),
        planningEvidence: Object.freeze({
          ...planningEvidence,
          forecastAllocation: scopedForecastAllocation,
          forecastCostInputs: scopedForecastAllocation.forecastCostInputs,
        }),
        forecastAllocation: scopedForecastAllocation,
        forecastCostInputs: scopedForecastAllocation.forecastCostInputs,
      };
    })()
    : canonicalRoomCostInputs;
  const canonicalRouteInputs = buildRoomCanonicalRoutePlanningInputs(baseline?.routeShift);
  const canonicalPlanningInputs = mergeRoomCanonicalPlanningInputs({
    baselineInput: baseline?.input || {},
    quoteFloorInputs,
    reusableProfileInputs,
    canonicalRouteInputs,
  });
  const canonicalCostInputs = scopedRoomCostInputs
    ? {
        ...mergeOperationalCostInputs(canonicalPlanningInputs, scopedRoomCostInputs),
      roomCostPlanningEvidence: scopedRoomCostInputs.planningEvidence || null,
      roomCostForecastInputs: scopedRoomCostInputs.forecastCostInputs || [],
      roomCostForecastAllocation: scopedRoomCostInputs.forecastAllocation || null,
    }
    : {
        ...canonicalPlanningInputs,
    };
  const effectiveQuoteFloorInputs = {
    ...mergeRoomCanonicalPlanningInputs({
      baselineInput: {},
      quoteFloorInputs,
      reusableProfileInputs,
      canonicalRouteInputs,
    }),
  };

  const financePreview = scope === "ROOM"
    ? buildRoomProfitabilityAndQuoteFloorPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      room,
      company,
      shift: financeShift,
      agreement: financeAgreement,
      costInputs: canonicalCostInputs,
      quoteFloorInputs: effectiveQuoteFloorInputs,
    })
    : buildCompanyBudgetAndServiceCostPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      company,
      shift: financeShift,
      agreement: financeAgreement,
      budgetInputs: {
        ...financialPreviewInputs(baseline),
        ...buildCompanyBudgetPlanPreviewInputs(currentCompanyBudgetPlan),
      },
      serviceCostInputs: financialPreviewInputs(baseline),
      previewInputs: { currencyCode: baseline?.input?.currencyCode || "TRY" },
      commitmentInputs: {
        budgetPlan: currentCompanyBudgetPlan,
        agreements: currentCompanyBudgetPlan?.scope?.eligible || [],
        evidenceByAgreementId: companyCommitmentEvidence,
      },
      offerInputs: { offers: companyOfferCandidates || [] },
    });
  const companyPriceBudgetAdvisory = scope === "COMPANY"
    ? buildCompanyPriceBudgetAdvisory({
      companyId: baseline?.companyId,
      budgetPlan: currentCompanyBudgetPlan,
      commitmentSummary: financePreview?.commitmentSummary || financePreview?.companyBudget?.commitmentSummary || {},
      offerBudgetComparison: financePreview?.offerBudgetComparison || financePreview?.companyBudget?.offerBudgetComparison || {},
      selectedAgreement: companyAgreementAdvisorySummary(agreement),
      selectedOfferId: selectedOfferIdFromFacts || null,
      agreementHistory: (companyAgreementHistory || []).map(companyAgreementAdvisorySummary).filter(Boolean),
    })
    : null;

  let decisionLayer = {
    vehicleMonthDecision: null,
    contractMonthDecision: null,
    newOfferDecision: null,
  };
  if (scope === "ROOM" && baseline?.roomId && validPeriod && (selectedVehicleId || selectedAgreementIdFromFacts)) {
    const periodStartAt = new Date(`${periodStart}T00:00:00.000Z`);
    const periodEndAt = new Date(`${periodEnd}T23:59:59.999Z`);
    const [periodShifts, realizedIncomeEvidence] = await Promise.all([
      prisma.shift.findMany({
        where: {
          roomId: Number(baseline.roomId),
          ...(selectedAgreementIdFromFacts ? { agreementId: selectedAgreementIdFromFacts } : {}),
          startAt: { lt: periodEndAt },
          endAt: { gt: periodStartAt },
        },
        select: {
          id: true,
          roomId: true,
          vehicleId: true,
          driverId: true,
          agreementId: true,
          status: true,
          startAt: true,
          endAt: true,
        },
      }),
      buildRealizedIncomeEvidence({
        roomId: Number(baseline.roomId),
        periodStart,
        periodEnd,
        periodScope: "RANGE",
        prisma,
      }),
    ]);
    const roomCostInputs = scopedRoomCostInputs || canonicalRoomCostInputs || { entries: [] };
    const decisionCostEntries = Array.isArray(roomCostInputs?.entries) ? roomCostInputs.entries : [];
    const decisionShifts = Array.isArray(periodShifts) ? periodShifts : [];
    decisionLayer.vehicleMonthDecision = selectedVehicleId
      ? buildVehicleMonthDecisionSummary({
        vehicleId: selectedVehicleId,
        periodStart,
        periodEnd,
        asOfDate: new Date(),
        shifts: decisionShifts,
        incomeLines: realizedIncomeEvidence?.lines || [],
        costEntries: decisionCostEntries,
      })
      : null;
    const agreementForDecision = agreementForContext && Number(agreementForContext.id) === Number(selectedAgreementIdForDecision)
      ? agreementForContext
      : null;
    decisionLayer.contractMonthDecision = selectedAgreementIdForDecision
      ? buildContractMonthDecisionSummary({
        agreementId: selectedAgreementIdForDecision,
        periodStart,
        periodEnd,
        contractTotalMinor: agreementForDecision?.roomOfferAmount ?? agreementForDecision?.companyOfferAmount ?? null,
        realizedIncomeEvidence,
        plannedCostMinor: null,
        shiftIds: decisionShifts.map((shift) => shift.id),
        costEntries: decisionCostEntries,
      })
      : null;
  }
  const quoteFloor = financePreview?.quoteFloor || {};
  decisionLayer.newOfferDecision = buildNewOfferDecisionSummary({
    baselineOperationalCostMinor: quoteFloor.baselineOperationalCostMinor ?? financePreview?.baselineOperationalCostMinor ?? null,
    targetContributionBps: quoteFloor.targetContributionBps ?? financePreview?.roomProfitability?.costInputs?.targetContributionBps ?? null,
    riskReserveBps: quoteFloor.riskReserveBps ?? financePreview?.roomProfitability?.costInputs?.riskReserveBps ?? null,
    currentOfferMinor: financePreview?.snapshot?.currentCommercialAmountMinor ?? null,
    scenarioOfferMinor: structuredFacts.quoteScenarioAmountMinor ?? null,
    passengerCount: financePreview?.snapshot?.passengerCount ?? null,
    baselineSource: quoteFloor.baselineSource || "CANONICAL_PLAN_OR_ACTUAL",
  });

  return {
    financePreview,
    decisionLayer,
    company,
    room,
      agreement: agreementForContext,
    shiftOffer: acceptedShiftOffer,
    companyPriceBudgetAdvisory,
    historicalFinancialEvidence: companyHistoricalFinancialEvidence,
    commercialContext,
    commercialEvidence: scope === "ROOM"
      ? {
        selected: selectedCommercialEvidence,
        comparableHistory: comparableCommercialReference,
      }
      : null,
    quoteDraft,
    regionName: company?.region?.name || room?.region?.name || null,
  };
}

function candidateInputFromShift(baseline, shift) {
  const input = { ...(baseline?.input || {}) };
  const routeDistanceKm = Number(shift?.routeSnapshotDistanceM) > 0
    ? Number(shift.routeSnapshotDistanceM) / 1000
    : null;
  const routeDurationMinutes = Number(shift?.routeSnapshotDurationSec) > 0
    ? Number(shift.routeSnapshotDurationSec) / 60
    : null;
  return {
    ...input,
    ...(shift?.vehicle?.type ? { vehicleType: shift.vehicle.type } : {}),
    ...(shift?.vehicle?.capacity != null ? { vehicleCapacity: Number(shift.vehicle.capacity) } : {}),
    ...(shift?.vehicle ? { vehicleCount: 1 } : {}),
    ...((shift?.requiredPaxOverride ?? shift?._count?.people) != null ? { passengerCount: Number(shift.requiredPaxOverride ?? shift._count.people) } : {}),
    ...(shift?._count?.stops != null ? { stopCount: Number(shift._count.stops) } : {}),
    ...(routeDistanceKm !== null ? { serviceDistanceKm: routeDistanceKm, totalDistanceKm: routeDistanceKm } : {}),
    ...(routeDurationMinutes !== null ? { routeDurationMinutes } : {}),
    serviceDayCount: input.serviceDayCount ?? 1,
  };
}

function routeSignature(shift) {
  return [
    Number(shift?.routeSnapshotDistanceM) || "missing",
    Number(shift?.routeSnapshotDurationSec) || "missing",
    Number(shift?._count?.stops) || "missing",
    Number(shift?.requiredPaxOverride ?? shift?._count?.people) || "missing",
  ].join(":");
}

async function buildRouteRanking({ user, baseline, scope, externalReference = null }) {
  const where = scope === "ROOM"
    ? { roomId: Number(baseline?.roomId || 0), status: { not: "DRAFT" } }
    : { companyId: Number(baseline?.companyId || 0), status: { not: "DRAFT" } };
  if (!(where.roomId || where.companyId)) {
    return { status: "INSUFFICIENT_DATA", candidates: [], items: [], reason: "Karşılaştırılabilir rota kapsamı bulunamadı." };
  }
  const shifts = await prisma.shift.findMany({
    where,
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: 24,
    select: {
      id: true,
      companyId: true,
      roomId: true,
      status: true,
      requiredPaxOverride: true,
      routeSnapshotDistanceM: true,
      routeSnapshotDurationSec: true,
      vehicle: { select: { type: true, capacity: true } },
      _count: { select: { people: true, stops: true } },
    },
  });
  const candidates = [];
  const seen = new Set();
  for (const shift of shifts) {
    const distance = Number(shift?.routeSnapshotDistanceM);
    const duration = Number(shift?.routeSnapshotDurationSec);
    if (!(distance > 0) || !(duration > 0)) continue;
    const signature = routeSignature(shift);
    if (seen.has(signature)) continue;
    seen.add(signature);
    candidates.push(shift);
  }
  if (candidates.length < 2) {
    return { status: "INSUFFICIENT_DATA", candidates, items: [], reason: "En az iki farklı kanonik rota metriği bulunamadı; tek rota sıralaması yapılmadı." };
  }

  const scored = await Promise.all(candidates.map(async (shift) => {
    const candidateBaseline = {
      ...baseline,
      input: candidateInputFromShift(baseline, shift),
      routeShift: null,
      routeEvidence: {
        baseline: {
          distanceKm: Number(shift.routeSnapshotDistanceM) / 1000,
          durationMinutes: Number(shift.routeSnapshotDurationSec) / 60,
          stopCount: Number(shift?._count?.stops) || null,
          source: "DB_ROUTE_SNAPSHOT",
        },
      },
      source: {
        ...(baseline.source || {}),
        type: "SHIFT",
        label: `Vardiya #${shift.id}`,
        shiftId: shift.id,
        companyId: shift.companyId,
        roomId: shift.roomId,
      },
    };
    const preview = await buildCostScenarioPreviewFromBaseline({ user, baseline: candidateBaseline, scenarioOverrides: {}, externalReference });
    return {
      shiftId: shift.id,
      label: `Vardiya #${shift.id}`,
      distanceKm: Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(2)),
      durationMinutes: Number((Number(shift.routeSnapshotDurationSec) / 60).toFixed(2)),
      stopCount: Number(shift?._count?.stops) || null,
      passengerCount: Number(shift?.requiredPaxOverride ?? shift?._count?.people) || null,
      vehicleType: shift?.vehicle?.type || null,
      costMinor: preview?.scenario?.costMinor ?? null,
      currencyCode: preview?.currencyCode || baseline?.input?.currencyCode || "TRY",
      status: preview?.status || "INCOMPLETE",
      evidence: preview?.evidence || [],
    };
  }));
  const comparable = scored.filter((item) => item.costMinor !== null && item.costMinor !== undefined && item.status !== "BLOCKED");
  if (comparable.length < 2) {
    return {
      status: "INSUFFICIENT_COST_DATA",
      candidates: scored,
      items: [],
      reason: "Birden fazla kanonik rota bulundu; ancak en az iki rota için karşılaştırılabilir maliyet kanıtı yok. Maliyet sıralaması uydurulmadı.",
    };
  }
  const items = comparable
    .sort((left, right) => Number(left.costMinor) - Number(right.costMinor))
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    status: "READY",
    candidates: scored,
    items,
    best: items[0],
    mostExpensive: items[items.length - 1],
    reason: "Birden fazla yetkili rota aynı #4 maliyet sahibiyle karşılaştırıldı.",
  };
}

function buildCommercialProfitability({ scope, financePreview, commercialContext, scenarioPreview = null, agreementOnly = false }) {
  const section = scope === "ROOM" ? financePreview?.roomProfitability : financePreview?.companyBudget;
  const amountMinor = scope === "ROOM"
    ? section?.currentOfferMinor ?? commercialContext?.roomOfferAmount ?? commercialContext?.companyOfferAmount
    : section?.currentBudgetMinor ?? commercialContext?.companyOfferAmount;
  const costMinor = scenarioPreview?.baseline?.costMinor ?? (scope === "ROOM" ? section?.baselineOperationalCostMinor : section?.serviceCostMinor);
  const profitMinor = amountMinor != null && costMinor != null ? Number(amountMinor) - Number(costMinor) : null;
  const marginBps = amountMinor != null && profitMinor != null && Number(amountMinor) > 0
    ? Math.round((profitMinor / Number(amountMinor)) * 10000)
    : null;
  const sourceType = commercialContext?.type || "NONE";
  const sourceLabel = sourceType === "AGREEMENT"
    ? `Sözleşme #${commercialContext.id}`
    : sourceType === "ACCEPTED_SHIFT_OFFER"
      ? `Kabul edilmiş teklif #${commercialContext.id}`
      : "Sözleşme veya kabul edilmiş teklif yok";
  const ready = (!agreementOnly || sourceType === "AGREEMENT")
    && sourceType !== "NONE"
    && amountMinor != null
    && costMinor != null
    && profitMinor != null;
  return {
    status: ready ? "READY" : "INCOMPLETE",
    sourceType,
    sourceLabel,
    isRealCommercialContext: sourceType !== "NONE",
    isAgreement: sourceType === "AGREEMENT",
    agreementOnly,
    amountMinor: amountMinor ?? null,
    costMinor: costMinor ?? null,
    profitMinor: profitMinor ?? null,
    marginBps: marginBps ?? null,
    missingData: [
      ...(amountMinor == null ? ["Gerçek ticari tutar"] : []),
      ...(costMinor == null ? ["Kanonik maliyet tabanı"] : []),
    ],
  };
}

function layerLabel(layer) {
  if (!layer) return "Katman yok";
  if (layer.available) {
    if (layer.layer === "EXTERNAL_MARKET_REFERENCE") return `Dış piyasa referansı kullanılabilir${layer.valueMinor != null ? `: ${formatMoneyMinor(layer.valueMinor, layer.currencyCode || "TRY")}/${layer.unit === "CURRENCY_PER_L" ? "L" : "birim"}` : "."}`;
    if (layer.layer === "SEFERPAKT_PLATFORM_REFERENCE") return `Platform geçmiş anlaşma referansı kullanılabilir: ${layer.distinctRoomCount || 0} bağımsız ROOM kanıtı.`;
    if (layer.layer === "USER_COMPANY_ROOM_ACTUAL") return `Bu kapsamın gerçek verisi kullanılabilir: ${formatMoneyMinor(layer.valueMinor, layer.currencyCode || "TRY")}.`;
  }
  if (layer.layer === "SEFERPAKT_PLATFORM_REFERENCE") return "Platform geçmiş anlaşma referansı kapalı; onaylı politika ve bağımsız ROOM kanıtı yok.";
  if (layer.layer === "USER_COMPANY_ROOM_ACTUAL") return "Bu kapsam için karşılaştırılabilir gerçek veri yok.";
  return "Dış piyasa referansı kullanılabilir bir değer sağlamıyor.";
}

function confidenceLabel(level, score) {
  const normalized = upper(level);
  if (normalized === "HIGH" || Number(score) >= 90) return "Yüksek";
  if (normalized === "MEDIUM" || Number(score) >= 65) return "Orta";
  if (normalized === "LOW" || Number(score) >= 40) return "Düşük";
  return "Yetersiz";
}

export function baselinePlanText(baseline, overrides = {}) {
  const input = baseline?.input || {};
  const value = (key) => overrides?.[key] ?? input[key];
  const parts = [
    baseline?.source?.label ? `Mevcut plan: ${baseline.source.label}.` : "Mevcut plan kaynağı bulunamadı.",
    value("vehicleCount") != null ? `Araç: ${formatNumber(value("vehicleCount"), 0)} araç.` : "",
    value("passengerCount") != null ? `Yolcu: ${formatNumber(value("passengerCount"), 0)} kişi.` : "",
    value("stopCount") != null ? `Durak: ${formatNumber(value("stopCount"), 0)} durak.` : "",
    value("serviceDistanceKm") != null ? `Mesafe: ${formatNumber(value("serviceDistanceKm"))} km.` : "",
    value("routeDurationMinutes") != null ? `Rota süresi: ${formatNumber(value("routeDurationMinutes"), 0)} dk.` : "",
    value("serviceDayCount") != null ? `Hizmet günü: ${formatNumber(value("serviceDayCount"), 0)} gün.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function changedDimensionLabels(preview) {
  const map = {
    vehicleCount: "araç sayısı",
    vehicleType: "araç tipi",
    vehicleCapacity: "araç kapasitesi",
    passengerCount: "kişi sayısı",
    stopCount: "durak sayısı",
    serviceDistanceKm: "hizmet mesafesi",
    totalDistanceKm: "toplam mesafe",
    routeDurationMinutes: "rota süresi",
    serviceDayCount: "hizmet günü",
  };
  return unique((preview?.changedDimensions || []).map((key) => map[key] || key));
}

export function buildForecastPlanningShareExplanation({
  forecastAllocation = null,
  currencyCode = "TRY",
  actualCostMinor = null,
} = {}) {
  if (String(forecastAllocation?.status || "").toUpperCase() !== "READY") return "";
  const shareMinor = finiteNumber(forecastAllocation.grossAmountMinor);
  const sourceMinor = finiteNumber(forecastAllocation.sourceScopeAmountMinor);
  if (shareMinor === null || sourceMinor === null) return "";
  const allocatedMinor = finiteNumber(forecastAllocation.allocatedAmountMinor);
  const pendingMinor = finiteNumber(forecastAllocation.pendingAmountMinor);
  const unallocatedMinor = finiteNumber(forecastAllocation.unallocatedAmountMinor);
  const parts = [
    `Seçili hizmete kanıtlı tahmini ortak gider payı: ${formatMoneyMinor(shareMinor, currencyCode)}.`,
    `Kaynak tahmini gider toplamı: ${formatMoneyMinor(sourceMinor, currencyCode)}${allocatedMinor !== null ? `; kanıtlı dağıtılan toplam: ${formatMoneyMinor(allocatedMinor, currencyCode)}` : ""}.`,
  ];
  if (pendingMinor !== null && pendingMinor > 0) {
    parts.push(`Seçili hizmet dışındaki aynı kapsamlı bekleyen pay: ${formatMoneyMinor(pendingMinor, currencyCode)}.`);
  }
  if (unallocatedMinor !== null && unallocatedMinor > 0) {
    parts.push(`Dağıtılamayan tutar: ${formatMoneyMinor(unallocatedMinor, currencyCode)}.`);
  }
  parts.push(
    actualCostMinor === null
      ? "Bu tutar yalnızca FORECAST planlama maliyetidir; gerçekleşmiş muhasebe gideri değildir ve kesin kâr olarak sunulamaz."
      : `Gerçekleşmiş gider kaydı bu tahmini paydan türetilmedi; gerçekleşmiş tutar ${formatMoneyMinor(actualCostMinor, currencyCode)} ve bu sonuç kesin kâr değildir.`,
  );
  return parts.join(" ");
}

function materialFinancialEffect({
  scope,
  financePreview,
  scenarioPreview,
  canonicalCurrentCostMinor = null,
  canonicalCurrentCostLabel = "Güncel kanonik maliyet",
  forecastPlanningText = "",
}) {
  const currencyCode = scenarioPreview?.currencyCode || financePreview?.currencyCode || "TRY";
  if (scenarioPreview?.costDeltaMinor !== null && scenarioPreview?.costDeltaMinor !== undefined) {
    const delta = integer(scenarioPreview.costDeltaMinor);
    const direction = delta < 0 ? "azalış" : delta > 0 ? "artış" : "değişiklik yok";
    return [
      forecastPlanningText,
      `#4 karşılaştırmasına göre tahmini maliyet etkisi: ${formatMoneyMinor(Math.abs(delta), currencyCode)} ${direction}. Bu değer yalnızca önizlemedir.`,
    ].filter(Boolean).join(" ");
  }
  if (scope === "ROOM" && financePreview?.roomProfitability) {
    const quote = financePreview.roomProfitability;
    if (financePreview?.quoteFloor?.quoteFloorMinor !== null && financePreview?.quoteFloor?.quoteFloorMinor !== undefined) return [forecastPlanningText, `Kanonik teklif tabanı önizlemesi: ${formatMoneyMinor(financePreview.quoteFloor.quoteFloorMinor, currencyCode)}. Bu değer teklif göndermez veya değişiklik uygulamaz.`].filter(Boolean).join(" ");
    if (forecastPlanningText) return forecastPlanningText;
    if (canonicalCurrentCostMinor !== null && canonicalCurrentCostMinor !== undefined) return `${canonicalCurrentCostLabel}: ${formatMoneyMinor(canonicalCurrentCostMinor, currencyCode)}. Bu değer teklif göndermez veya değişiklik uygulamaz.`;
    if (quote.baselineOperationalCostMinor !== null && quote.baselineOperationalCostMinor !== undefined) return `Kanonik maliyet tabanı: ${formatMoneyMinor(quote.baselineOperationalCostMinor, currencyCode)}. Teklif tabanı için ek parametre gerekebilir.`;
  }
  if (scope === "COMPANY" && financePreview?.companyBudget) {
    const budget = financePreview.companyBudget;
    const service = financePreview.companyServiceCost;
    const parts = [];
    if (budget.effectiveBudgetMinor !== null && budget.effectiveBudgetMinor !== undefined) parts.push(`Kanonik bütçe: ${formatMoneyMinor(budget.effectiveBudgetMinor, currencyCode)}.`);
    if (service?.companyVisibleServiceSpendMinor !== null && service?.companyVisibleServiceSpendMinor !== undefined) parts.push(`Görünen servis maliyeti: ${formatMoneyMinor(service.companyVisibleServiceSpendMinor, currencyCode)}.`);
    return parts.join(" ") || "Kanonik finansal etki için karşılaştırılabilir bütçe veya servis maliyeti verisi eksik.";
  }
  return "Karşılaştırılabilir parasal etki için kanonik veri eksik.";
}

function operationalEffect({ baseline, scenarioPreview }) {
  const changed = changedDimensionLabels(scenarioPreview);
  const timing = scenarioPreview?.timingComparison;
  const parts = [];
  if (changed.length) parts.push(`Değişen operasyon boyutları: ${changed.join(", ")}.`);
  if (timing?.delayImpactMinutes !== null && timing?.delayImpactMinutes !== undefined) parts.push(`Tahmini süre etkisi: ${formatNumber(timing.delayImpactMinutes, 0)} dk.`);
  if (scenarioPreview?.scenario?.requiredVehicleCount !== null && scenarioPreview?.scenario?.requiredVehicleCount !== undefined) parts.push(`Senaryo kapasite ihtiyacı: ${formatNumber(scenarioPreview.scenario.requiredVehicleCount, 0)} araç.`);
  if (!parts.length) return baselinePlanText(baseline);
  return parts.join(" ");
}

function riskText(scenarioPreview) {
  const risks = unique([
    ...(scenarioPreview?.blockers || []),
    ...(scenarioPreview?.warnings || []),
    scenarioPreview?.operationalRisk?.summary,
    scenarioPreview?.operationalRisk?.reason,
  ]);
  return risks.length ? risks.slice(0, 4).join(" ") : "Kanonik önizlemede ek risk sinyali yok; sonuç yine de operasyon onayı yerine geçmez.";
}

function missingData({ baseline, financePreview, referenceLayers, scenarioPreview }) {
  const fields = [
    ...(baseline?.missingFields || []),
    ...(financePreview?.missingFields || []),
    ...(financePreview?.companyBudget?.missingFields || []),
    ...(financePreview?.companyServiceCost?.missingFields || []),
    ...(financePreview?.roomProfitability?.missingFields || []),
    ...(scenarioPreview?.missingData || []),
  ];
  const selected = referenceLayers?.selected;
  if (!selected?.available) fields.push("Uygun dış veya platform referansı");
  const labels = {
    vehicleType: "Araç tipi",
    vehicleCount: "Araç sayısı",
    vehicleCapacity: "Araç kapasitesi",
    passengerCount: "Kişi / öğrenci / yolcu sayısı",
    stopCount: "Durak sayısı",
    serviceDistanceKm: "Rota mesafesi",
    totalDistanceKm: "Toplam mesafe",
    routeDurationMinutes: "Rota süresi",
    serviceDayCount: "Hizmet günü",
    shiftCount: "Sefer sayısı",
    tripCount: "Yolculuk sayısı",
    periodStart: "Dönem başlangıcı",
    periodEnd: "Dönem bitişi",
    actualServiceSpendMinor: "Gerçekleşen servis harcaması",
    contractedServiceCostMinor: "Sözleşmeli servis maliyeti",
    agreementPriceMinor: "Sözleşme tutarı",
    offerPriceMinor: "Teklif tutarı",
    deliveredShiftCount: "Tamamlanan sefer sayısı",
    deliveredServiceDayCount: "Tamamlanan hizmet günü",
  };
  return unique(fields).map((field) => labels[field] || field).slice(0, 10);
}

export function resolveAuthorizedActualCostMinor({
  scope = "",
  screenContext = null,
  financePreview = null,
  actualCostFallbackMinor = null,
} = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  const hasExplicitActualCost = Object.prototype.hasOwnProperty.call(facts, "actualCostMinor");
  const explicitActualCostMinor = finiteNumber(facts.actualCostMinor);
  if (String(scope).toUpperCase() === "ROOM" && hasExplicitActualCost) {
    return explicitActualCostMinor !== null && explicitActualCostMinor > 0 ? explicitActualCostMinor : null;
  }
  if (String(scope).toUpperCase() === "COMPANY") return null;
  const previewActualCostMinor = finiteNumber(financePreview?.roomProfitability?.actualOperationalCostMinor);
  if (previewActualCostMinor !== null && previewActualCostMinor > 0) return previewActualCostMinor;
  const fallbackMinor = finiteNumber(actualCostFallbackMinor);
  return fallbackMinor !== null && fallbackMinor > 0 ? fallbackMinor : null;
}

export function costCompleteness({ baseline, financePreview, scenarioPreview, referenceLayers, scope, actualCostFallbackMinor = null, actualCostMinorOverride = undefined }) {
  const scenarioCostMinor = finiteNumber(scenarioPreview?.scenario?.costMinor);
  const coverage = scenarioPreview?.costCoverage?.scenario || {};
  const baselineActualCostMinor = baseline?.actualEvidence?.actualCostMinor;
  const actualCostMinor = scope === "COMPANY"
    ? baselineActualCostMinor === null || baselineActualCostMinor === undefined
      ? null
      : finiteNumber(baselineActualCostMinor)
    : actualCostMinorOverride !== undefined
      ? actualCostMinorOverride
      : resolveAuthorizedActualCostMinor({ scope, financePreview, actualCostFallbackMinor });
  const actualAuthorized = actualCostMinor !== null;
  const costLevel = actualAuthorized
    ? "ACTUAL"
    : coverage.status === "COMPLETE" && scenarioCostMinor !== null
      ? "OPERATIONAL_ESTIMATE"
      : "PARTIAL";
  const componentBreakdown = Array.isArray(scenarioPreview?.scenario?.componentBreakdown)
    ? scenarioPreview.scenario.componentBreakdown
    : [];
  const includedComponents = componentBreakdown
    .filter((component) => component?.includedInBaseline)
    .map((component) => component.labelTr || component.key)
    .filter(Boolean);
  const missingComponents = unique([
    ...(Array.isArray(coverage.missingOptionalCosts) ? coverage.missingOptionalCosts.map((item) => item?.label) : []),
    ...componentBreakdown
      .filter((component) => component?.status === "incomplete" && component?.labelTr)
      .map((component) => component.labelTr),
  ]);
  const referenceSources = (Array.isArray(referenceLayers?.layers) ? referenceLayers.layers : [])
    .filter((layer) => layer?.available)
    .map((layer) => layer.provenance || layer.sourceName || layer.layer)
    .filter(Boolean);
  const confidenceSource = scenarioPreview?.confidence || {};
  const confidence = {
    level: confidenceSource.level || "INSUFFICIENT",
    score: finiteNumber(confidenceSource.score),
    reason: confidenceSource.reason || null,
  };
  const provenance = {
    canonical1: scope === "ROOM" ? "ROOM_PROFITABILITY_AND_QUOTE_FLOOR" : "COMPANY_BUDGET_AND_SERVICE_COST",
    canonical2: "EXTERNAL_COST_REFERENCE_LAYERS",
    canonical4: "COST_SCENARIO_FORECAST",
    baselineReference: baseline?.baselineReference || null,
    referenceSources: unique(referenceSources),
    actualSource: actualAuthorized ? baseline?.actualEvidence?.provenance || "AUTHORIZED_INTERNAL_ACTUAL" : null,
  };
  return {
    costLevel,
    available: scenarioCostMinor !== null,
    costMinor: scenarioCostMinor,
    actualCostMinor: actualAuthorized ? actualCostMinor : null,
    includedComponents: unique(includedComponents),
    missingComponents,
    confidence,
    provenance,
  };
}

function costLevelText(completeness, scenarioPreview) {
  const amount = completeness?.costMinor !== null && completeness?.costMinor !== undefined
    ? formatMoneyMinor(completeness.costMinor, scenarioPreview?.currencyCode || "TRY")
    : "tutar yok";
  if (completeness?.costLevel === "ACTUAL") return `Gerçekleşen maliyet: ${amount}.`;
  if (completeness?.costLevel === "OPERATIONAL_ESTIMATE") return `Operasyonel tahmini maliyet: ${amount}.`;
  if (completeness?.available) return `Kısmi tahmini maliyet: ${amount}.`;
  return "Kısmi tahmini maliyet için kullanılabilir tutar oluşmadı.";
}

function answerSection(title, text, hint = "", items = []) {
  return { kind: title, title, text: String(text || "").trim(), ...(hint ? { hint } : {}), ...(items.length ? { items } : {}) };
}

function buildClarificationResponse({ baseResponse, request, roleKey, scope, screenPath }) {
  const roleLabel = visibleRoleLabel(roleKey);
  const question = scope
    ? `${roleLabel} için ${scope === "ROOM" ? "hangi oda / vardiya" : "hangi firma planı"} üzerinde bakayım?`
    : "Maliyet sorusunu hangi finans ekranı ve seçili plan için yanıtlayayım?";
  const sections = COST_REASONING_ANSWER_SECTIONS.map((title) => {
    if (title === "SONUÇ") return answerSection(title, "Sağlam bir maliyet açıklaması için bağlamı netleştirmem gerekiyor.");
    if (title === "NEDEN") return answerSection(title, "Birden fazla finans kapsamı veya geçerli kayıt olabilir; yanlış kapsam üzerinden sonuç üretmiyorum.");
    if (title === "ÖNERİ") return answerSection(title, question, "Seçili kayıt veya finans ekranı üzerinden devam edebiliriz.");
    if (title === "EKSİK VERİ") return answerSection(title, [screenPath ? "Seçili kapsam doğrulaması" : "Finans ekranı / plan kapsamı"].join("."));
    if (title === "GÜVEN SEVİYESİ") return answerSection(title, "Yetersiz — bağlam seçilmeden sayısal veya nedensel iddia kurmuyorum.");
    if (title === "KANIT") return answerSection(title, "Kanonik #1, #2 ve #4 sahipleri bağlam netleşince birlikte okunacak.");
    return answerSection(title, "Bağlam netleşince açıklanacak.");
  });
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    reply: `Sonuç: ${sections[0].text} Öneri: ${sections.find((section) => section.kind === "ÖNERİ")?.text || question}`,
    questionType: "COST_REASONING_CLARIFICATION",
    questionLabel: "Maliyet bağlamı",
    responseSections: sections,
    costReasoning: {
      version: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
      family: request.family,
      clarificationRequired: true,
      isFollowUp: request.isFollowUp,
      role: roleKey,
      scope,
      screenPath: screenPath || null,
      context: { role: roleLabel, screenPath: screenPath || null, selectedRecord: null },
      evidence: { canonical1: null, canonical2: null, canonical4: null },
      readOnly: true,
      writeAction: false,
      generatedAt: new Date().toISOString(),
    },
    evidenceConfidence: "Yetersiz — bağlam seçilmeden değerlendirme yapılmadı.",
  };
}

function selectedAgreementFinancialContinuationResponse({ baseResponse = {}, screenContext = null, conversationState = null } = {}) {
  const semanticPlan = baseResponse?.semanticPlan || null;
  if (semanticPlan?.family !== 'CONTINUE_CURRENT_REASONING') return null;
  const action = String(
    semanticPlan?.typedRequest?.continuationAction
      || semanticPlan?.continuationAction
      || '',
  ).toUpperCase();
  if (!['BACK', 'RECOVER', 'CONTINUE', 'EXPAND', 'NEXT'].includes(action)) return null;
  const selectedType = String(
    screenContext?.selectedEntityType
      || semanticPlan?.entity?.type
      || semanticPlan?.continuationBasePlan?.entity?.type
      || '',
  ).toLowerCase();
  const selectedId = Number(
    screenContext?.selectedEntityId
      || screenContext?.selectedRecordId
      || semanticPlan?.entity?.id
      || semanticPlan?.continuationBasePlan?.entity?.id
      || 0,
  ) || 0;
  if (selectedType !== 'agreement' || selectedId <= 0) return null;

  const currentTarget = screenContext?.uiHints?.currentTarget;
  const liveTargetLabel = currentTarget?.status === 'FOUND' && String(currentTarget?.label || '').trim()
    ? String(currentTarget.label).trim()
    : '';
  const visibleTargetLabel = (Array.isArray(screenContext?.uiHints?.visibleButtons) ? screenContext.uiHints.visibleButtons : [])
    .map((item) => typeof item === 'string' ? item : item?.label)
    .map((label) => String(label || '').trim())
    .filter((label) => /(?:fark|hakediş|hakedis|fatura|mutabakat|ödeme|odeme|önizleme|onizleme)/iu.test(label))
    .sort((left, right) => /fark/iu.test(left) ? -1 : /fark/iu.test(right) ? 1 : 0)[0] || '';
  const activeTab = (Array.isArray(screenContext?.uiHints?.activeTabs) ? screenContext.uiHints.activeTabs : [])
    .map((tab) => typeof tab === 'string' ? tab : tab?.label)
    .map((label) => String(label || '').trim())
    .find(Boolean) || '';
  const targetLabel = liveTargetLabel || visibleTargetLabel || activeTab;
  const previousReply = String(
    conversationState?.lastSettledResult?.reply
      || conversationState?.costAnalysisState?.lastAnswer
      || '',
  ).trim();
  const safePreviousReply = previousReply && previousReply !== 'Yardım metni oluşmadı.'
    ? previousReply.slice(0, 420)
    : '';
  const targetLine = targetLabel
    ? `Gerçek UI hedefi: “${targetLabel}”.`
    : 'Bu turda doğrulanmış bir menü, sekme veya kart hedefi görünmüyor; hedef adı uydurmuyorum.';
  const normalizedAction = action === 'EXPAND' || action === 'NEXT' ? 'CONTINUE' : action;
  const financialContinuationState = semanticPlan?.financialContinuationState || null;
  const enteredExplanationStep = financialContinuationState?.stepKey === 'EXPLAIN_RESULT'
    && !financialContinuationState?.previousStepKey;
  const returnedToExplanationStep = normalizedAction === 'BACK'
    && financialContinuationState?.stepKey === 'EXPLAIN_RESULT'
    && financialContinuationState?.previousStepKey === 'INSPECT_DIFFERENCE';
  const advancedToInspectionStep = normalizedAction === 'CONTINUE'
    && financialContinuationState?.stepKey === 'INSPECT_DIFFERENCE';
  const reply = normalizedAction === 'BACK'
    ? returnedToExplanationStep
      ? `Seçili Sözleşme #${selectedId} için önceki finansal açıklama adımına geri döndük. ${targetLine} Farkı inceleme adımına yeniden geçmeden önce bu açıklamayı gözden geçiriyoruz; iş kaydı değiştirmiyorum.`
      : safePreviousReply
        ? `Seçili Sözleşme #${selectedId} bağlamında geri dönülecek önceki finansal adım kanıtlandı: ${safePreviousReply} ${targetLine} Bu yalnızca salt-okunur bir geri dönüş; iş kaydı değiştirmiyorum.`
        : `Seçili Sözleşme #${selectedId} korunuyor. Bu oturumda geri dönülecek önceki finansal açıklama adımı kanıtlanamadı; mevcut kaydı değiştirmeden yeniden doğrulama yapabilirsin. ${targetLine}`
    : normalizedAction === 'RECOVER'
      ? targetLabel
        ? `Seçili Sözleşme #${selectedId} bağlamında kalıyoruz. “${targetLabel}” hedefini yeniden kontrol et; seçili kaydı değiştirmeden bu sekmede mutabakat/önizleme bilgisini bulabilirsin.`
        : `Seçili Sözleşme #${selectedId} korunuyor. Gerçek UI hedefi bu turda doğrulanamadı; uydurma menü veya kart yönlendirmesi yapmıyorum. Commercial Flow ekranında seçili kaydı yeniden doğrula.`
      : advancedToInspectionStep
        ? `Seçili Sözleşme #${selectedId} için finansal açıklamadan farkı inceleme adımına ilerledik. ${targetLine} Bu hedefi açarak doğrulanmış hakediş/fatura kanıtını inceleyebilirsin.`
        : enteredExplanationStep
          ? `Seçili Sözleşme #${selectedId} için finansal açıklama adımını başlattık. ${targetLine} Devam edersen bu doğrulanmış hedefteki fark inceleme adımına geçebilirsin.`
          : `Seçili Sözleşme #${selectedId} için finansal görev aynı kayıtta korunuyor. ${targetLine} Sayısal veya durum kanıtı olmadan yeni kayıt üretmiyorum.`;
  const nextAction = financialContinuationState?.stepKey === 'EXPLAIN_RESULT' && financialContinuationState?.nextStepKey && targetLabel
    ? `Devam ederek “${targetLabel}” fark inceleme adımına geç.`
    : targetLabel
      ? `“${targetLabel}” hedefini kontrol et.`
      : 'Commercial Flow ekranında seçili sözleşmeyi yeniden doğrula.';
  const sections = [
    { kind: 'SONUÇ', title: 'SONUÇ', text: reply },
    { kind: 'HEDEF', title: 'GERÇEK UI HEDEFİ', text: targetLine },
    { kind: 'GÜVENLİ SINIR', title: 'GÜVENLİ SINIR', text: 'Sefer Abi yalnızca yetkili seçili kaydı açıklar; iş kaydı veya ödeme işlemi başlatmaz.' },
  ];
  return {
    ...baseResponse,
    provider: 'local-sefer-abi-financial-continuation',
    reply,
    summary: reply,
    questionType: 'FINANCIAL_CONTINUATION',
    questionLabel: normalizedAction === 'BACK' ? 'Önceki finansal adım' : normalizedAction === 'RECOVER' ? 'Finansal hedef kurtarma' : 'Finansal devam',
    responseSections: sections,
    authorizedRecords: [{ type: 'agreement', id: selectedId }],
    retrievedFacts: [`Seçili Sözleşme #${selectedId} bağlamı korundu`],
    dataSources: ['yetkili seçili sözleşme bağlamı', ...(targetLabel ? ['canlı görünür UI hedefi'] : [])],
    financialContinuationState,
    nextAction,
    safeNextStep: nextAction,
    followUpPrompt: 'İstersen aynı seçili sözleşmenin kanıtını açıklamaya devam edebilirim.',
    roleBoundary: 'Yalnızca yetkili seçili sözleşme bağlamı kullanıldı; iş kaydı değiştirilmedi.',
    costAnalysisState: {
      ...(conversationState?.costAnalysisState || {}),
      lastScreenPath: String(screenContext?.path || ''),
      lastScope: 'ROOM',
      lastContinuationType: normalizedAction,
      lastAnswer: reply,
      lastSelectedAgreementId: selectedId,
    },
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

function visibleRoomAgreementPreviewContext(screenContext) {
  const path = String(screenContext?.path || "").split("?")[0];
  // The commercial-flow surface exposes the selected agreement's same
  // financial preview in its tabs. Keep this scoped to an actual selected
  // agreement and visible financial text; do not broaden it to role-global
  // or route-only financial claims.
  const isAgreementPreviewPath = /^\/room\/agreements$/i.test(path)
    || /^\/room\/commercial-flow$/i.test(path);
  if (!isAgreementPreviewPath) return null;
  const activeTab = String(
    screenContext?.structuredFacts?.activeTab
      || screenContext?.facts?.activeTab
      || screenContext?.liveFacts?.activeTab
      || "",
  ).trim().toLowerCase();
  if (/^\/room\/commercial-flow$/i.test(path) && activeTab === "settlement") {
    return {
      previewKind: "payment",
      agreementId: null,
      metricLabels: ["Beklenen hakediş", "Fatura tutarı", "Fark"],
      noVisibleAmount: true,
      visibleText: "Hakediş önizleme ödeme başlatmaz.",
    };
  }
  const selectedType = String(
    screenContext?.selectedEntityType
      || screenContext?.selectedRecordType
      || screenContext?.structuredFacts?.selectedEntityType
      || screenContext?.structuredFacts?.selectedRecordType
      || screenContext?.facts?.selectedRecordType
      || screenContext?.liveFacts?.selectedRecordType
      || "",
  ).trim().toLowerCase();
  const selectedId = integer(
    screenContext?.selectedEntityId
      ?? screenContext?.selectedRecordId
      ?? screenContext?.structuredFacts?.selectedEntityId
      ?? screenContext?.structuredFacts?.selectedRecordId
      ?? screenContext?.facts?.selectedRecordId
      ?? screenContext?.liveFacts?.selectedRecordId,
  );
  if (selectedType !== "agreement" || !selectedId) return null;
  const visibleText = [
    screenContext?.visibleText,
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.structuredFacts?.summary,
    screenContext?.structuredFacts?.selectedSummary,
    screenContext?.structuredFacts?.selectedRecordSummary,
    screenContext?.facts?.summary,
    screenContext?.facts?.selectedSummary,
    screenContext?.facts?.selectedRecordSummary,
    screenContext?.liveFacts?.summary,
    screenContext?.liveFacts?.selectedSummary,
    screenContext?.liveFacts?.selectedRecordSummary,
    screenContext?.uiHints?.visibleText,
    screenContext?.uiHints?.structuredFacts?.summary,
    screenContext?.uiHints?.structuredFacts?.selectedSummary,
    screenContext?.uiHints?.structuredFacts?.selectedRecordSummary,
    screenContext?.uiHints?.facts?.summary,
    screenContext?.uiHints?.facts?.selectedSummary,
    screenContext?.uiHints?.facts?.selectedRecordSummary,
    ...(Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields.map((row) => `${row?.label || ""}: ${row?.value || ""}`) : []),
    ...(Array.isArray(screenContext?.uiHints?.visibleTargets) ? screenContext.uiHints.visibleTargets.map((row) => row?.label || row) : []),
    ...[screenContext?.structuredFacts, screenContext?.facts, screenContext?.liveFacts, screenContext?.uiHints]
      .filter(Boolean)
      .map((facts) => JSON.stringify(facts)),
  ].filter(Boolean).join(" ");
  if (!/(?:hakediş|hakedis|ödeme|odeme|mutabakat|fatura|önizleme|onizleme)/iu.test(visibleText)) return null;
  const metricLabels = [
    "Beklenen hakediş",
    "Fatura tutarı",
    "Fark",
  ].filter((label) => new RegExp(label.replace(/\s+/gu, "\\s+"), "iu").test(visibleText));
  return {
    agreementId: selectedId,
    metricLabels,
    noVisibleAmount: /(?:beklenen hakediş|fatura tutarı|fark)[^\n]{0,80}veri\s+yok/iu.test(visibleText),
    visibleText,
  };
}

function formatReconciliationMoneyMinor(value, currencyCode = "TRY") {
  if (value == null || !Number.isSafeInteger(Number(value))) return "Veri yok";
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) / 100);
  return String(currencyCode || "TRY").toUpperCase() === "TRY" ? `${formatted} ₺` : `${formatted} ${String(currencyCode).toUpperCase()}`;
}

export function buildSelectedAgreementReconciliationResponse({ baseResponse, screenPath, screenContext = null, reconciliationPreview = null, paymentAccount = null, collectionSummary = null } = {}) {
  const data = reconciliationPreview?.data || null;
  const selectedId = Number(data?.agreement?.id || screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  if (!data || String(screenContext?.selectedEntityType || "").trim().toLowerCase() !== "agreement" || selectedId <= 0) return null;

  const status = upper(data.status);
  const currency = data.expectedAmount?.currencyCode || data.invoice?.currencyCode || "TRY";
  const expected = formatReconciliationMoneyMinor(data.expectedAmount?.amountMinor, currency);
  const invoiceAmountMinor = data.invoice?.amountMinor ?? collectionSummary?.invoiceAmountMinor;
  const invoice = formatReconciliationMoneyMinor(invoiceAmountMinor, currency);
  const difference = formatReconciliationMoneyMinor(data.difference?.absoluteAmountMinor, currency);
  const accountStatus = paymentAccount ? `PaymentAccount durumu ${upper(paymentAccount.status, "BILINMIYOR")}.` : "Bu sözleşmenin yetkili şirket/oda kapsamı için PaymentAccount kaydı yok.";
  const collectionText = collectionSummary?.status === "AVAILABLE"
    ? `Tahsil edilen ${formatReconciliationMoneyMinor(collectionSummary.collectedAmountMinor, collectionSummary.currencyCode || currency)}, kalan alacak ${formatReconciliationMoneyMinor(collectionSummary.receivableAmountMinor, collectionSummary.currencyCode || currency)}.`
    : collectionSummary?.status === "UNAVAILABLE"
      ? `Doğrulanmış tahsilat tutarı yok: ${collectionSummary.reason || "tahsilat kanıtı bulunamadı"}.`
      : "Tahsilat özeti bu sözleşme için doğrulanamadı.";
  const operationEvidence = data.evidence?.operations;
  const operationText = operationEvidence
    ? `Operasyon kanıtı ${Number(operationEvidence.completedCount || 0)}/${Number(operationEvidence.eligibleCount || 0)} tamamlandı.`
    : "Operasyon kanıtı ayrıntısı yok.";

  let result;
  if (status === "MATCHED") {
    result = `Seçili Sözleşme #${selectedId} için hakediş ${expected} ve fatura ${invoice}; kayıtlar eşleşiyor. ${collectionText}`;
  } else if (status === "OVER_INVOICED") {
    result = `Seçili Sözleşme #${selectedId} için hakediş ${expected}, fatura ${invoice}; fatura ${difference} daha yüksek. ${collectionText} Durum: fazla faturalandırma.`;
  } else if (status === "NO_HAKEDIS") {
    result = `Seçili Sözleşme #${selectedId} için bu dönemde karşılaştırılabilir hakediş kaydı yok. Bu nedenle beklenen hakediş ve fark hesaplanamıyor.`;
  } else if (status === "NO_OPERATION") {
    result = `Seçili Sözleşme #${selectedId} için seçilen dönemde sözleşmeye bağlı operasyon/sefer kanıtı yok. ${expected !== "Veri yok" ? `Görünen ${expected} tutar ödeme uygunluğu kanıtı değildir.` : "Tutar bilgisi ödeme uygunluğu kanıtı değildir."}`;
  } else if (status === "REVIEW_REQUIRED") {
    const reason = Array.isArray(data.reasons) ? data.reasons.map((item) => item?.label).filter(Boolean).join(" ") : "";
    const fixtureSource = [data.invoice?.source, data.hakedisPreview?.source]
      .map((source) => String(source || "").toUpperCase())
      .find((source) => ["DEMO_FIXTURE", "TEST_SIMULATED", "SIMULATED_DEMO"].includes(source));
    const nonAuthoritativeEvidence = Array.isArray(data.missingData)
      && data.missingData.some((item) => String(item?.code || "").toUpperCase() === "NON_AUTHORITATIVE_DATA");
    const fixtureEvidence = fixtureSource
      ? "Finansal kanıt demo/test kaynağından geldiği için inceleme gerekiyor."
      : nonAuthoritativeEvidence
        ? "Finansal kanıt doğrulanmış gerçek kaynak olmadığı için inceleme gerekiyor."
        : "Finansal kanıt tamamlanmadan ödeme uygunluğu kesinleştirilmiyor.";
    const controlledDemoLabel = fixtureSource ? "Kontrollü DEMO" : nonAuthoritativeEvidence ? "Kontrollü DEMO/test" : "";
    const controlledDemoAmounts = controlledDemoLabel
      && invoice !== "Veri yok"
      && collectionSummary?.status === "AVAILABLE"
      ? `${controlledDemoLabel} readback: fatura ${invoice}; ${collectionText} Bu tutarlar gerçek saha/banka kanıtı değildir.`
      : "";
    result = `Seçili Sözleşme #${selectedId} inceleme bekliyor. ${reason ? `${reason} ` : ""}${fixtureEvidence} ${controlledDemoAmounts}`.trim();
  } else if (["PARTIAL_OPERATION_EVIDENCE", "UNDER_INVOICED"].includes(status)) {
    result = `Seçili Sözleşme #${selectedId} için hakediş ${expected}, fatura ${invoice}. ${collectionText} ${operationText} Durum: ${data.statusLabel || status}.`;
  } else {
    result = `Seçili Sözleşme #${selectedId} için hakediş ${expected}, fatura ${invoice}. ${collectionText} Durum: ${data.statusLabel || status || "İncelenmeli"}.`;
  }
  const reply = `${result} ${accountStatus} Bu yüzey salt okunur önizlemedir; ödeme, fatura onayı veya hakediş kesinleştirme başlatmıyorum.`;
  return {
    ...baseResponse,
    provider: "local-canonical-agreement-reconciliation",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath: screenPath || baseResponse?.screenPath || null,
    reply,
    summary: reply,
    questionType: status === "NO_HAKEDIS" ? "PAYMENT_MISSING" : "PAYMENT_READINESS",
    questionLabel: "Seçili sözleşme hakediş ve fatura mutabakatı",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    evidenceConfidence: "Seçili ve yetkili agreement kapsamındaki canonical reconciliation verisi ile sınırlı.",
    authorizedRecords: [{ type: "agreement", id: selectedId }],
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Mutabakat önizlemesini aç",
      path: "/room/commercial-flow",
      routeParams: { agreementId: selectedId, tab: "settlement" },
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    retrievedFacts: [
      `Sözleşme #${selectedId}: ${data.statusLabel || status}`,
      ...(data.expectedAmount?.amountMinor != null ? [`Hakediş: ${expected}`] : []),
      ...(data.invoice?.amountMinor != null ? [`Fatura: ${invoice}`] : []),
      ...(data.difference?.absoluteAmountMinor != null ? [`Fark: ${difference}`] : []),
      accountStatus,
    ],
    dataSources: ["yetkili seçili sözleşme", "canonical hakediş/fatura reconciliation", "PaymentAccount readiness"],
    roleBoundary: "Yalnızca mevcut ROOM tenant ve yetkili seçili sözleşmenin salt-okunur finans kanıtı kullanıldı; işlem başlatılmadı.",
    guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

async function loadAuthorizedAgreementFinanceEvidenceForUser({ user = {}, agreementId = 0, invoiceId = 0, hakedisId = 0 } = {}) {
  const id = Number(agreementId) || 0;
  const roomId = Number(user?.roomId) || 0;
  if (!id || String(user?.role || "").toUpperCase() !== "ROOM" || !roomId) return null;
  const agreement = await prisma.agreement.findFirst({
    where: { id, roomId },
    select: { id: true, roomId: true, companyId: true },
  });
  if (!agreement) return null;
  return loadSelectedAgreementFinanceEvidence({
    type: "agreement",
    id: agreement.id,
    roomId: agreement.roomId,
    companyId: agreement.companyId,
  }, user, { invoiceId, hakedisId });
}

async function loadRoomReconciliationSummary(user = {}) {
  const roomId = Number(user?.roomId) || 0;
  if (String(user?.role || "").toUpperCase() !== "ROOM" || !roomId) return [];
  const agreements = await prisma.agreement.findMany({
    where: { roomId },
    select: { id: true },
    orderBy: [{ id: "asc" }],
  });
  const previews = await Promise.all(agreements.map(async ({ id }) => buildAgreementReconciliationPreview({ agreementId: id })));
  return previews
    .filter((preview) => preview?.data?.agreement?.id)
    .map((preview) => preview.data);
}

function explicitAgreementIdFromSemanticPlan(baseResponse) {
  const request = baseResponse?.semanticPlan?.canonicalRequest?.request
    || baseResponse?.semanticPlan?.canonicalRequest
    || null;
  return (Array.isArray(request?.candidateEntityRefs) ? request.candidateEntityRefs : [])
    .find((candidate) => String(candidate?.type || "").toUpperCase() === "AGREEMENT" && Number(candidate?.id) > 0)?.id || 0;
}

export function resolveSelectedFinancialAgreementId({ baseResponse = {}, screenContext = null, message = "" } = {}) {
  const explicitId = Number(explicitAgreementIdFromSemanticPlan(baseResponse)) || 0;
  if (explicitId > 0) return explicitId;

  const text = normalizeText(message);
  const asksAgreementFinance = /(?:sozlesme|agreement|hakedis|fatura|mutabakat|tahsilat|alacak)/iu.test(text);
  if (!asksAgreementFinance) return 0;

  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : {};
  const selectedAgreementId = Number(facts.selectedAgreementId || facts.agreementId || 0) || 0;
  return Number.isSafeInteger(selectedAgreementId) && selectedAgreementId > 0 ? selectedAgreementId : 0;
}

function buildHomeReconciliationResponse({ baseResponse, screenPath, summary = [] } = {}) {
  const labels = {
    MATCHED: "sağlıklı/eşleşen",
    OVER_INVOICED: "fatura tutarı uyuşmazlığı",
    NO_HAKEDIS: "hakediş verisi eksik",
    NO_OPERATION: "operasyon kanıtı yok",
    REVIEW_REQUIRED: "inceleme gerekli",
  };
  const lines = summary.map((data) => `#${data.agreement?.id}: ${labels[upper(data.status)] || data.statusLabel || "incelenmeli"}`);
  const reply = lines.length
    ? `ROOM kapsamındaki hakediş/mutabakat özeti: ${lines.join("; ")}. Bu özet yalnızca yetkili salt-okunur reconciliation verisine dayanır; ödeme, onay veya fatura kesinleştirme başlatmıyorum.`
    : "ROOM kapsamındaki yetkili hakediş/mutabakat verisi bu turda bulunamadı; finansal sonuç uydurmuyorum.";
  return {
    ...baseResponse,
    provider: "local-canonical-agreement-reconciliation",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath: screenPath || baseResponse?.screenPath || null,
    reply,
    summary: reply,
    questionType: "PAYMENT_READINESS",
    questionLabel: "ROOM hakediş ve fatura mutabakat özeti",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    authorizedRecords: summary.map((data) => ({ type: "agreement", id: Number(data.agreement.id) })),
    retrievedFacts: lines,
    dataSources: ["ROOM tenant yetkili sözleşmeleri", "canonical hakediş/fatura reconciliation"],
    roleBoundary: "Yalnızca mevcut ROOM tenant kapsamındaki sözleşmelerin salt-okunur reconciliation kanıtı kullanıldı; işlem başlatılmadı.",
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Mutabakat önizlemesini aç",
      path: "/room/commercial-flow",
      routeParams: { tab: "settlement" },
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

async function loadRoomPaymentReadiness(user = {}) {
  const roomId = Number(user?.roomId || 0) || 0;
  if (String(user?.role || "").toUpperCase() !== "ROOM" || roomId <= 0) {
    return { roomId, account: null, paymentSources: [], activePaymentSources: [] };
  }
  const [accounts, paymentSources] = await Promise.all([
    prisma.paymentAccount.findMany({
      where: { ownerType: "ROOM", roomId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 1,
      select: { id: true, status: true, providerKey: true, label: true, maskedIban: true, updatedAt: true },
    }),
    prisma.commercialSource.findMany({
      where: { roomId, paymentModeSnapshot: { in: ["OPTIONAL", "REQUIRED"] } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      select: { id: true, sourceType: true, sourceKey: true, paymentModeSnapshot: true },
    }),
  ]);
  return {
    roomId,
    account: accounts[0] || null,
    paymentSources,
    activePaymentSources: paymentSources,
  };
}

function buildRoomPaymentReadinessResponse({ baseResponse, screenPath, summary = [], readiness = null, question = "" } = {}) {
  const account = readiness?.account || null;
  const accountStatus = String(account?.status || "MISSING").toUpperCase();
  const accountText = account
    ? `ROOM ödeme hesabı durumu: ${accountStatus}.`
    : "ROOM kapsamında ödeme hesabı kaydı bulunmuyor.";
  const sourceCount = Array.isArray(readiness?.activePaymentSources) ? readiness.activePaymentSources.length : 0;
  const sourceText = sourceCount
    ? `${sourceCount} yetkili OPTIONAL/REQUIRED ödeme kaynağı bulundu.`
    : "Yetkili OPTIONAL/REQUIRED ödeme kaynağı görünmüyor; ödeme hazırlığı etkin bir ödeme kaynağına bağlanmış değil.";
  const asksAccount = /ödeme\s+hesab/iu.test(String(question || ""));
  const stageText = account && ["ACTIVE", "VERIFIED"].includes(accountStatus)
    ? "Ödeme hazırlığı salt-okunur önizleme ve mutabakat kontrolü aşamasında."
    : "Ödeme hazırlığı salt-okunur önizleme aşamasında; eksik hesap/kaynak nedeniyle hazır sayılmıyor.";
  const labels = {
    MATCHED: "sağlıklı/eşleşen",
    OVER_INVOICED: "fatura tutarı uyuşmazlığı",
    NO_HAKEDIS: "hakediş verisi eksik",
    NO_OPERATION: "operasyon kanıtı yok",
    REVIEW_REQUIRED: "inceleme gerekli",
  };
  const reconciliationText = summary.length
    ? `Mutabakat kanıtı: ${summary.map((data) => `#${data.agreement?.id}: ${labels[upper(data.status)] || data.statusLabel || "incelenmeli"}`).join("; ")}.`
    : "Yetkili mutabakat kanıtı bu turda bulunamadı; finansal sonuç uydurmuyorum.";
  const reply = `${asksAccount ? accountText : stageText} ${sourceText} ${reconciliationText} Bu yüzey salt okunur önizlemedir; ödeme, onay veya muhasebe işlemi başlatmıyorum.`;
  return {
    ...baseResponse,
    provider: "local-room-payment-readiness",
    screenPath: screenPath || baseResponse?.screenPath || null,
    reply,
    summary: reply,
    questionType: asksAccount ? "PAYMENT_MISSING" : "PAYMENT_READINESS",
    questionLabel: asksAccount ? "ROOM ödeme hesabı hazırlığı" : "ROOM ödeme hazırlığı",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    authorizedRecords: summary.map((data) => ({ type: "agreement", id: Number(data.agreement?.id || 0) })).filter((item) => item.id > 0),
    retrievedFacts: [accountText, sourceText, ...summary.map((data) => `#${data.agreement?.id}: ${labels[upper(data.status)] || data.statusLabel || "incelenmeli"}`)],
    dataSources: ["ROOM tenant ödeme hesabı hazırlık metadata", "ROOM tenant commercial source readiness", "canonical hakediş/fatura reconciliation"],
    roleBoundary: "Yalnızca mevcut ROOM tenant kapsamındaki ödeme hazırlığı metadata ve salt-okunur reconciliation kanıtı kullanıldı; işlem başlatılmadı.",
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Hakediş önizlemesini aç",
      path: "/room/commercial-flow",
      routeParams: { tab: "settlement" },
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    guidedTarget: {
      status: "FOUND",
      targetKind: "CONTROL",
      targetKey: "room:commercial-flow:tab:settlement",
      identitySource: "CANONICAL",
      semanticId: "product:room:commercial-flow:tab:settlement",
      label: "Hakediş önizleme",
      semanticType: "tab",
      screenPath: screenPath || baseResponse?.screenPath || null,
      role: "Taşımacılık Firması",
      safeAction: "HIGHLIGHT",
    },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

async function loadSelectedAgreementFinanceEvidence(resolvedContext, user = {}, { invoiceId: requestedInvoiceId = 0, hakedisId = 0 } = {}) {
  if (String(resolvedContext?.type || "").toLowerCase() !== "agreement") return { reconciliationPreview: null, paymentAccount: null };
  const agreementId = Number(resolvedContext?.id || 0) || 0;
  if (!agreementId) return { reconciliationPreview: null, paymentAccount: null };
  const companyId = Number(resolvedContext?.companyId || 0) || 0;
  const roomId = Number(resolvedContext?.roomId || 0) || 0;
  const ownerFilters = [
    ...(companyId ? [{ ownerType: "COMPANY", companyId }] : []),
    ...(roomId ? [{ ownerType: "ROOM", roomId }] : []),
  ];
  const [reconciliationPreview, paymentAccount] = await Promise.all([
    buildAgreementReconciliationPreview({
      agreementId,
      invoiceId: Number(requestedInvoiceId) || null,
      hakedisId: Number(hakedisId) || null,
    }),
    ownerFilters.length
      ? prisma.paymentAccount.findFirst({ where: { OR: ownerFilters }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }] })
      : null,
  ]);
  const invoiceId = Number(reconciliationPreview?.data?.invoice?.id || 0) || 0;
  const effectiveRoomId = roomId
    || Number(reconciliationPreview?.data?.invoice?.roomId || reconciliationPreview?.data?.agreement?.roomId || 0)
    || 0;
  let collectionSummary = null;
  const role = String(user?.role || "").toUpperCase();
  const authorizedCollectionScope = (role === "ROOM" && Number(user?.roomId || 0) === effectiveRoomId)
    || (role === "COMPANY" && Number(user?.companyId || 0) === Number(reconciliationPreview?.data?.agreement?.companyId || 0));
  if (invoiceId && authorizedCollectionScope) {
    try {
      collectionSummary = await buildInvoiceCollectionSummary({ prisma, actor: user, invoiceId });
    } catch {
      collectionSummary = { status: "UNAVAILABLE", reason: "Tahsilat özeti doğrulanamadı." };
    }
  }
  return { reconciliationPreview, paymentAccount, collectionSummary };
}

async function loadAuthorizedCompanyAgreementFinanceEvidenceForUser({ user = {}, agreementId = 0, invoiceId = 0, hakedisId = 0 } = {}) {
  const id = Number(agreementId) || 0;
  const companyId = Number(user?.companyId) || 0;
  if (!id || String(user?.role || "").toUpperCase() !== "COMPANY" || !companyId) return null;
  const agreement = await prisma.agreement.findFirst({
    where: { id, companyId },
    select: { id: true, companyId: true, roomId: true },
  });
  if (!agreement) return null;
  return loadSelectedAgreementFinanceEvidence({
    type: "agreement",
    id: agreement.id,
    companyId: agreement.companyId,
    roomId: agreement.roomId,
  }, user, { invoiceId, hakedisId });
}

function selectedAgreementIdFromScreenContext(screenContext = null) {
  const selectedType = String(
    screenContext?.selectedEntityType
      || screenContext?.selectedRecordType
      || screenContext?.structuredFacts?.selectedEntityType
      || screenContext?.structuredFacts?.selectedRecordType
      || "",
  ).trim().toLowerCase();
  if (selectedType !== "agreement") return 0;
  return Number(
    screenContext?.selectedEntityId
      ?? screenContext?.selectedRecordId
      ?? screenContext?.structuredFacts?.selectedEntityId
      ?? screenContext?.structuredFacts?.selectedRecordId
      ?? 0,
  ) || 0;
}

export function selectedInvoiceIdFromScreenContext(screenContext = null) {
  return Number(
    screenContext?.selectedInvoiceId
      ?? screenContext?.structuredFacts?.selectedInvoiceId
      ?? screenContext?.liveFacts?.selectedInvoiceId
      ?? 0,
  ) || 0;
}

export function isCompanySelectedInvoiceFinanceQuestion({ user = {}, screenContext = null, message = "" } = {}) {
  if (String(user?.role || "").toUpperCase() !== "COMPANY") return false;
  const screenPath = String(screenContext?.path || "").split("?")[0];
  if (screenPath !== "/company/financial-operations") return false;
  if (String(screenContext?.selectedEntityType || screenContext?.structuredFacts?.selectedEntityType || "").toLowerCase() !== "agreement") return false;
  const selectedAgreementId = selectedAgreementIdFromScreenContext(screenContext);
  const selectedInvoiceId = selectedInvoiceIdFromScreenContext(screenContext);
  if (selectedAgreementId <= 0 || selectedInvoiceId <= 0) return false;
  return /(?:fatura|faturanın|faturanin|borç|borc|alacak|alacağ|alacag|tahsilat|ödeme|odeme|hakediş|hakedis|mutabakat)/iu.test(String(message || ""));
}

export function isRoomSelectedInvoiceAmountQuestion({ user = {}, screenContext = null, message = "" } = {}) {
  if (String(user?.role || "").toUpperCase() !== "ROOM") return false;
  const screenPath = String(screenContext?.path || "").split("?")[0];
  if (screenPath !== "/room/financial-operations") return false;
  if (String(screenContext?.selectedEntityType || screenContext?.structuredFacts?.selectedEntityType || "").toLowerCase() !== "agreement") return false;
  const selectedAgreementId = selectedAgreementIdFromScreenContext(screenContext);
  const selectedInvoiceId = selectedInvoiceIdFromScreenContext(screenContext);
  if (selectedAgreementId <= 0 || selectedInvoiceId <= 0) return false;
  return /(?:ne\s+kadar|tutar|öden(?:di|en)|kalan|alacak|borç|fatura|tahsilat|ödeme|hakediş|hakedis|mutabakat|banka|doğrulan|dogrulan|dekont)/iu.test(String(message || ""));
}

export function isUnselectedFinanceReconciliationQuestion({ baseResponse = {}, user = {}, screenContext = null, message = "" } = {}) {
  const role = String(user?.role || "").toUpperCase();
  const screenPath = String(screenContext?.path || baseResponse?.screenPath || "").split("?")[0];
  const supportedBuyerPath = /^\/(?:company|school|organization)\/financial-operations$/iu.test(screenPath);
  const supportedRoomPath = screenPath === "/room/financial-operations";
  const supportedRole = supportedRoomPath
    ? role === "ROOM"
    : supportedBuyerPath && ["COMPANY", "SCHOOL", "ORGANIZATION"].includes(role);
  if (!supportedRole) return false;

  const normalized = normalizeText(message);
  const receivableCue = /\b(?:alacak|alacag|alacağ|borc|borcum|borcumuz|hakedis|hakediş|fatura|tahsilat|odeme|ödeme|mutabakat)\p{L}*\b/iu.test(normalized);
  if (!receivableCue) return false;

  const explicitAgreementId = resolveSelectedFinancialAgreementId({ baseResponse, screenContext, message });
  const selectedAgreementId = selectedAgreementIdFromScreenContext(screenContext);
  if (explicitAgreementId > 0 || selectedAgreementId > 0) return false;

  // A general receivable question belongs to the finance/reconciliation
  // surface. Cost-draft continuation is handled separately and must not
  // reinterpret this request as a missing cost field.
  return !/(?:maliyet|gider|masraf|quote|teklif\s+tabani|kâr|kar|zarar|senaryo)/iu.test(normalized);
}

export function buildUnselectedFinanceReconciliationResponse({ baseResponse = {}, screenPath = "/room/financial-operations", message = "" } = {}) {
  const normalized = normalizeText(message);
  const buyerSurface = /^\/(?:company|school|organization)\//iu.test(screenPath);
  const surfaceLabel = screenPath.startsWith("/school/")
    ? "Okul Bütçe ve Servis Maliyeti"
    : screenPath.startsWith("/organization/")
      ? "Organizasyon Bütçe ve Servis Maliyeti"
      : screenPath.startsWith("/company/")
        ? "Bütçe ve Servis Maliyeti"
        : "Finansal Operasyonlar";
  const subject = /borc|borcum|borcumuz/iu.test(normalized)
    ? "kalan borç"
    : /fatura/iu.test(normalized)
      ? "bekleyen fatura"
      : /alacak|alacag|alacağ|tahsilat/iu.test(normalized)
        ? "kalan alacak"
        : "hakediş, fatura ve ödeme durumu";
  const commercialFlowPath = screenPath.startsWith("/school/")
    ? "/school/commercial-flow"
    : screenPath.startsWith("/organization/")
      ? "/organization/commercial-flow"
      : screenPath.startsWith("/company/")
        ? "/company/commercial-flow"
        : "/room/commercial-flow";
  const reply = `Bu ${surfaceLabel} görünümünde doğrulanmış ${subject} bilgisi görünmüyor. Yetkili bir sözleşme veya fatura seçili olmadığı ve gerçekleşmiş hizmet, hakediş, fatura ve tahsilat zinciri tamamlanmadığı için tutar veya bekleyen kayıt uydurmuyorum. Yetkili bir sözleşme ya da fatura seçtiğinde ${buyerSurface ? "borç ve " : ""}finans durumunu yalnızca kanıtlanmış kayıtlardan açıklayabilirim.`;
  return {
    ...baseResponse,
    provider: "local-finance-reconciliation-boundary",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath,
    reply,
    summary: reply,
    questionType: "FINANCE_RECONCILIATION_NOT_VERIFIED",
    activeTopic: "FINANCIAL_RECONCILIATION",
    assistantIntent: "FINANCIAL_RECONCILIATION",
    questionLabel: "Finansal mutabakat doğrulaması",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    authorizedRecords: [],
    retrievedFacts: [
      "Yetkili sözleşme veya fatura seçimi: yok",
      "Gerçekleşmiş hizmet, hakediş, fatura ve tahsilat zinciri: doğrulanmadı",
    ],
    dataSources: [`${surfaceLabel} görünümü`, "yetkili sözleşme/fatura seçimi", "canonical finans zinciri özeti"],
    evidenceConfidence: "Seçili bir sözleşme veya fatura bulunmadan tutar açıklanmadı; gerçekleşmiş finansal olay varsayılmadı.",
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Mutabakat görünümünü aç",
      path: commercialFlowPath,
      routeParams: { tab: "settlement" },
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath },
    roleBoundary: `Yalnızca ${buyerSurface ? "ilgili hizmet alan tenantın" : "ROOM tenantının"} mevcut yetki kapsamı değerlendirildi; sözleşme, fatura, ödeme veya tahsilat işlemi başlatılmadı.`,
    readOnly: true,
    writeAction: false,
    liveMutation: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true, notPaid: true, notInvoiced: true },
  };
}

async function loadAuthorizedSelectedAgreementReadiness({ user = {}, agreementId = 0 } = {}) {
  const id = Number(agreementId) || 0;
  const role = String(user?.role || "").toUpperCase();
  if (!id || !["COMPANY", "ROOM"].includes(role)) return null;
  const where = role === "COMPANY"
    ? { id, companyId: Number(user?.companyId || 0) || -1 }
    : { id, roomId: Number(user?.roomId || 0) || -1 };
  const agreement = await prisma.agreement.findFirst({
    where,
    select: { id: true, companyId: true, roomId: true },
  });
  if (!agreement) return null;
  const [sources, reconciliationPreview] = await Promise.all([
    prisma.commercialSource.findMany({
      where: { agreementId: agreement.id },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        sourceType: true,
        shiftRootId: true,
        paymentModeSnapshot: true,
        settlementStatus: true,
      },
    }),
    buildAgreementReconciliationPreview({ agreementId: agreement.id }),
  ]);
  return { agreement, source: sources[0] || null, reconciliationPreview };
}

function buildSelectedAgreementReadinessResponse({ baseResponse, screenPath, message, evidence } = {}) {
  const source = evidence?.source || null;
  const mode = String(source?.paymentModeSnapshot || "").toUpperCase();
  const modeLabel = mode === "REQUIRED" ? "Zorunlu" : mode === "OPTIONAL" ? "İsteğe bağlı" : mode === "OFF" ? "Kapalı" : "Tanımlı değil";
  const sourceText = source
    ? `Kaynak kaydı mevcut${source.shiftRootId ? `; kaynak vardiya #${source.shiftRootId}` : ""}.`
    : "Bu sözleşme için canonical ticari kaynak kaydı bulunmuyor.";
  const settlementText = source?.settlementStatus
    ? `Hazırlık durumu: ${String(source.settlementStatus).toLocaleLowerCase("tr-TR")}.`
    : "Hazırlık durumu için canonical settlement kaydı görünmüyor.";
  const text = String(message || "");
  const asksSource = /kaynak\s+(?:durumu|zinciri|vardiya)/iu.test(text);
  const asksReadiness = /ödeme\s+hazırlığı|odeme\s+hazirligi|hazırlık\s+(?:hangi|ne|durum)/iu.test(text);
  const reply = asksSource
    ? `Seçili Sözleşme #${evidence.agreement.id} kaynak durumu: ${sourceText} ${settlementText} Bu bilgi salt okunur önizlemedir; ödeme veya fatura işlemi başlatmıyorum.`
    : asksReadiness
      ? `Seçili Sözleşme #${evidence.agreement.id} için ödeme modeli ${modeLabel}. ${sourceText} ${settlementText} Bu ekran ödeme başlatmaz; hazırlık yalnızca salt okunur önizlemedir.`
      : `Seçili Sözleşme #${evidence.agreement.id} için ödeme modeli ${modeLabel}. ${sourceText} Bu bilgi salt okunur önizlemedir; ödeme veya fatura işlemi başlatmıyorum.`;
  return {
    ...baseResponse,
    provider: "local-canonical-selected-agreement-readiness",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath: screenPath || baseResponse?.screenPath || null,
    reply,
    summary: reply,
    questionType: asksSource ? "AGREEMENT_SOURCE_STATUS" : asksReadiness ? "PAYMENT_READINESS" : "PAYMENT_MODE",
    questionLabel: "Seçili sözleşme ödeme ve kaynak durumu",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    authorizedRecords: [{ type: "agreement", id: Number(evidence.agreement.id) }],
    retrievedFacts: [
      `Sözleşme #${evidence.agreement.id}`,
      `Ödeme modeli: ${modeLabel}`,
      sourceText,
      settlementText,
    ],
    dataSources: ["yetkili seçili sözleşme", "canonical commercial source", "salt-okunur settlement hazırlık metadata"],
    roleBoundary: "Yalnızca aynı oturumdaki yetkili seçili sözleşme kullanıldı; başka tenant kaydı okunmadı ve işlem başlatılmadı.",
    guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export function buildCompanyCommercialReconciliationResponse({ baseResponse = {}, screenPath = "/company/commercial-flow" } = {}) {
  const surfaceLabel = screenPath === "/company/agreements" ? "Sözleşmeler ekranındaki" : "Ticari Akışım'daki";
  const reply = `${surfaceLabel} Hakediş ve fatura mutabakat önizlemesini kontrol etmek için mevcut yetkili hedefi açıyorum. “Mutabakatı incele” ile Sözleşmeler ekranındaki ayrıntı köprüsüne geçilir; burada dönem, hakediş, fatura, fark ve operasyon kanıtı yalnız mevcut kayıtlardan okunur. Veri yoksa tutar uydurmuyorum; bu akış ödeme, fatura onayı veya muhasebe yazımı başlatmaz.`;
  return {
    ...baseResponse,
    provider: "local-company-commercial-reconciliation-guidance",
    screenPath,
    reply,
    summary: reply,
    questionType: "COMPANY_RECONCILIATION_GUIDANCE",
    questionLabel: "Hakediş ve fatura mutabakatı",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Mutabakatı incele",
      path: "/company/agreements?detail=bridge",
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    dataSources: ["COMPANY Ticari Akışım mutabakat önizlemesi", "yetkili sözleşme ve operasyon kanıtı"],
    evidenceConfidence: "Yalnız mevcut COMPANY Ticari Akışım önizleme ve yetkili sözleşme/operasyon kapsamı.",
    roleBoundary: "Yalnızca aynı COMPANY tenantının salt-okunur mutabakat önizlemesi kullanıldı; ödeme, fatura onayı veya muhasebe işlemi başlatılmadı.",
    guidedTarget: { status: "FOUND", targetKey: "company:commercial-flow:reconciliation", label: "Mutabakatı incele", screenPath },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export function buildCompanyAgreementDetailsGuidanceResponse({ baseResponse = {}, screenPath = "/company/commercial-flow", selectedAgreementId = 0 } = {}) {
  const id = Number(selectedAgreementId) || 0;
  const recordText = id > 0 ? ` Seçili sözleşme #${id} bağlamını koruyarak` : " Seçili sözleşme bağlamını koruyarak";
  const reply = `Sözleşmenin ayrıntılarını ve ödeme modelini görmek için${recordText} Sözleşmeler ekranındaki sözleşme kartını açıyorum. “Sözleşme ayrıntılarını aç” ile dönem, hizmet kapsamı, teklif tutarı ve ödeme/hakediş hazırlık durumunu salt okunur olarak inceleyebilirsin; ödeme, fatura onayı veya muhasebe yazımı başlatmıyorum.`;
  return {
    ...baseResponse,
    provider: "local-company-agreement-details-guidance",
    screenPath,
    reply,
    summary: reply,
    questionType: "COMPANY_AGREEMENT_DETAILS_GUIDANCE",
    questionLabel: "Sözleşme ayrıntıları ve ödeme modeli",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    authorizedRecords: id > 0 ? [{ type: "agreement", id }] : [],
    quickActions: [{
      actionKind: "OPEN_ROUTE",
      label: "Sözleşme ayrıntılarını aç",
      path: "/company/agreements?detail=bridge",
      safeNavigation: true,
      criticalActionExecution: false,
      writeAction: false,
    }],
    dataSources: ["yetkili COMPANY sözleşme bağlamı", "Sözleşmeler ekranı salt-okunur ayrıntı kartı"],
    evidenceConfidence: "Yalnızca aynı COMPANY tenantındaki seçili sözleşme ve görünür Sözleşmeler hedefi.",
    roleBoundary: "Yalnızca aynı COMPANY tenantındaki sözleşme bağlamı kullanıldı; başka tenant kaydı okunmadı ve işlem başlatılmadı.",
    guidedTarget: { status: "FOUND", targetKey: "company:agreements:details", label: "Sözleşme ayrıntılarını aç", screenPath: "/company/agreements" },
    readOnly: true,
    writeAction: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export function buildUnsupportedFinancialSurfaceResponse({ baseResponse, user = {}, screenPath, message = "", screenContext = null, reconciliationPreview = null, paymentAccount = null, collectionSummary = null }) {
  const selectedAgreementResponse = buildSelectedAgreementReconciliationResponse({
    baseResponse,
    screenPath,
    message,
    screenContext,
    reconciliationPreview,
    paymentAccount,
    collectionSummary,
  });
  if (selectedAgreementResponse) return selectedAgreementResponse;
  const roomAgreementPreview = visibleRoomAgreementPreviewContext(screenContext);
  if (roomAgreementPreview) {
    const text = normalizeText(message);
    const asksMissing = /(?:eksik|hazır değil|hazir degil|hesap.*eksik|yok)/.test(text);
    const asksStage = /(?:aşama|asama|hazırlık|hazirlik|durum)/.test(text);
    if (roomAgreementPreview.previewKind === "payment") {
      const reply = asksStage
        ? "Hakediş önizleme sekmesinde süreç şu an salt okunur önizleme aşamasında; ödeme başlatılmaz."
        : `Ticari Çalışma Alanı'ndaki Hakediş önizleme sekmesinde doğrulanabilir hakediş veya fatura tutarı görünmüyor${asksMissing ? "; bu nedenle ödeme hesabı hazır sayılmaz" : ""}. Bu ekran yalnızca önizlemedir; ödeme başlatılmaz.`;
      return {
        ...baseResponse,
        provider: "local-sefer-abi-cost-analysis",
        copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
        screenPath: screenPath || baseResponse?.screenPath || null,
        reply,
        summary: reply,
        questionType: asksStage ? "PAYMENT_READINESS" : "PAYMENT_MISSING",
        questionLabel: "Hakediş önizlemesi",
        responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
        evidenceConfidence: "Ticari Çalışma Alanı içindeki yetkili salt okunur Hakediş önizleme bağlamı ile sınırlı.",
        guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
        roleBoundary: "Seçili vardiya veya teklif hakediş kaydı olarak kullanılmadı; yalnızca görünür Hakediş önizleme sekmesi değerlendirildi.",
        safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
      };
    }
    const metricLine = roomAgreementPreview.metricLabels.length
      ? `${roomAgreementPreview.metricLabels.join(", ")} alanları bu önizlemede okunuyor.`
      : "Önizleme kartındaki hakediş, fatura ve fark alanları okunuyor.";
    const resultLine = asksMissing
      ? `Seçili Sözleşme #${roomAgreementPreview.agreementId} için ${roomAgreementPreview.noVisibleAmount ? "beklenen hakediş, fatura tutarı ve fark şu anda Veri yok görünüyor; hesap hazır değil." : "doğrulanabilir tutar veya tamamlanmış hakediş kanıtı yoksa hesap hazır sayılmaz."} ${metricLine}`
      : asksStage
        ? `Seçili Sözleşme #${roomAgreementPreview.agreementId} için süreç yalnızca önizleme aşamasında. ${metricLine} Ödeme başlatılmıyor.`
        : `Seçili Sözleşme #${roomAgreementPreview.agreementId} için hakediş ve fatura mutabakatı önizleme kartında gösteriliyor. ${metricLine}`;
    const reply = `${resultLine} Bu yüzey kayıt oluşturmaz, fatura kesinleştirmez ve ödeme başlatmaz; eksik kanıt varsa önizleme kartındaki eksik veri/kanıt ayrıntılarını kontrol et.`;
    return {
      ...baseResponse,
      provider: "local-sefer-abi-cost-analysis",
      copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
      screenPath: screenPath || baseResponse?.screenPath || null,
      reply,
      summary: reply,
      questionType: asksMissing ? "PAYMENT_MISSING" : "PAYMENT_READINESS",
      questionLabel: "Hakediş ve fatura mutabakat önizlemesi",
      responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
      evidenceConfidence: "Seçili sözleşme ekranındaki yetkili salt okunur önizleme bağlamı ile sınırlı.",
      guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
      roleBoundary: "Yalnızca seçili ROOM sözleşmesinin mevcut salt okunur önizleme bağlamı kullanıldı; kayıt, ödeme veya mutabakat işlemi yapılmadı.",
      safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
    };
  }
  const reply = "Bu ROOM finans ekranında hakediş, ödeme hazırlığı veya fatura mutabakatı için doğrulanabilir bir liste/hedef yok. Mevcut yetkili yüzey Teklif ve Kârlılık önizlemesi; burada kayıt, ödeme durumu ya da finansal hedef uydurmuyorum.";
  const financialNavigationAction = financialSurfaceNavigationAction({
    role: user?.role,
    message,
    screenPath,
    financeView: screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || "",
    focusVehicleId: screenContext?.structuredFacts?.selectedVehicleId,
    focusShiftId: screenContext?.structuredFacts?.selectedShiftId,
    focusAgreementId: screenContext?.structuredFacts?.selectedAgreementId,
  });
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath: screenPath || baseResponse?.screenPath || null,
    reply,
    summary: reply,
    questionType: "FINANCIAL_SURFACE_LIMITATION",
    questionLabel: "Finansal yüzey sınırı",
    responseSections: [{ kind: "SONUÇ", title: "SONUÇ", text: reply }],
    quickActions: financialNavigationAction ? [financialNavigationAction] : [],
    evidenceConfidence: "ROOM ekran sözleşmesi ve mevcut hedef metadatası ile sınırlı.",
    guidedTarget: { status: "NOT_FOUND", targetKey: null, screenPath: screenPath || baseResponse?.screenPath || null },
    roleBoundary: "Yalnızca mevcut ROOM yüzeyinin doğrulanabilir kapsamı kullanıldı; kayıt, ödeme veya mutabakat işlemi yapılmadı.",
    readOnly: true,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export function isCompanyBudgetDraftStatusQuestion({ role = "", message = "", screenPath = "", screenContext = null } = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : {};
  const normalized = normalizeText(message);
  const budgetLifecycleQuestion = /(?:bütçe|butce)/u.test(normalized)
    && /(?:taslak|aktifleştirilmedi|aktifleşmedi|onaylanmadı|gönderilmedi|neden)/u.test(normalized);
  const budgetEvidenceFollowUp = /(?:gerceklesen\s+harcama|hakediş|hakedis|fatura|odeme)/u.test(normalized)
    && /(?:var\s+mi|durumu|doğrulandı|dogrulandi|göster|goster|ne\s+durumda)/u.test(normalized);
  return String(role || "").toUpperCase() === "COMPANY"
    && String(screenPath || "").split("?")[0] === "/company/financial-operations"
    && Number.isSafeInteger(Number(facts.selectedBudgetPlanId || facts.budgetPlanId))
    && Number(facts.selectedBudgetPlanId || facts.budgetPlanId) > 0
    && String(facts.budgetStatus || "").toUpperCase() === "DRAFT"
    && (budgetLifecycleQuestion || budgetEvidenceFollowUp);
}

export function buildCompanyBudgetDraftStatusResponse({ baseResponse = {}, screenPath = "/company/financial-operations", screenContext = null, message = "" } = {}) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : {};
  const budgetPlanId = Number(facts.selectedBudgetPlanId || facts.budgetPlanId);
  const period = facts.periodStart || facts.periodEnd
    ? `${facts.periodStart || "başlangıç tarihi yok"} – ${facts.periodEnd || "bitiş tarihi yok"}`
    : "seçili dönem";
  const budgetAmount = finiteNumber(facts.budgetAmountMinor);
  const budgetAmountText = budgetAmount === null
    ? "planlanan bütçe tutarı doğrulanmadı"
    : `planlanan bütçe ${formatMoneyMinor(budgetAmount, facts.budgetCurrencyCode || "TRY")}`;
  const normalized = normalizeText(message);
  const budgetEvidenceFollowUp = /(?:gerceklesen\s+harcama|hakediş|hakedis|fatura|odeme)/u.test(normalized)
    && /(?:var\s+mi|durumu|doğrulandı|dogrulandi|göster|goster|ne\s+durumda)/u.test(normalized);
  const reply = budgetEvidenceFollowUp
    ? `Seçili Bütçe #${budgetPlanId} için doğrulanmış gerçekleşen harcama gösterilmiyor; ekran bunu “Doğrulanmadı” olarak işaretliyor. Tamamlanmış hizmet ve eşleşmiş fatura kanıtı bulunmadığı için hakediş, fatura veya ödeme tutarı uydurmuyorum; bu kanıtlar bütçe taahhüdünden ayrı tutuluyor.`
    : `Bütçe #${budgetPlanId} ${period} dönemi için taslak durumda; çünkü henüz aktifleştirilmemiş ve onay akışına gönderilmemiş. Bu ekranda ${budgetAmountText} olarak gösteriliyor; bu tutar gerçekleşen harcama, hakediş, fatura veya ödeme değildir. Sonraki desteklenen adım ekrandaki “Bütçeyi gönder” kontrolüdür; Sefer Abi bu adımı kendiliğinden çalıştırmaz.`;
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    screenPath,
    reply,
    summary: reply,
    questionType: "COMPANY_BUDGET_STATUS",
    questionLabel: "Bütçe yaşam döngüsü durumu",
    responseSections: [
      { kind: "SONUÇ", title: "SONUÇ", text: reply },
      { kind: "NEDEN", title: "NEDEN", text: "Taslak durumu, bütçe planının yaşam döngüsündeki onay/aktivasyon adımı tamamlanmadığı için gösteriliyor." },
      { kind: "GÜVENLİ SONRAKİ ADIM", title: "GÜVENLİ SONRAKİ ADIM", text: "Ekrandaki “Bütçeyi gönder” kontrolünü yetkili kullanıcı olarak inceleyebilirsin; bu konuşma hiçbir ticari veya finansal yazma işlemi yapmadı." },
    ],
    evidenceConfidence: "Seçili COMPANY bütçe planının yetkili ekran bağlamı kullanıldı; gerçekleşmiş finansal olay üretilmedi.",
    guidedTarget: { status: "FOUND", targetKey: budgetEvidenceFollowUp ? "company-budget-evidence" : "company-budget-submit", screenPath },
    roleBoundary: "Yalnızca yetkili COMPANY bütçe planı durumu açıklandı; hakediş, fatura, ödeme veya bütçe değişikliği yapılmadı.",
    readOnly: true,
    writeAction: false,
    liveMutation: false,
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true, notPaid: true, notInvoiced: true },
  };
}

export async function buildSeferAbiCostAnalysisResponse({
  baseResponse = {},
  user = {},
  message = "",
  screenContext = null,
  conversationState = null,
  resolvedEntityType = "screen",
  resolvedEntityId = 0,
  resolvedContext = null,
} = {}) {
  const request = detectCostAnalysisIntent({ message, screenContext, conversationState });
  const canonicalRequest = baseResponse?.semanticPlan?.canonicalRequest || null;
  const selectedInvoiceFinanceQuestion = isCompanySelectedInvoiceFinanceQuestion({
    user,
    screenContext,
    message,
  }) || isRoomSelectedInvoiceAmountQuestion({
    user,
    screenContext,
    message,
  });
  // A follow-up about an explicitly selected invoice must stay on the
  // invoice evidence path. The generic continuation handler otherwise
  // answers before the selected agreement/invoice readback is evaluated.
  const continuationResponse = selectedInvoiceFinanceQuestion
    ? null
    : selectedAgreementFinancialContinuationResponse({ baseResponse, screenContext, conversationState });
  if (continuationResponse) return continuationResponse;
  const requestedDomains = Array.isArray(baseResponse?.semanticPlan?.requestedDomains)
    ? baseResponse.semanticPlan.requestedDomains.map((domain) => String(domain).toUpperCase())
    : [];
  const financialObject = String(canonicalRequest?.typedEvidence?.object?.value || "").toUpperCase() === "FINANCIAL";
  const explicitFinanceRequest = requestedDomains.includes("FINANCE") || financialObject;
  const financeScreenPath = String(screenContext?.path || baseResponse?.screenPath || "").split("?")[0];
  const companyBudgetDraftStatusQuestion = isCompanyBudgetDraftStatusQuestion({
    role: user?.role,
    message,
    screenPath: financeScreenPath,
    screenContext,
  });
  if (companyBudgetDraftStatusQuestion) {
    return buildCompanyBudgetDraftStatusResponse({ baseResponse, screenPath: financeScreenPath, screenContext, message });
  }
  const reconciliationRequest = isFinanceReconciliationQuestion(message);
  const explicitAgreementId = resolveSelectedFinancialAgreementId({ baseResponse, screenContext, message });
  const selectedAgreementId = selectedAgreementIdFromScreenContext(screenContext);
  const companyFinancialEvidenceQuestion = String(user?.role || '').toUpperCase() === 'COMPANY'
    && financeScreenPath === '/company/financial-operations';
  if (companyFinancialEvidenceQuestion && selectedInvoiceFinanceQuestion) {
    const selectedInvoiceId = selectedInvoiceIdFromScreenContext(screenContext);
    const selectedHakedisId = Number(
      screenContext?.structuredFacts?.selectedHakedisId
        ?? screenContext?.liveFacts?.selectedHakedisId
        ?? 0,
    ) || 0;
    const financeEvidence = await loadAuthorizedCompanyAgreementFinanceEvidenceForUser({
      user,
      agreementId: selectedAgreementId,
      invoiceId: selectedInvoiceId,
      hakedisId: selectedHakedisId,
    });
    if (financeEvidence?.reconciliationPreview?.data?.invoice?.id === selectedInvoiceId) {
      return buildUnsupportedFinancialSurfaceResponse({
        baseResponse,
        user,
        screenPath: financeScreenPath,
        message,
        screenContext: {
          ...(screenContext || {}),
          selectedEntityType: "agreement",
          selectedEntityId: selectedAgreementId,
        },
        ...financeEvidence,
      });
    }
  }
  const roomFinancialEvidenceQuestion = String(user?.role || '').toUpperCase() === 'ROOM'
    && financeScreenPath === '/room/financial-operations'
    && isRoomSelectedInvoiceAmountQuestion({ user, screenContext, message });
  if (roomFinancialEvidenceQuestion) {
    const selectedInvoiceId = selectedInvoiceIdFromScreenContext(screenContext);
    const selectedHakedisId = Number(
      screenContext?.structuredFacts?.selectedHakedisId
        ?? screenContext?.liveFacts?.selectedHakedisId
        ?? 0,
    ) || 0;
    const financeEvidence = await loadAuthorizedAgreementFinanceEvidenceForUser({
      user,
      agreementId: selectedAgreementId,
      invoiceId: selectedInvoiceId,
      hakedisId: selectedHakedisId,
    });
    if (financeEvidence?.reconciliationPreview?.data?.invoice?.id === selectedInvoiceId) {
      return buildUnsupportedFinancialSurfaceResponse({
        baseResponse,
        user,
        screenPath: financeScreenPath,
        message,
        screenContext: {
          ...(screenContext || {}),
          selectedEntityType: "agreement",
          selectedEntityId: selectedAgreementId,
        },
        ...financeEvidence,
      });
    }
  }
  const selectedAgreementReadinessQuestionActive = selectedAgreementId > 0
    && /^\/(?:company|room)\/agreements$/iu.test(financeScreenPath)
    && /(?:ödeme\s+modeli|odeme\s+modeli|ödeme\s+modu|odeme\s+modu|kaynak\s+(?:durumu|zinciri|vardiya)|ödeme\s+hazırlığı|odeme\s+hazirligi)/iu.test(String(message || ""));
  if (selectedAgreementReadinessQuestionActive) {
    const readinessEvidence = await loadAuthorizedSelectedAgreementReadiness({ user, agreementId: selectedAgreementId });
    if (readinessEvidence) {
      return buildSelectedAgreementReadinessResponse({
        baseResponse,
        screenPath: financeScreenPath,
        message,
        evidence: readinessEvidence,
      });
    }
  }
  const buildFinanceSurfaceResponse = async () => {
    if (String(user?.role || "").toUpperCase() === "COMPANY"
      && ["/company/commercial-flow", "/company/agreements"].includes(financeScreenPath)
      && reconciliationRequest) {
      return buildCompanyCommercialReconciliationResponse({ baseResponse, screenPath: financeScreenPath });
    }
    if (explicitAgreementId > 0) {
      const financeEvidence = await loadAuthorizedAgreementFinanceEvidenceForUser({ user, agreementId: explicitAgreementId });
      if (financeEvidence) {
        const selectedScreenContext = {
          ...(screenContext || {}),
          selectedEntityType: "agreement",
          selectedEntityId: explicitAgreementId,
        };
        return buildUnsupportedFinancialSurfaceResponse({
          baseResponse,
          user,
          screenPath: financeScreenPath,
          message,
          screenContext: selectedScreenContext,
          ...financeEvidence,
        });
      }
      return buildUnsupportedFinancialSurfaceResponse({ baseResponse, user, screenPath: financeScreenPath, message, screenContext });
    }
    if (String(user?.role || "").toUpperCase() === "ROOM"
      && financeScreenPath === "/room/commercial-flow"
      && /(?:ödeme\s+hesab|ödeme\s+hazırlığı|odeme\s+hesab|odeme\s+hazirligi)/iu.test(String(message || ""))) {
      const [summary, readiness] = await Promise.all([
        loadRoomReconciliationSummary(user),
        loadRoomPaymentReadiness(user),
      ]);
      return buildRoomPaymentReadinessResponse({ baseResponse, screenPath: financeScreenPath, summary, readiness, question: message });
    }
    if (String(user?.role || "").toUpperCase() === "ROOM"
      && financeScreenPath === "/room/commercial-flow"
      && reconciliationRequest) {
      const summary = await loadRoomReconciliationSummary(user);
      return buildHomeReconciliationResponse({ baseResponse, screenPath: financeScreenPath, summary });
    }
    if (/hakedişlerimde|hakedislerimde|hakediş.*sorun|hakedis.*sorun/iu.test(String(message || ""))) {
      const summary = await loadRoomReconciliationSummary(user);
      return buildHomeReconciliationResponse({ baseResponse, screenPath: financeScreenPath, summary });
    }
    const financeEvidence = await loadSelectedAgreementFinanceEvidence(resolvedContext, user);
    return buildUnsupportedFinancialSurfaceResponse({ baseResponse, user, screenPath: financeScreenPath, message, screenContext, ...financeEvidence });
  };
  const companyAgreementDetailsRequest = String(user?.role || "").toUpperCase() === "COMPANY"
    && financeScreenPath === "/company/commercial-flow"
    && /(?:sözleşme|sozlesme|anlaşma|anlasma)/iu.test(String(message || ""))
    && /(?:ayrıntı|ayrinti|detay|ödeme\s+modeli|odeme\s+modeli|ödeme\s+modu|odeme\s+modu|nereden\s+incele)/iu.test(String(message || ""))
    && !/(?:hakediş|hakedis|fatura|mutabakat|reconciliation)/iu.test(String(message || ""));
  if (companyAgreementDetailsRequest) {
    return buildCompanyAgreementDetailsGuidanceResponse({
      baseResponse,
      screenPath: financeScreenPath,
      selectedAgreementId,
    });
  }
  if (isCostScenarioPreviewTruthQuestion({ message, screenPath: financeScreenPath })) {
    const reply = 'Hayır. Bu ekran yalnızca mevcut plan ve açık senaryo varsayımlarıyla çalışan salt okunur bir maliyet önizlemesidir; gerçekleşmiş ödeme, hakediş, fatura veya kesin net kâr değildir. Eksik bakım maliyeti ve belirsiz KDV nedeniyle net sonuç doğrulanmıyor; bu işlem canlı vardiya, bütçe veya muhasebe kaydı değiştirmiyor.';
    return {
      ...baseResponse,
      provider: 'local-sefer-abi-cost-analysis',
      copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
      screenPath: financeScreenPath,
      reply,
      summary: reply,
      questionType: 'PREVIEW_TRUTH_BOUNDARY',
      questionLabel: 'Maliyet önizlemesi sınırı',
      responseSections: [{ kind: 'SONUÇ', title: 'SONUÇ', text: reply }],
      evidenceConfidence: 'ROOM Maliyet Senaryosu ekranının canlı salt okunur önizleme sözleşmesi ile sınırlı.',
      guidedTarget: { status: 'NOT_FOUND', targetKey: null, screenPath: financeScreenPath },
      roleBoundary: 'Yalnızca yetkili ROOM Maliyet Senaryosu yüzeyi kullanıldı; finansal yazma veya kesin kâr sonucu üretilmedi.',
      readOnly: true,
      safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true, notPaid: true, notInvoiced: true },
    };
  }
  if (isCostScenarioPreviewMissingDataQuestion({ message, screenPath: financeScreenPath })) {
    const reply = 'Bakım maliyeti için doğrulanmış dönemsel bakım veya değişken gider kanıtı bulunmadığı için bu kalem önizlemeye dahil edilmedi. KDV bilgisi doğrulanmadığı için tutar brüt olarak tutuluyor; doğrulanmış net toplam ve kesin net kâr hesaplanmıyor. Bu eksiklikleri yetkili gider kaydıyla tamamlamak gerekir; bu ekran kendiliğinden gider, fatura veya ödeme oluşturmaz.';
    return {
      ...baseResponse,
      provider: 'local-sefer-abi-cost-analysis',
      copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
      screenPath: financeScreenPath,
      reply,
      summary: reply,
      questionType: 'PREVIEW_MISSING_DATA_EXPLANATION',
      questionLabel: 'Maliyet önizlemesi eksik veri açıklaması',
      responseSections: [{ kind: 'SONUÇ', title: 'SONUÇ', text: reply }],
      evidenceConfidence: 'ROOM Maliyet Senaryosu ekranının canlı eksik veri ve salt okunur önizleme sözleşmesi ile sınırlı.',
      guidedTarget: { status: 'NOT_FOUND', targetKey: null, screenPath: financeScreenPath },
      roleBoundary: 'Yalnızca yetkili ROOM Maliyet Senaryosu yüzeyi kullanıldı; gider, fatura, ödeme veya net kâr yazımı yapılmadı.',
      readOnly: true,
      safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true, notPaid: true, notInvoiced: true },
    };
  }
  // Invoice/reconciliation is not a cost-analysis result on the ROOM
  // financial surface.  Once the canonical request proves the financial
  // object, return the truthful unsupported-capability explanation before a
  // broad "nereden"/cost cue can manufacture a generic cost summary.
  if ((explicitFinanceRequest || explicitAgreementId > 0) && reconciliationRequest && !companyFinancialEvidenceQuestion) {
    return buildFinanceSurfaceResponse();
  }
  if (!request.isCostAnalysis) {
    if ((explicitFinanceRequest || explicitAgreementId > 0) && reconciliationRequest && !companyFinancialEvidenceQuestion) {
      return buildFinanceSurfaceResponse();
    }
    return baseResponse;
  }

  const roleKey = await roleKeyForUser(user);
  const screenPath = String(screenContext?.path || conversationState?.lastScreenPath || baseResponse?.screenPath || "").split("?")[0];
  const scope = scopeForRole(roleKey, screenPath);
  const effectiveScope = scope || (resolvedEntityType === "shift" && roleKey === "ROOM" ? "ROOM" : "");
  const financialAccess = getFinancialOperationsAccessForRole(roleKey);
  if (!financialAccess.visibleSurfaceIds.length) {
    return buildClarificationResponse({ baseResponse, request, roleKey, scope: null, screenPath, user });
  }
  if (!effectiveScope || (roleKey === "SUPER_ADMIN" && !user?.companyId && !user?.roomId && resolvedEntityType === "screen" && !/\/(?:room|company|school|organization)\//i.test(screenPath))) {
    return buildClarificationResponse({ baseResponse, request, roleKey, scope: effectiveScope, screenPath, user });
  }

  let baseline;
  const selectedContext = selectedFinancialScenarioContext(screenContext);
  try {
    baseline = await loadCostScenarioBaselineForUser({
      user,
      scope: effectiveScope,
      companyId: effectiveScope === "COMPANY" ? user?.companyId : null,
      roomId: effectiveScope === "ROOM" ? user?.roomId : null,
      focusAgreementId: effectiveScope === "ROOM" ? selectedContext.focusAgreementId : null,
      focusShiftId: effectiveScope === "ROOM" ? selectedContext.focusShiftId : null,
    });
  } catch {
    return buildClarificationResponse({ baseResponse, request, roleKey, scope: effectiveScope, screenPath, user });
  }

  const canonicalFinancial = await loadCanonicalFinancialEvidence({ user, baseline, screenContext });
  const companyPriceBudgetKind = effectiveScope === "COMPANY" ? companyPriceBudgetQuestionKind(message) : null;
  const companyPriceBudgetResponse = companyPriceBudgetKind
    ? buildCompanyPriceBudgetAdvisoryResponse({
      kind: companyPriceBudgetKind,
      advisory: canonicalFinancial?.companyPriceBudgetAdvisory,
      commitmentSummary: canonicalFinancial?.financePreview?.commitmentSummary || null,
      historicalFinancialEvidence: canonicalFinancial?.historicalFinancialEvidence || [],
    })
    : null;
  const independentRouteQuoteAdvice = baseResponse?.semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.independentRouteQuoteAdviceEvidence === true;
  const independentPlanningMode = independentRouteQuoteAdvice
    && effectiveScope === "ROOM"
    && canonicalFinancial?.commercialContext?.type === "NONE";
  const canonicalQuoteFloorQuestion = baseResponse?.semanticPlan?.canonicalRequest?.domain === "BUDGET"
    && baseResponse?.semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
  const manualMetricMinor = canonicalFinancial?.financePreview?.roomProfitability?.costInputs?.manualBaselineOperationalCostMinor
    ?? canonicalFinancial?.financePreview?.baselineOperationalCostMinor
    ?? null;
  const manualMetricSource = canonicalFinancial?.financePreview?.roomProfitability?.costInputs?.manualBaselineOperationalCostMinor != null
    ? "Manuel maliyet girdisi"
    : "Kanonik finans önizlemesi";
  let scenarioOverrides = { ...(selectedContext.scenarioOverrides || {}) };
  if (request.family === "WHAT_IF_SCENARIO"
    || independentRouteQuoteAdvice
    || request.questionIntent === "VEHICLE_RECOMMENDATION"
    || request.questionIntent === "MULTI_ROUTE_RANKING"
    || request.questionIntent === "SAVINGS_OPPORTUNITY") {
    scenarioOverrides = {
      ...scenarioOverrides,
      ...extractScenarioOverrides(message, baseline?.input),
    };
  }
  if (independentRouteQuoteAdvice) {
    scenarioOverrides = carryIndependentRouteScenarioContext({
      currentOverrides: scenarioOverrides,
      conversationState,
      isFollowUp: request.isFollowUp,
    });
  }
  const firstReference = await getReferenceLayers({
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    currencyCode: baseline?.input?.currencyCode || "TRY",
    regionName: canonicalFinancial.regionName || undefined,
    scope: effectiveScope,
    actualValueMinor: effectiveScope === "COMPANY" ? baseline?.actualEvidence?.actualCostMinor : null,
    actualUnit: "CURRENCY_PER_TRIP",
    refresh: "true",
  }, user);
  const externalLayer = (firstReference?.layers || []).find((layer) => layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.available && upper(layer?.freshness) === "FRESH");
  const fuelIncrease = applyFuelIncreaseOverride(scenarioOverrides, message, baseline?.input, firstReference);
  scenarioOverrides = independentPlanningMode
    ? materializeIndependentRoutePeriodOverrides(fuelIncrease.overrides)
    : fuelIncrease.overrides;
  const scenarioPreview = await buildCostScenarioPreviewFromBaseline({
    user,
    baseline,
    scenarioOverrides,
    externalReference: externalLayer ? { marketReference: externalLayer } : null,
    independentRouteQuoteAdvice: independentPlanningMode,
  });
  const finalReference = await getReferenceLayers({
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    currencyCode: scenarioPreview?.currencyCode || baseline?.input?.currencyCode || "TRY",
    regionName: canonicalFinancial.regionName || undefined,
    scope: effectiveScope,
    actualValueMinor: effectiveScope === "COMPANY" ? baseline?.actualEvidence?.actualCostMinor : null,
    actualUnit: "CURRENCY_PER_TRIP",
    operationalCostMinor: scenarioPreview?.baseline?.costMinor,
    quoteFloorMinor: canonicalFinancial?.financePreview?.quoteFloor?.quoteFloorMinor,
    refresh: "true",
  }, user);

  const screenFacts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : screenContext?.liveFacts && typeof screenContext.liveFacts === "object"
      ? screenContext.liveFacts
      : {};
  const hasExplicitActualCostFact = Object.prototype.hasOwnProperty.call(screenFacts, "actualCostMinor");
  const canonicalDecisionActualCostMinor = effectiveScope === "ROOM" && !hasExplicitActualCostFact
    ? finiteNumber(
      canonicalFinancial?.decisionLayer?.contractMonthDecision?.realizedActualCostMinor
        ?? canonicalFinancial?.decisionLayer?.vehicleMonthDecision?.distributedActualCostMinor
        ?? canonicalFinancial?.decisionLayer?.vehicleMonthDecision?.grossActualCostMinor,
    )
    : null;
  const roomActualCostMinor = effectiveScope === "ROOM"
    ? resolveAuthorizedActualCostMinor({
      scope: effectiveScope,
      screenContext,
      financePreview: canonicalFinancial.financePreview,
      actualCostFallbackMinor: canonicalDecisionActualCostMinor,
    })
    : null;
  const missing = missingData({ baseline, financePreview: canonicalFinancial.financePreview, referenceLayers: finalReference, scenarioPreview });
  const independentRouteMissingCostQuestion = independentRouteQuoteAdvice
    ? buildIndependentRouteMissingCostQuestion({ scenarioPreview })
    : null;
  const changed = changedDimensionLabels(scenarioPreview);
  const hasScenarioInput = Object.keys(scenarioOverrides).length > 0;
  const completeness = costCompleteness({
    baseline,
    financePreview: canonicalFinancial.financePreview,
    scenarioPreview,
    referenceLayers: finalReference,
    scope: effectiveScope,
    actualCostFallbackMinor: canonicalDecisionActualCostMinor,
    actualCostMinorOverride: effectiveScope === "ROOM" ? roomActualCostMinor : undefined,
  });
  const routeQuoteDecision = independentRouteQuoteAdvice && effectiveScope === "ROOM"
    ? buildIndependentRouteQuoteDecision({
      scenarioPreview,
      quoteFloor: canonicalFinancial?.financePreview?.quoteFloor,
      currentOfferMinor: canonicalFinancial?.financePreview?.quoteFloor?.currentCommercialAmountMinor ?? null,
      passengerCount: scenarioPreview?.dimensions?.passengerCount?.scenario ?? baseline?.input?.passengerCount ?? null,
    })
    : null;
  const commercialProfitability = buildCommercialProfitability({
    scope: effectiveScope,
    financePreview: canonicalFinancial.financePreview,
    commercialContext: canonicalFinancial.commercialContext,
    scenarioPreview,
  });
  const contractProfitability = buildCommercialProfitability({
    scope: effectiveScope,
    financePreview: canonicalFinancial.financePreview,
    commercialContext: canonicalFinancial.commercialContext,
    scenarioPreview,
    agreementOnly: true,
  });
  const needsRouteRanking = ["MULTI_ROUTE_RANKING", "SAVINGS_OPPORTUNITY"].includes(request.questionIntent);
  const routeRanking = needsRouteRanking
    ? await buildRouteRanking({
      user,
      baseline,
      scope: effectiveScope,
      externalReference: externalLayer ? { marketReference: externalLayer } : null,
    })
    : null;
  const vehicleAlternatives = scenarioPreview?.vehiclePlanAlternatives || null;
  const vehicleRecommendation = vehicleAlternatives?.recommendation || null;
  const vehicleFleetAvailability = publicVehiclePlanFleetAvailabilitySummary(vehicleAlternatives);
  const capacityVehiclePlan = vehicleAlternatives?.items?.find((item) => upper(item.vehicleType) === upper(baseline?.input?.vehicleType))
    || vehicleAlternatives?.items?.find((item) => item?.requiredVehicleCount != null)
    || null;
  const currentPlan = baselinePlanText(baseline, scenarioOverrides);
  const profitabilityCostLabel = completeness.costLevel === "ACTUAL"
    ? "gerçekleşen"
    : completeness.costLevel === "OPERATIONAL_ESTIMATE"
      ? "operasyonel tahmini"
      : "kısmi tahmini";
  const partialProfitabilityQualifier = completeness.costLevel === "PARTIAL"
    ? " Bu fark tam kârlılık sonucu değildir; eksik maliyet kalemleri sonucu artırabilir."
    : "";
  const quoteFloorCalculationFollowUp = canonicalQuoteFloorQuestion
    && (request.isFollowUp || DEICTIC_FINANCIAL_FOLLOW_UP_PATTERN.test(normalizeText(message)));
  const quoteFloorCalculationBreakdown = quoteFloorCalculationFollowUp
    ? buildQuoteFloorCalculationBreakdown({
      quoteFloor: canonicalFinancial?.financePreview?.quoteFloor,
      currencyCode: canonicalFinancial?.financePreview?.currencyCode || "TRY",
    })
    : "";
  const fuelAnswer = buildFuelCostAnswer({
    message,
    financePreview: canonicalFinancial?.financePreview,
    scenarioPreview,
    currencyCode: canonicalFinancial?.financePreview?.currencyCode || scenarioPreview?.currencyCode || "TRY",
  });
  const routeEvidenceQuestion = /vardiyan(?:in|nin)?\s+(?:rota\s+)?kilomet(?:re|resi).*eksik|kilomet(?:re|resi).*vardiya.*eksik/.test(normalizeText(message));
  const routeDistance = finiteNumber(baseline?.input?.serviceDistanceKm);
  const routeDuration = finiteNumber(baseline?.input?.routeDurationMinutes);
  const routeEvidenceText = routeDistance !== null && routeDistance > 0
    ? `Bu vardiyanın rota mesafesi eksik değil: ${formatNumber(routeDistance)} km${routeDuration !== null && routeDuration > 0 ? ` ve ${formatNumber(routeDuration, 0)} dk rota süresi` : ""}. Değer, seçili vardiyanın kaydedilmiş rota kanıtından okunuyor; 0 veya başka vardiyanın verisi kullanılmadı.`
    : "Seçili vardiya için kaydedilmiş rota mesafesi bulunamadı; 0 km göstermiyorum. Yetkili Vardiya ayrıntısından rota/kullanım kanıtı tamamlanmadan maliyet karşılaştırması kesinleştirilemez.";
  const completionEvidenceQuestion = /(?:bu bilgiyi|eksik.*(?:nereden|nasıl)|tamamla|tamamlayabilirim|(?:bunu|bu\s+(?:alanı|bilgiyi|varsayımı|tutarı)).*(?:nereden|nasıl).*(?:değiştir|degistir|tamam|bul))/iu.test(normalizeText(message));
  const completionEvidenceText = missing.length
    ? `Seçili kayıt (${currentPlan}) için tamamlanması gereken kanıtlar: ${missing.join(", ")}. Eksik alanı sıfır veya başka vardiyanın verisiyle doldurmuyorum; aynı yetkili finans/operasyon ekranındaki ilgili tamamlayıcı bağlantıdan kontrol edilmesi gerekir.`
    : `Seçili kayıt için zorunlu maliyet ve operasyon kanıtları mevcut görünüyor. Kapsam: ${currentPlan}. Bu nedenle yeni bir finans kaydı uydurmuyorum; kaynak gider ayrıntıları ve rota/varlık bağlantıları aynı Servis Maliyeti ekranındaki kanıt satırlarından incelenebilir.`;
  const quoteFloorMinor = finiteNumber(canonicalFinancial?.financePreview?.quoteFloor?.quoteFloorMinor);
  const commercialAmountMinor = finiteNumber(commercialProfitability?.amountMinor);
  const expectedGainMinor = quoteFloorMinor !== null && commercialAmountMinor !== null
    ? commercialAmountMinor - quoteFloorMinor
    : null;
  const actualGapMinor = finiteNumber(commercialProfitability?.profitMinor);
  const actualCostMinor = finiteNumber(commercialProfitability?.costMinor);
  const profitabilityResultText = commercialProfitability.status === "READY"
    ? expectedGainMinor !== null && actualGapMinor !== null
      ? `${commercialProfitability.sourceLabel} için beklenen kazanç (teklif − planlama maliyeti): ${formatMoneyMinor(expectedGainMinor, scenarioPreview?.currencyCode || "TRY")}. Kanıtlı gerçekleşmiş gider sonrası geçici fark: ${formatMoneyMinor(actualGapMinor, scenarioPreview?.currencyCode || "TRY")}. KDV ve diğer netleştirme kanıtları tamamlanmadığı için bu kesin net kâr değildir.`
      : `${commercialProfitability.sourceLabel} için ${profitabilityCostLabel} maliyet sonrası ${formatMoneyMinor(Math.abs(commercialProfitability.profitMinor), scenarioPreview?.currencyCode || "TRY")} ${commercialProfitability.profitMinor >= 0 ? "kalan fark" : "zarar"} görünüyor.${partialProfitabilityQualifier} Bu değer kesin net kâr değildir.`
    : `${commercialProfitability.sourceLabel}; teklif ve kanonik maliyet birlikte karşılaştırılamadığı için kazanç/kalan fark sonucu kesinleştirilmedi.`;
  const actualVsEstimateResultText = actualCostMinor !== null && quoteFloorMinor !== null
    ? `Planlama maliyeti: ${formatMoneyMinor(quoteFloorMinor, scenarioPreview?.currencyCode || "TRY")}. Kanıtlı gerçekleşmiş gider: ${formatMoneyMinor(actualCostMinor, scenarioPreview?.currencyCode || "TRY")}. Gerçekleşen gider planlama maliyetinden ${actualCostMinor < quoteFloorMinor ? formatMoneyMinor(quoteFloorMinor - actualCostMinor, scenarioPreview?.currencyCode || "TRY") + " daha düşük" : actualCostMinor > quoteFloorMinor ? formatMoneyMinor(actualCostMinor - quoteFloorMinor, scenarioPreview?.currencyCode || "TRY") + " daha yüksek" : "aynı"}. Bu karşılaştırma geçici farktır; kesin net kâr değildir.`
    : "Gerçekleşen gider ile planlama tahminini aynı kanıt kapsamına bağlayamadım; fark uydurmuyorum.";
  const quoteSourceQuestion = String(screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || "").trim().toLowerCase() === "quote-profitability"
    && /(?:rakam|tutar|kaynak|nereden)/iu.test(String(message || ""));
  const quoteSourceResultText = commercialProfitability.status === "READY"
    ? `${commercialProfitability.sourceLabel} kaynak özeti: teklif ${formatMoneyMinor(commercialAmountMinor, scenarioPreview?.currencyCode || "TRY")}; planlama maliyeti ${quoteFloorMinor !== null ? formatMoneyMinor(quoteFloorMinor, scenarioPreview?.currencyCode || "TRY") : "doğrulanamadı"}; beklenen kazanç ${expectedGainMinor !== null ? formatMoneyMinor(expectedGainMinor, scenarioPreview?.currencyCode || "TRY") : "doğrulanamadı"}; kanıtlı gerçekleşmiş gider ${actualCostMinor !== null ? formatMoneyMinor(actualCostMinor, scenarioPreview?.currencyCode || "TRY") : "doğrulanamadı"}; gerçekleşmiş gider farkı ${actualGapMinor !== null ? formatMoneyMinor(actualGapMinor, scenarioPreview?.currencyCode || "TRY") : "doğrulanamadı"}. Bu tutarlar farklı ekonomik kapsamları gösterir; kesin net kâr değildir.`
    : "Teklif, planlama maliyeti ve gerçekleşmiş gider aynı kanıt kapsamına bağlanamadı; kaynak tutarı uydurmuyorum.";
  const roomDecisionExplanation = effectiveScope === "ROOM"
    ? buildRoomFinancialDecisionExplanation({
      user,
      message,
      questionIntent: request.questionIntent,
      screenContext: { ...(screenContext || {}), path: screenContext?.path || screenPath },
      decisionLayer: {
        vehicleMonthDecision: canonicalFinancial?.decisionLayer?.vehicleMonthDecision || null,
        contractMonthDecision: canonicalFinancial?.decisionLayer?.contractMonthDecision || null,
        newOfferDecision: routeQuoteDecision || canonicalFinancial?.decisionLayer?.newOfferDecision || null,
      },
      financePreview: canonicalFinancial.financePreview,
      commercialContext: canonicalFinancial.commercialContext,
      routeAdvice: independentRouteQuoteAdvice
        ? {
          independent: true,
          scenarioStatus: scenarioPreview?.status || null,
          scenarioCostCoverage: scenarioPreview?.costCoverage?.scenario?.status || null,
          routeDistanceKm: scenarioOverrides.dailyServiceDistanceKm
            ?? scenarioOverrides.dailyTotalDistanceKm
            ?? scenarioPreview?.dimensions?.serviceDistanceKm?.scenario
            ?? scenarioPreview?.dimensions?.totalDistanceKm?.scenario
            ?? null,
          routeTotalDistanceKm: scenarioPreview?.dimensions?.totalDistanceKm?.scenario ?? null,
          routeDurationMinutes: scenarioOverrides.dailyRouteDurationMinutes
            ?? scenarioPreview?.dimensions?.routeDurationMinutes?.scenario
            ?? null,
          serviceDayCount: scenarioPreview?.dimensions?.serviceDayCount?.scenario ?? null,
          emptyDistanceKm: scenarioOverrides.dailyEmptyDistanceKm
            ?? scenarioPreview?.dimensions?.emptyDistanceKm?.scenario
            ?? null,
          passengerCount: scenarioPreview?.dimensions?.passengerCount?.scenario ?? null,
          vehicleLabel: {
            MINIBUS: "Minibüs",
            MIDIBUS: "Midibüs",
            OTOBUS: "Otobüs",
          }[String(scenarioPreview?.dimensions?.vehicleType?.scenario || "").toUpperCase()] || null,
          shiftCount: scenarioOverrides.dailyShiftCount ?? scenarioOverrides.shiftCount ?? null,
          scenarioCostComponents: scenarioPreview?.scenario?.componentBreakdown || [],
          confidenceText: confidenceLabel(scenarioPreview?.confidence?.level, scenarioPreview?.confidence?.score),
          economicReliabilityText: scenarioPreview?.economicReliability?.userMessage || null,
          missingCostQuestion: independentRouteMissingCostQuestion,
        }
        : null,
      now: new Date(),
    })
    : null;
  const roomCommercialEvidence = canonicalFinancial?.commercialEvidence || null;
  const canonicalQuoteFloor = canonicalFinancial?.financePreview?.quoteFloor || null;
  const previewActualCanonicalCostMinor = finiteNumber(canonicalFinancial?.financePreview?.roomProfitability?.actualOperationalCostMinor);
  const actualCanonicalCostMinor = effectiveScope === "ROOM"
    ? roomActualCostMinor
    : previewActualCanonicalCostMinor !== null && previewActualCanonicalCostMinor > 0
      ? previewActualCanonicalCostMinor
      : canonicalDecisionActualCostMinor;
  const planningCanonicalCostMinor = canonicalQuoteFloor?.baselineOperationalCostMinor
    ?? canonicalFinancial?.financePreview?.baselineOperationalCostMinor
    ?? commercialProfitability?.costMinor
    ?? null;
  const canonicalNewOffer = routeQuoteDecision || canonicalFinancial?.decisionLayer?.newOfferDecision || null;
  const selectedScenarioCostMinor = finiteNumber(selectedContext.selectedScenarioCostMinor);
  const selectedOfferMinor = finiteNumber(
    selectedContext.selectedOfferMinor
      ?? canonicalFinancial?.financePreview?.snapshot?.currentCommercialAmountMinor
      ?? canonicalFinancial?.financePreview?.quoteFloor?.currentCommercialAmountMinor,
  );
  const commercialReferenceText = buildCommercialReferenceText({
    scope: effectiveScope,
    message,
    commercialEvidence: roomCommercialEvidence,
    currentCanonicalCostMinor: selectedScenarioCostMinor ?? actualCanonicalCostMinor ?? planningCanonicalCostMinor,
    currentCanonicalCostLabel: selectedScenarioCostMinor !== null
      ? "Seçili senaryo planlama maliyeti"
      : actualCanonicalCostMinor !== null
      ? "Güncel doğrulanmış brüt gerçekleşen maliyet"
      : "Güncel kanonik planlama maliyeti",
    currentOfferMinor: selectedOfferMinor,
    selectedScenarioId: selectedContext.selectedScenarioId,
    selectedScenarioPeriodPlanning: selectedContext.selectedScenarioPeriodPlanning,
    recommendedOfferMinor: canonicalNewOffer?.quoteFloorMinor ?? null,
    quoteFloorEvidence: canonicalFinancial?.financePreview?.quoteFloor
      ? {
        ...canonicalFinancial.financePreview.quoteFloor,
        periodPlanning: canonicalFinancial.financePreview.periodPlanning || null,
      }
      : null,
    currencyCode: canonicalFinancial?.financePreview?.currencyCode || "TRY",
  });
  const forecastPlanningShareText = effectiveScope === "ROOM"
    ? buildForecastPlanningShareExplanation({
      forecastAllocation: canonicalFinancial?.financePreview?.roomCostForecastAllocation
        || canonicalFinancial?.financePreview?.roomCostPlanningEvidence?.forecastAllocation
        || null,
      currencyCode: canonicalFinancial?.financePreview?.currencyCode || "TRY",
      actualCostMinor: actualCanonicalCostMinor,
    })
    : "";
  const resultTextBase = companyPriceBudgetResponse?.resultText
    || (routeEvidenceQuestion
    ? routeEvidenceText
    : completionEvidenceQuestion
    ? completionEvidenceText
    : quoteSourceQuestion
    ? quoteSourceResultText
    : fuelAnswer
    ? fuelAnswer.resultText
    : request.metricIdentity === "MANUAL_FINANCIAL_PREVIEW_COST"
    ? manualMetricMinor != null
      ? `Finans önizlemesindeki tahmini maliyet: ${formatMoneyMinor(manualMetricMinor, canonicalFinancial.financePreview.currencyCode || "TRY")}. Kaynak: ${manualMetricSource}; bu değer teklif tabanı hesabının maliyet girdisidir ve operasyonel maliyet modelinden ayrıdır.`
      : "Finans önizlemesindeki tahmini maliyet için yetkili bir tutar bulunamadı; değer uydurulmadı."
    : request.metricIdentity === "OPERATIONAL_COST_MODEL_ESTIMATE"
      ? `${costLevelText(completeness, scenarioPreview)} Kaynak: operasyonel maliyet modeli; araç, kişi, durak, km ve süre girdileriyle salt okunur önizleme üretildi.`
    : canonicalQuoteFloorQuestion && !independentRouteQuoteAdvice
    ? canonicalFinancial?.financePreview?.quoteFloor?.quoteFloorMinor !== null
      && canonicalFinancial?.financePreview?.quoteFloor?.quoteFloorMinor !== undefined
      ? isEconomicallyProvenQuoteFloor({
        ...canonicalFinancial.financePreview.quoteFloor,
        periodPlanning: canonicalFinancial.financePreview.periodPlanning || null,
      })
        ? `Kanonik teklif tabanı toplamı: ${formatMoneyMinor(canonicalFinancial.financePreview.quoteFloor.quoteFloorMinor, canonicalFinancial.financePreview.currencyCode || "TRY")}.${quoteFloorCalculationBreakdown ? ` ${quoteFloorCalculationBreakdown}.` : ""} Bu değer salt okunur önizlemedir; teklif göndermez veya değişiklik uygulamaz.`
        : `Kısmi planlama teklif önizlemesi: ${formatMoneyMinor(canonicalFinancial.financePreview.quoteFloor.quoteFloorMinor, canonicalFinancial.financePreview.currencyCode || "TRY")}.${quoteFloorCalculationBreakdown ? ` ${quoteFloorCalculationBreakdown}.` : ""} Tam ekonomik kanıt oluşmadı; bu değer kesin teklif tabanı değildir ve teklif göndermez.`
      : "Kanonik teklif tabanı toplamı için doğrulanabilir bir değer bulunamadı; eksik veriyi sıfır kabul etmiyorum."
    : roomDecisionExplanation?.handled
      ? roomDecisionExplanation.resultText
    : request.questionIntent === "MULTI_ROUTE_RANKING"
      ? routeRanking?.status === "READY"
      ? `Karşılaştırılan rotalar içinde en pahalı kanonik rota ${routeRanking.mostExpensive.label}: ${formatMoneyMinor(routeRanking.mostExpensive.costMinor, routeRanking.mostExpensive.currencyCode)}.`
      : routeRanking?.reason || "Maliyet sıralaması için karşılaştırılabilir rota kanıtı eksik."
    : request.questionIntent === "VEHICLE_RECOMMENDATION"
      ? vehicleRecommendation
        ? `${vehicleRecommendation.vehicleLabel} planı ${formatNumber(vehicleRecommendation.requiredVehicleCount, 0)} araç ile kapasiteyi karşılayan hesaplanabilir adaylar içinde öne çıkıyor.`
        : capacityVehiclePlan
          ? `${vehicleFleetAvailability ? `${vehicleFleetAvailability} ` : ""}Kapasite açısından ${capacityVehiclePlan.vehicleLabel} planı ${formatNumber(capacityVehiclePlan.requiredVehicleCount, 0)} araç gerektiriyor; maliyet açısından en iyi aday yakıt ve diğer maliyet kanıtı olmadan seçilmedi. ${publicVehiclePlanRouteSummary(vehicleAlternatives, scenarioPreview?.currencyCode || "TRY")}`.trim()
          : vehicleAlternatives?.reason || "Araç önerisi için karşılaştırılabilir kapasite ve maliyet kanıtı yok; öneri uydurulmadı."
    : request.questionIntent === "SAVINGS_OPPORTUNITY"
      ? routeRanking?.status === "READY"
        ? `En düşük maliyetli kanonik rota ${routeRanking.best.label}: ${formatMoneyMinor(routeRanking.best.costMinor, routeRanking.best.currencyCode)}. Bu bir preview sıralamasıdır.`
        : scenarioPreview?.savingsMinor != null
          ? `Açık senaryo varsayımı mevcut plana göre tahmini ${formatMoneyMinor(scenarioPreview.savingsMinor, scenarioPreview.currencyCode)} tasarruf sinyali veriyor.`
          : "Kanıtlanmış bir tasarruf fırsatı yok; eksik maliyet verisi nedeniyle değer uydurulmadı."
    : request.questionIntent === "CONTRACT_PROFITABILITY"
      ? contractProfitability.status === "READY"
        ? `${contractProfitability.sourceLabel} bağlamında ${profitabilityCostLabel} maliyet sonrası ${formatMoneyMinor(Math.abs(contractProfitability.profitMinor), scenarioPreview?.currencyCode || "TRY")} ${contractProfitability.profitMinor >= 0 ? "kalan fark" : "zarar"} görünüyor.${partialProfitabilityQualifier}`
        : `${contractProfitability.sourceLabel}; yetkili bir gerçek sözleşme ve kanonik maliyet birlikte karşılaştırılamadığı için sözleşme kârlılığı kesinleştirilmedi.`
    : request.questionIntent === "OFFER_PROFITABILITY"
      ? `${profitabilityResultText} Bu karar desteği teklif veya sözleşmeyi değiştirmez.`
    : request.questionIntent === "ACTUAL_VS_ESTIMATE"
      ? actualVsEstimateResultText
    : request.continuationType === "YAPTIM"
      ? "Tamam; aynı kanonik maliyet bağlamını koruyorum. Sonraki adım, sonucu veya değişen varsayımı birlikte kontrol etmek."
    : request.continuationType === "BULAMADIM"
      ? "Sorun değil; kaydı veya maliyet kalemini bulamadıysan mevcut kanıtı değiştirmeden eksik veriyi işaretliyorum. Önce aynı finans ekranındaki kanonik planı doğrula."
    : request.continuationType === "GERI"
      ? "Önceki finansal açıklama adımına dönüyorum; seçili müşteri, sözleşme ve vardiya bağlamını koruyorum. Bu salt-okunur geri dönüşte kayıt veya maliyet değiştirmiyorum."
    : request.continuationType === "DEVAM_ET"
      ? "Devam ediyorum: önce kanonik mevcut plan, sonra karşılaştırılabilir maliyet ve en son risk/eksik veri sırasını koruyorum."
    : request.questionIntent === "RISK_SUMMARY"
      ? riskText(scenarioPreview)
    : hasScenarioInput && scenarioPreview?.status === "READY"
    ? `${costLevelText(completeness, scenarioPreview)} ${scenarioPreview.costDeltaMinor < 0
      ? `Alternatif senaryo mevcut plana göre tahmini maliyeti azaltıyor: ${formatMoneyMinor(Math.abs(scenarioPreview.costDeltaMinor), scenarioPreview.currencyCode)}.`
      : scenarioPreview.costDeltaMinor > 0
        ? `Alternatif senaryo mevcut plana göre tahmini maliyeti artırıyor: ${formatMoneyMinor(scenarioPreview.costDeltaMinor, scenarioPreview.currencyCode)}.`
        : "Alternatif senaryo mevcut planla aynı tahmini maliyeti gösteriyor."}`
    : scenarioPreview?.status === "INCOMPLETE"
      ? "Kanonik mevcut plan okundu; karşılaştırma için eksik veri var."
      : `${costLevelText(completeness, scenarioPreview)} Kanonik mevcut plan ve finans bağlamı okundu; bu sonuç salt okunur önizlemedir.`);
  const resultText = [commercialReferenceText, forecastPlanningShareText, resultTextBase].filter(Boolean).join(" ");
  const reasonText = [
    companyPriceBudgetResponse?.reasonText || "",
    roomDecisionExplanation?.reasonText || "",
    fuelAnswer?.reasonText || "",
    independentPlanningMode
      ? "Bu yeni rota hesabında geçmiş anlaşma ve eski gerçekleşmiş gider kullanılmadı; yalnız seçilen rota, dönem ve açık planlama varsayımları değerlendirildi."
      : currentPlan,
    independentPlanningMode
      ? "Eski rota yalnız bağlam doğrulaması için okunmuş olabilir; yeni fiyat hesabına kopyalanmadı."
      : changed.length ? `Nedensel fark #4 modelindeki şu değişkenlerden geliyor: ${changed.join(", ")}.` : "Değişen senaryo girdisi yok; mevcut plan karşılaştırma tabanı olarak tutuldu.",
    request.questionIntent === "VEHICLE_RECOMMENDATION" && vehicleRecommendation?.reason ? vehicleRecommendation.reason : "",
    request.questionIntent === "VEHICLE_RECOMMENDATION" && vehicleFleetAvailability ? vehicleFleetAvailability : "",
    request.questionIntent === "VEHICLE_RECOMMENDATION" && capacityVehiclePlan && !vehicleRecommendation ? "Kapasite hesabı kanonik araç kapasitesi ve kişi sayısından türetildi; maliyet önceliği için yeterli yakıt kanıtı yok." : "",
    routeRanking?.status === "READY" ? routeRanking.reason : routeRanking?.reason || "",
    scenarioPreview?.periodScope?.status !== "COMPLETE" ? scenarioPreview.periodScope.reason : "",
    scenarioPreview?.incrementalCost?.reason || "",
    contractProfitability.status === "READY" && request.questionIntent === "CONTRACT_PROFITABILITY" ? `${contractProfitability.sourceLabel} ve kanonik #1 finans çıktısı kullanıldı.` : "",
    fuelIncrease.percent !== null ? (fuelIncrease.applied ? `Yakıt varsayımı #2 referansına göre %${formatNumber(fuelIncrease.percent)} artırıldı.` : `Yakıt için %${formatNumber(fuelIncrease.percent)} varsayımı verildi; baz yakıt fiyatı bulunamadığı için uygulanmadı.`) : "",
  ].filter(Boolean).join(" ");
  const recommendation = companyPriceBudgetResponse?.recommendation
    || (roomDecisionExplanation?.handled
    ? roomDecisionExplanation.recommendation
    : fuelAnswer
    ? fuelAnswer.recommendation
    : request.questionIntent === "VEHICLE_RECOMMENDATION" && vehicleRecommendation
    ? vehicleRecommendation.reason
    : request.questionIntent === "VEHICLE_RECOMMENDATION" && capacityVehiclePlan
      ? "Kapasite planını operasyon yetkilisiyle doğrula; maliyet açısından kesin en iyi seçim iddiası kurmuyorum."
    : request.questionIntent === "MULTI_ROUTE_RANKING" && routeRanking?.status === "READY"
      ? `Önce ${routeRanking.best.label} için yetkili operasyon doğrulaması yap; bu sonuç canlı rota veya atama değişikliği uygulamaz.`
      : request.questionIntent === "CONTRACT_PROFITABILITY" && contractProfitability.status === "READY"
        ? "Sözleşme kararından önce bu read-only farkı yetkili kullanıcıyla doğrula; teklif, sözleşme veya ödeme değişikliği uygulanmaz."
        : request.family === "WHAT_IF_SCENARIO" && !hasScenarioInput
    ? "Hangi parametreyi değiştirmek istediğini açıkça yaz; karşılaştırmayı aynı #4 senaryo motoruyla önizleyeyim."
    : roleKey === "ROOM"
      ? "Teklif kararından önce kanonik maliyet tabanını, teklif tabanını ve eksik veriyi yetkili kullanıcıyla doğrula."
      : "Bütçe veya plan kararından önce kanonik maliyet etkisini ve eksik veriyi yetkili kullanıcıyla doğrula.");
  const confidenceSource = scenarioPreview?.confidence || canonicalFinancial?.financePreview?.confidence || baseline?.baselineConfidence || {};
  const confidenceText = `${confidenceLabel(confidenceSource.level, confidenceSource.score)}${confidenceSource.reason ? ` — ${confidenceSource.reason}.` : "."}`;
  const layerLines = (finalReference?.layers || []).map(layerLabel);
  const evidenceText = [
    `${effectiveScope === "ROOM" ? "#1 Oda kârlılığı ve teklif tabanı" : "#1 Şirket bütçe ve servis maliyeti"} kanonik sahibi kullanıldı.`,
    `#2 üç katmanlı referans ayrımı korundu: ${layerLines.join(" ")}`,
    "#4 senaryo sahibi mevcut plan referansıyla salt okunur önizleme üretti.",
    vehicleAlternatives ? `#4 araç planı adayları: ${(vehicleAlternatives.items || []).length} sınıf; öneri yalnız kapasite ve mevcut maliyet kanıtına göre verilir.` : "",
    routeRanking?.status === "READY" ? `#4 çoklu rota karşılaştırması: ${routeRanking.items.length} kanonik rota sıralandı.` : routeRanking?.reason || "",
    canonicalFinancial.commercialContext?.type === "AGREEMENT" ? `Gerçek sözleşme bağlamı: Sözleşme #${canonicalFinancial.commercialContext.id}.` : "Gerçek sözleşme bağlamı bulunmadı; sözleşme kârlılığı kesinleştirilmedi.",
    commercialReferenceText,
    companyPriceBudgetKind ? `COMPANY fiyat/bütçe danışmanlığı: ${companyPriceBudgetKind}; geçmiş karşılaştırması yalnız aynı kapsam kanıtıyla değerlendirilir.` : "",
  ].join(" ");
  const canonicalCurrentCostMinor = actualCanonicalCostMinor ?? planningCanonicalCostMinor;
  const canonicalCurrentCostLabel = actualCanonicalCostMinor !== null
    ? "Güncel doğrulanmış brüt gerçekleşen maliyet"
    : "Güncel kanonik planlama maliyeti";
  const financialEffect = materialFinancialEffect({
    scope: effectiveScope,
    financePreview: canonicalFinancial.financePreview,
    scenarioPreview,
    canonicalCurrentCostMinor,
    canonicalCurrentCostLabel,
    forecastPlanningText: forecastPlanningShareText,
  });
  const sections = [
    answerSection("SONUÇ", resultText, "Varsayımlar değişirse bu bölüm aynı kanonik preview üzerinden güncellenir."),
    answerSection("NEDEN", reasonText, "Sayısal ve nedensel iddialar kanonik sahiplerin çıktılarıyla sınırlıdır."),
    answerSection("KANIT", evidenceText, "Dış referans, platform gözlemi ve tenant içi gerçek veri birbirine karıştırılmaz.", layerLines),
    answerSection("FİNANSAL ETKİ", financialEffect, "Para alanları yalnızca kanonik finans/senaryo çıktısı varsa gösterilir."),
    answerSection("OPERASYON ETKİSİ", operationalEffect({ baseline, scenarioPreview }), "Birimler açıkça belirtilir: araç, kişi, durak, km, dk, gün."),
    answerSection("RİSK", riskText(scenarioPreview), "Bu ekran karar desteğidir; otomatik uygulama yapmaz."),
    answerSection("ÖNERİ", recommendation, "Öneri bağlayıcı değildir; kullanıcı onayı gerekir."),
    answerSection("EKSİK VERİ", missing.length ? missing.join(" • ") : "Kritik eksik veri görünmüyor.", "Eksik değer uydurulmaz."),
    answerSection("GÜVEN SEVİYESİ", confidenceText, "Güven, kanonik veri kapsamı ve tazeliğinden türetilir."),
  ];
  const shortReply = `Sonuç: ${resultText} Neden: ${reasonText} Öneri: ${recommendation}`;
  const roleLabel = visibleRoleLabel(roleKey);
  const generatedAt = new Date().toISOString();
  const costReasoning = {
    version: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    family: request.family,
    intent: request.intent,
    questionIntent: request.questionIntent,
    continuationType: request.continuationType,
    costLevel: completeness.costLevel,
    role: roleKey,
    roleLabel,
    scope: effectiveScope,
    screen: { path: screenPath || null, label: screenContext?.label || baseResponse?.screenLabel || null },
    context: {
      selectedRecord: resolvedEntityType !== "screen" ? { type: resolvedEntityType, id: Number(resolvedEntityId) || null } : null,
      baselinePlan: baseline?.source?.label || null,
      baselineReference: baseline?.baselineReference || null,
      companyKind: ["SCHOOL", "ORGANIZATION"].includes(roleKey) ? roleKey : null,
      planningOnly: ["SCHOOL", "ORGANIZATION"].includes(roleKey),
      normalBudgetLifecycle: roleKey === "COMPANY",
      commercialContext: canonicalFinancial.commercialContext || null,
    },
    canonicalOwners: {
      canonical1: {
        owner: effectiveScope === "ROOM" ? "ROOM_PROFITABILITY_AND_QUOTE_FLOOR" : "COMPANY_BUDGET_AND_SERVICE_COST",
        modelVersion: canonicalFinancial.financePreview?.modelVersion || null,
        evidence: canonicalFinancial.financePreview?.evidence || [],
      },
      companyPriceBudgetAdvisory: companyPriceBudgetKind
        ? canonicalFinancial.companyPriceBudgetAdvisory || null
        : null,
      canonical2: {
        owner: "EXTERNAL_COST_REFERENCE_LAYERS",
        layers: finalReference?.layers || [],
        pricingGuidance: finalReference?.pricingGuidance || null,
      },
      canonical4: {
        owner: "COST_SCENARIO_FORECAST",
        modelVersion: scenarioPreview?.modelVersion || null,
        scenarioId: scenarioPreview?.scenarioId || null,
        previewStatus: scenarioPreview?.status || null,
        partialCost: scenarioPreview?.scenario?.costMinor != null && scenarioPreview?.costCoverage?.scenario?.status === "PARTIAL",
        periodScope: scenarioPreview?.periodScope || null,
        incrementalCost: scenarioPreview?.incrementalCost || null,
        dimensions: scenarioPreview?.dimensions || {},
        changedDimensions: scenarioPreview?.changedDimensions || [],
        vehiclePlanAlternatives: vehicleAlternatives,
        evidence: scenarioPreview?.evidence || [],
      },
      fuelAnswer: fuelAnswer?.evidence || null,
      roomDecisionExplanation: roomDecisionExplanation || null,
      costCompleteness: completeness,
      routeRanking,
      commercialProfitability,
      contractProfitability,
      commercialEvidence: roomCommercialEvidence,
      quoteFloorCalculationBreakdown: quoteFloorCalculationBreakdown || null,
      fuelIncrease: { percent: fuelIncrease.percent, applied: fuelIncrease.applied },
    },
    evidence: {
      baselineReference: baseline?.baselineReference || null,
      baselineSource: baseline?.source?.label || null,
      baselineConfidence: baseline?.baselineConfidence || null,
      financialModelVersion: canonicalFinancial.financePreview?.modelVersion || null,
      scenarioModelVersion: scenarioPreview?.modelVersion || null,
      referenceLayers: finalReference?.layers || [],
      missingData: missing,
      causalBasis: changed,
      routeRankingStatus: routeRanking?.status || null,
      commercialContext: canonicalFinancial.commercialContext || null,
      commercialEvidence: roomCommercialEvidence,
      companyPriceBudgetAdvisory: companyPriceBudgetKind ? canonicalFinancial.companyPriceBudgetAdvisory || null : null,
      vehicleRecommendation: vehicleRecommendation || null,
      costLevel: completeness.costLevel,
      includedComponents: completeness.includedComponents,
      missingComponents: completeness.missingComponents,
      provenance: completeness.provenance,
      quoteFloorCalculationBreakdown: quoteFloorCalculationBreakdown || null,
    },
    answer: {
      sections,
      concise: shortReply,
      expandedOnDemand: true,
    },
    recommendation: { text: recommendation, requiresUserApproval: true, writeAction: false },
    clarificationRequired: false,
    readOnly: true,
    writeAction: false,
    liveMutation: false,
    isFollowUp: request.isFollowUp,
    generatedAt,
  };
  const financialNavigationAction = financialSurfaceNavigationAction({
    role: roleKey,
    message,
    screenPath,
    financeView: screenContext?.structuredFacts?.financeView || screenContext?.structuredFacts?.activeTab || "",
    focusVehicleId: screenContext?.structuredFacts?.selectedVehicleId,
    focusShiftId: screenContext?.structuredFacts?.selectedShiftId,
    focusAgreementId: screenContext?.structuredFacts?.selectedAgreementId,
  });
  const quickActions = [
    roomDecisionExplanation?.quickAction || null,
    financialNavigationAction || null,
  ].filter(Boolean).filter((action, index, actions) => actions.findIndex((item) => item.path === action.path) === index);
  const nextCostAnalysisState = {
    lastIntentFamily: request.family,
    lastIntent: request.intent,
    lastQuestionIntent: request.questionIntent,
    lastMetricIdentity: request.metricIdentity,
    lastContinuationType: request.continuationType,
    lastScreenPath: screenPath,
    lastBaselineReference: baseline?.baselineReference || null,
    lastScope: effectiveScope,
    lastAnswer: shortReply,
    lastRouteRankingStatus: routeRanking?.status || null,
    lastCommercialContextType: canonicalFinancial.commercialContext?.type || "NONE",
    lastIndependentScenarioOverrides: independentRouteQuoteAdvice ? { ...scenarioOverrides } : null,
    lastGeneratedAt: generatedAt,
  };
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    generatedAt,
    reply: shortReply,
    summary: resultText,
    questionType: "COST_REASONING",
    questionLabel: "Maliyet analizi",
    costLevel: completeness.costLevel,
    includedComponents: completeness.includedComponents,
    missingComponents: completeness.missingComponents,
    costProvenance: completeness.provenance,
    costConfidence: completeness.confidence,
    intentConfidence: request.confidence,
    costQuestionIntent: request.questionIntent,
    intentSignals: request.matchedSignals,
    responseSections: sections,
    quickActions,
    followUpPrompt: "Aynı bağlamda devam etmek için maliyet, senaryo veya eksik veri sorusunu yazabilirsin.",
    evidenceConfidence: confidenceText,
    roleBoundary: "Bu yanıt yalnızca yetkili kapsamındaki kanonik veriyi okur; kayıt, teklif, rota veya bütçe değiştirmez.",
    costReasoning,
    costAnalysisState: nextCostAnalysisState,
    conversationState: {
      ...(conversationState && typeof conversationState === "object" ? conversationState : {}),
      costAnalysisState: nextCostAnalysisState,
      lastScreenPath: screenPath,
      lastScreenLabel: screenContext?.label || null,
    },
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}

export function isFinanceReconciliationQuestion(message = "") {
  return /(?:hakediş|hakedis|fatura|mutabakat|reconciliation|ödeme|odeme|tahsilat|alacak|alacağ|alacag|borç|borc|inceleme)/iu.test(String(message || ""));
}
